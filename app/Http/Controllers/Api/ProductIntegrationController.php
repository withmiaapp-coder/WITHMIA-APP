<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Product;
use App\Models\ProductIntegration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProductIntegrationController extends Controller
{
    private function getCompany(Request $request): ?Company
    {
        $user = $request->user();
        if (!$user) {
            $authToken = $request->input('auth_token') ?? $request->header('X-Railway-Auth');
            if ($authToken) {
                $user = \App\Models\User::where('remember_token', $authToken)->first();
            }
        }
        return $user?->company;
    }

    // =============================================
    // STATUS
    // =============================================

    /**
     * Get all product integration statuses
     */
    public function status(Request $request)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $integrations = ProductIntegration::where('company_id', $company->id)->get();

        $result = [];
        foreach (['woocommerce', 'shopify', 'mercadolibre', 'custom_api'] as $provider) {
            $integration = $integrations->firstWhere('provider', $provider);
            $productCount = Product::where('company_id', $company->id)->where('provider', $provider)->count();

            $result[$provider] = [
                'connected' => $integration?->is_connected ?? false,
                'bot_access_enabled' => $integration?->bot_access_enabled ?? false,
                'products_count' => $productCount,
                'last_sync_at' => $integration?->last_sync_at?->toISOString(),
                'store_url' => $integration?->store_url,
            ];
        }

        // Manual products count
        $result['manual'] = [
            'connected' => true,
            'products_count' => Product::where('company_id', $company->id)->where('provider', 'manual')->count(),
        ];

        // Total
        $result['total_products'] = Product::where('company_id', $company->id)->count();

        return response()->json([
            'success' => true,
            'integrations' => $result,
        ]);
    }

    // =============================================
    // CONNECT / DISCONNECT
    // =============================================

    /**
     * Connect a product provider
     */
    public function connect(Request $request)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $provider = $request->input('provider');

        $rules = match ($provider) {
            'woocommerce' => [
                'store_url' => 'required|url',
                'consumer_key' => 'required|string',
                'consumer_secret' => 'required|string',
            ],
            'shopify' => [
                'store_url' => 'required|string',
                'access_token' => 'required|string',
            ],
            'mercadolibre' => [
                'access_token' => 'required|string',
                'user_id' => 'required|string',
            ],
            'custom_api' => [
                'api_url' => 'required|url',
                'api_key' => 'nullable|string',
            ],
            default => null,
        };

        if (!$rules) {
            return response()->json(['error' => 'Proveedor no válido'], 400);
        }

        $validated = $request->validate(array_merge(['provider' => 'required|string'], $rules));

        // Test connection before saving
        try {
            $testResult = $this->testConnection($provider, $validated);
            if (!$testResult['success']) {
                return response()->json([
                    'success' => false,
                    'error' => $testResult['error'] ?? 'No se pudo conectar. Verifica tus credenciales.',
                ], 400);
            }
        } catch (\Exception $e) {
            Log::error("Product integration test failed: {$provider}", ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Error de conexión: ' . $e->getMessage(),
            ], 400);
        }

        // Save integration
        $data = [
            'is_connected' => true,
            'is_active' => true,
            'bot_access_enabled' => true,
        ];

        switch ($provider) {
            case 'woocommerce':
                $data['store_url'] = rtrim($validated['store_url'], '/');
                $data['api_key'] = $validated['consumer_key'];
                $data['api_secret'] = $validated['consumer_secret'];
                break;
            case 'shopify':
                $shopUrl = $validated['store_url'];
                if (!str_contains($shopUrl, '.myshopify.com')) {
                    $shopUrl = "https://{$shopUrl}.myshopify.com";
                }
                if (!str_starts_with($shopUrl, 'http')) {
                    $shopUrl = "https://{$shopUrl}";
                }
                $data['store_url'] = rtrim($shopUrl, '/');
                $data['access_token'] = $validated['access_token'];
                break;
            case 'mercadolibre':
                $data['access_token'] = $validated['access_token'];
                $data['settings'] = ['user_id' => $validated['user_id']];
                break;
            case 'custom_api':
                $data['store_url'] = $validated['api_url'];
                $data['api_key'] = $validated['api_key'] ?? null;
                break;
        }

        $integration = ProductIntegration::updateOrCreate(
            ['company_id' => $company->id, 'provider' => $provider],
            $data
        );

        return response()->json([
            'success' => true,
            'integration' => $integration->makeVisible(['store_url']),
            'message' => "Conectado a " . $this->getProviderName($provider),
        ]);
    }

    /**
     * Disconnect a product provider
     */
    public function disconnect(Request $request)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $provider = $request->input('provider');

        $integration = ProductIntegration::where('company_id', $company->id)
            ->where('provider', $provider)
            ->first();

        if ($integration) {
            $integration->update([
                'is_connected' => false,
                'api_key' => null,
                'api_secret' => null,
                'access_token' => null,
                'refresh_token' => null,
            ]);
        }

        // Optionally delete synced products
        if ($request->boolean('delete_products', false)) {
            Product::where('company_id', $company->id)->where('provider', $provider)->delete();
        }

        return response()->json([
            'success' => true,
            'message' => "Desconectado de " . $this->getProviderName($provider),
        ]);
    }

    /**
     * Toggle bot access for a provider
     */
    public function toggleBotAccess(Request $request)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $provider = $request->input('provider');

        $integration = ProductIntegration::where('company_id', $company->id)
            ->where('provider', $provider)
            ->first();

        if (!$integration) {
            return response()->json(['error' => 'Integración no encontrada'], 404);
        }

        $integration->update([
            'bot_access_enabled' => !$integration->bot_access_enabled,
        ]);

        return response()->json([
            'success' => true,
            'bot_access_enabled' => $integration->bot_access_enabled,
        ]);
    }

    // =============================================
    // SYNC
    // =============================================

    /**
     * Sync products from a provider
     */
    public function sync(Request $request)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $provider = $request->input('provider');

        $integration = ProductIntegration::where('company_id', $company->id)
            ->where('provider', $provider)
            ->where('is_connected', true)
            ->first();

        if (!$integration) {
            return response()->json(['error' => 'Integración no conectada'], 400);
        }

        try {
            $result = match ($provider) {
                'woocommerce' => $this->syncWooCommerce($company, $integration),
                'shopify' => $this->syncShopify($company, $integration),
                'mercadolibre' => $this->syncMercadoLibre($company, $integration),
                'custom_api' => $this->syncCustomApi($company, $integration),
                default => throw new \Exception('Proveedor no soportado'),
            };

            $integration->update([
                'last_sync_at' => now(),
                'products_count' => $result['count'] ?? 0,
            ]);

            return response()->json([
                'success' => true,
                'synced' => $result['count'] ?? 0,
                'created' => $result['created'] ?? 0,
                'updated' => $result['updated'] ?? 0,
                'message' => "Sincronizados {$result['count']} productos desde " . $this->getProviderName($provider),
            ]);
        } catch (\Exception $e) {
            Log::error("Product sync failed: {$provider}", [
                'company_id' => $company->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al sincronizar: ' . $e->getMessage(),
            ], 500);
        }
    }

    // =============================================
    // SYNC IMPLEMENTATIONS
    // =============================================

    private function syncWooCommerce(Company $company, ProductIntegration $integration): array
    {
        $baseUrl = rtrim($integration->store_url, '/') . '/wp-json/wc/v3';
        $page = 1;
        $perPage = 100;
        $created = 0;
        $updated = 0;
        $allExternalIds = [];

        do {
            $response = Http::withBasicAuth($integration->api_key, $integration->api_secret)
                ->timeout(30)
                ->get("{$baseUrl}/products", [
                    'page' => $page,
                    'per_page' => $perPage,
                    'status' => 'publish',
                ]);

            if (!$response->successful()) {
                throw new \Exception("WooCommerce API error: {$response->status()}");
            }

            $products = $response->json();
            if (empty($products)) break;

            foreach ($products as $wooProduct) {
                $allExternalIds[] = (string) $wooProduct['id'];

                $images = [];
                foreach ($wooProduct['images'] ?? [] as $img) {
                    $images[] = $img['src'] ?? null;
                }
                $images = array_filter($images);

                $attributes = [];
                foreach ($wooProduct['attributes'] ?? [] as $attr) {
                    $attributes[$attr['name']] = implode(', ', $attr['options'] ?? []);
                }

                $variants = [];
                foreach ($wooProduct['variations'] ?? [] as $var) {
                    $variants[] = [
                        'id' => $var,
                    ];
                }

                $existing = Product::where('company_id', $company->id)
                    ->where('provider', 'woocommerce')
                    ->where('external_id', (string) $wooProduct['id'])
                    ->first();

                $data = [
                    'company_id' => $company->id,
                    'provider' => 'woocommerce',
                    'external_id' => (string) $wooProduct['id'],
                    'name' => $wooProduct['name'] ?? 'Sin nombre',
                    'description' => strip_tags($wooProduct['description'] ?? $wooProduct['short_description'] ?? ''),
                    'price' => $wooProduct['price'] ?: null,
                    'compare_at_price' => $wooProduct['regular_price'] != $wooProduct['price'] ? $wooProduct['regular_price'] : null,
                    'currency' => 'CLP',
                    'sku' => $wooProduct['sku'] ?: null,
                    'stock_quantity' => $wooProduct['stock_quantity'],
                    'stock_status' => $wooProduct['stock_status'] ?? 'in_stock',
                    'category' => !empty($wooProduct['categories']) ? $wooProduct['categories'][0]['name'] : null,
                    'images' => $images,
                    'attributes' => !empty($attributes) ? $attributes : null,
                    'url' => $wooProduct['permalink'] ?? null,
                    'weight' => $wooProduct['weight'] ? (float) $wooProduct['weight'] : null,
                    'is_active' => $wooProduct['status'] === 'publish',
                    'synced_at' => now(),
                ];

                if ($existing) {
                    $existing->update($data);
                    $updated++;
                } else {
                    Product::create($data);
                    $created++;
                }
            }

            $page++;
        } while (count($products) === $perPage);

        // Remove products that no longer exist in WooCommerce
        Product::where('company_id', $company->id)
            ->where('provider', 'woocommerce')
            ->whereNotIn('external_id', $allExternalIds)
            ->delete();

        return ['count' => count($allExternalIds), 'created' => $created, 'updated' => $updated];
    }

    private function syncShopify(Company $company, ProductIntegration $integration): array
    {
        $baseUrl = rtrim($integration->store_url, '/') . '/admin/api/2024-01';
        $created = 0;
        $updated = 0;
        $allExternalIds = [];
        $pageInfo = null;

        do {
            $params = ['limit' => 250];
            if ($pageInfo) {
                $params['page_info'] = $pageInfo;
            }

            $response = Http::withHeaders([
                'X-Shopify-Access-Token' => $integration->access_token,
            ])->timeout(30)->get("{$baseUrl}/products.json", $params);

            if (!$response->successful()) {
                throw new \Exception("Shopify API error: {$response->status()}");
            }

            $data = $response->json();
            $products = $data['products'] ?? [];

            foreach ($products as $shopProduct) {
                $allExternalIds[] = (string) $shopProduct['id'];

                $images = [];
                foreach ($shopProduct['images'] ?? [] as $img) {
                    $images[] = $img['src'] ?? null;
                }
                $images = array_filter($images);

                $variants = [];
                foreach ($shopProduct['variants'] ?? [] as $var) {
                    $variants[] = [
                        'id' => (string) $var['id'],
                        'title' => $var['title'] ?? '',
                        'price' => $var['price'] ?? null,
                        'sku' => $var['sku'] ?? null,
                        'inventory_quantity' => $var['inventory_quantity'] ?? null,
                    ];
                }

                $firstVariant = $shopProduct['variants'][0] ?? [];

                $existing = Product::where('company_id', $company->id)
                    ->where('provider', 'shopify')
                    ->where('external_id', (string) $shopProduct['id'])
                    ->first();

                $productData = [
                    'company_id' => $company->id,
                    'provider' => 'shopify',
                    'external_id' => (string) $shopProduct['id'],
                    'name' => $shopProduct['title'] ?? 'Sin nombre',
                    'description' => strip_tags($shopProduct['body_html'] ?? ''),
                    'price' => $firstVariant['price'] ?? null,
                    'compare_at_price' => $firstVariant['compare_at_price'] ?? null,
                    'currency' => 'CLP',
                    'sku' => $firstVariant['sku'] ?? null,
                    'stock_quantity' => $firstVariant['inventory_quantity'] ?? null,
                    'stock_status' => ($firstVariant['inventory_quantity'] ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
                    'category' => $shopProduct['product_type'] ?: null,
                    'images' => $images,
                    'attributes' => null,
                    'variants' => !empty($variants) ? $variants : null,
                    'url' => $integration->store_url . '/products/' . $shopProduct['handle'],
                    'brand' => $shopProduct['vendor'] ?: null,
                    'weight' => $firstVariant['weight'] ? (float) $firstVariant['weight'] : null,
                    'is_active' => $shopProduct['status'] === 'active',
                    'synced_at' => now(),
                ];

                if ($existing) {
                    $existing->update($productData);
                    $updated++;
                } else {
                    Product::create($productData);
                    $created++;
                }
            }

            // Pagination via Link header
            $linkHeader = $response->header('Link');
            $pageInfo = null;
            if ($linkHeader && preg_match('/page_info=([^>&]+).*?rel="next"/', $linkHeader, $matches)) {
                $pageInfo = $matches[1];
            }

        } while ($pageInfo);

        Product::where('company_id', $company->id)
            ->where('provider', 'shopify')
            ->whereNotIn('external_id', $allExternalIds)
            ->delete();

        return ['count' => count($allExternalIds), 'created' => $created, 'updated' => $updated];
    }

    private function syncMercadoLibre(Company $company, ProductIntegration $integration): array
    {
        $userId = $integration->settings['user_id'] ?? null;
        if (!$userId) {
            throw new \Exception('User ID de MercadoLibre no configurado');
        }

        $accessToken = $integration->access_token;
        $created = 0;
        $updated = 0;
        $allExternalIds = [];
        $offset = 0;
        $limit = 50;

        do {
            $response = Http::withToken($accessToken)
                ->timeout(30)
                ->get("https://api.mercadolibre.com/users/{$userId}/items/search", [
                    'offset' => $offset,
                    'limit' => $limit,
                    'status' => 'active',
                ]);

            if (!$response->successful()) {
                throw new \Exception("MercadoLibre API error: {$response->status()}");
            }

            $data = $response->json();
            $itemIds = $data['results'] ?? [];
            $total = $data['paging']['total'] ?? 0;

            if (empty($itemIds)) break;

            // Fetch items in batch (max 20)
            $chunks = array_chunk($itemIds, 20);
            foreach ($chunks as $chunk) {
                $idsStr = implode(',', $chunk);
                $itemsResponse = Http::withToken($accessToken)
                    ->timeout(30)
                    ->get("https://api.mercadolibre.com/items", [
                        'ids' => $idsStr,
                    ]);

                if (!$itemsResponse->successful()) continue;

                $items = $itemsResponse->json();
                foreach ($items as $wrapper) {
                    $item = $wrapper['body'] ?? $wrapper;
                    if (empty($item['id'])) continue;

                    $allExternalIds[] = $item['id'];

                    $images = [];
                    foreach ($item['pictures'] ?? [] as $pic) {
                        $images[] = $pic['secure_url'] ?? $pic['url'] ?? null;
                    }
                    $images = array_filter($images);

                    $attributes = [];
                    foreach ($item['attributes'] ?? [] as $attr) {
                        if ($attr['value_name'] ?? null) {
                            $attributes[$attr['name']] = $attr['value_name'];
                        }
                    }

                    $existing = Product::where('company_id', $company->id)
                        ->where('provider', 'mercadolibre')
                        ->where('external_id', $item['id'])
                        ->first();

                    $productData = [
                        'company_id' => $company->id,
                        'provider' => 'mercadolibre',
                        'external_id' => $item['id'],
                        'name' => $item['title'] ?? 'Sin nombre',
                        'description' => null, // ML doesn't include description in item listing
                        'price' => $item['price'] ?? null,
                        'compare_at_price' => $item['original_price'] ?? null,
                        'currency' => $item['currency_id'] ?? 'CLP',
                        'sku' => $item['seller_custom_field'] ?? null,
                        'stock_quantity' => $item['available_quantity'] ?? null,
                        'stock_status' => ($item['available_quantity'] ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
                        'category' => $item['category_id'] ?? null,
                        'images' => $images,
                        'attributes' => !empty($attributes) ? $attributes : null,
                        'url' => $item['permalink'] ?? null,
                        'brand' => $attributes['Marca'] ?? null,
                        'is_active' => ($item['status'] ?? '') === 'active',
                        'synced_at' => now(),
                    ];

                    if ($existing) {
                        $existing->update($productData);
                        $updated++;
                    } else {
                        Product::create($productData);
                        $created++;
                    }
                }
            }

            $offset += $limit;
        } while ($offset < $total);

        Product::where('company_id', $company->id)
            ->where('provider', 'mercadolibre')
            ->whereNotIn('external_id', $allExternalIds)
            ->delete();

        return ['count' => count($allExternalIds), 'created' => $created, 'updated' => $updated];
    }

    private function syncCustomApi(Company $company, ProductIntegration $integration): array
    {
        $apiUrl = $integration->store_url;
        if (!$apiUrl) {
            throw new \Exception('URL de API no configurada');
        }

        $headers = [];
        if ($integration->api_key) {
            $headers['Authorization'] = 'Bearer ' . $integration->api_key;
        }

        $response = Http::withHeaders($headers)
            ->timeout(30)
            ->get($apiUrl);

        if (!$response->successful()) {
            throw new \Exception("API personalizada devolvió error: {$response->status()}");
        }

        $data = $response->json();

        // Support both {products: [...]} and direct array
        $products = $data['products'] ?? $data['data'] ?? $data['items'] ?? (is_array($data) && isset($data[0]) ? $data : []);

        if (empty($products)) {
            return ['count' => 0, 'created' => 0, 'updated' => 0];
        }

        $created = 0;
        $updated = 0;
        $allExternalIds = [];

        foreach ($products as $idx => $item) {
            $externalId = (string) ($item['id'] ?? $item['product_id'] ?? $item['sku'] ?? "custom-{$idx}");
            $allExternalIds[] = $externalId;

            $images = [];
            if (isset($item['images']) && is_array($item['images'])) {
                $images = $item['images'];
            } elseif (isset($item['image'])) {
                $images = [$item['image']];
            } elseif (isset($item['image_url'])) {
                $images = [$item['image_url']];
            }

            $existing = Product::where('company_id', $company->id)
                ->where('provider', 'custom_api')
                ->where('external_id', $externalId)
                ->first();

            $productData = [
                'company_id' => $company->id,
                'provider' => 'custom_api',
                'external_id' => $externalId,
                'name' => $item['name'] ?? $item['title'] ?? $item['nombre'] ?? 'Sin nombre',
                'description' => $item['description'] ?? $item['descripcion'] ?? null,
                'price' => $item['price'] ?? $item['precio'] ?? null,
                'compare_at_price' => $item['compare_at_price'] ?? $item['precio_anterior'] ?? null,
                'currency' => $item['currency'] ?? $item['moneda'] ?? 'CLP',
                'sku' => $item['sku'] ?? null,
                'stock_quantity' => $item['stock'] ?? $item['stock_quantity'] ?? $item['cantidad'] ?? null,
                'stock_status' => ($item['stock'] ?? $item['stock_quantity'] ?? $item['cantidad'] ?? 1) > 0 ? 'in_stock' : 'out_of_stock',
                'category' => $item['category'] ?? $item['categoria'] ?? null,
                'images' => $images,
                'attributes' => $item['attributes'] ?? $item['atributos'] ?? null,
                'url' => $item['url'] ?? $item['link'] ?? null,
                'brand' => $item['brand'] ?? $item['marca'] ?? null,
                'weight' => $item['weight'] ?? $item['peso'] ?? null,
                'is_active' => $item['active'] ?? $item['activo'] ?? true,
                'synced_at' => now(),
            ];

            if ($existing) {
                $existing->update($productData);
                $updated++;
            } else {
                Product::create($productData);
                $created++;
            }
        }

        Product::where('company_id', $company->id)
            ->where('provider', 'custom_api')
            ->whereNotIn('external_id', $allExternalIds)
            ->delete();

        return ['count' => count($allExternalIds), 'created' => $created, 'updated' => $updated];
    }

    // =============================================
    // HELPERS
    // =============================================

    private function testConnection(string $provider, array $data): array
    {
        switch ($provider) {
            case 'woocommerce':
                $url = rtrim($data['store_url'], '/') . '/wp-json/wc/v3/products?per_page=1';
                $response = Http::withBasicAuth($data['consumer_key'], $data['consumer_secret'])
                    ->timeout(15)
                    ->get($url);
                return ['success' => $response->successful()];

            case 'shopify':
                $shopUrl = $data['store_url'];
                if (!str_contains($shopUrl, '.myshopify.com')) {
                    $shopUrl = "https://{$shopUrl}.myshopify.com";
                }
                if (!str_starts_with($shopUrl, 'http')) {
                    $shopUrl = "https://{$shopUrl}";
                }
                $url = rtrim($shopUrl, '/') . '/admin/api/2024-01/products/count.json';
                $response = Http::withHeaders([
                    'X-Shopify-Access-Token' => $data['access_token'],
                ])->timeout(15)->get($url);
                return ['success' => $response->successful()];

            case 'mercadolibre':
                $response = Http::withToken($data['access_token'])
                    ->timeout(15)
                    ->get("https://api.mercadolibre.com/users/{$data['user_id']}");
                return ['success' => $response->successful()];

            case 'custom_api':
                $headers = [];
                if (!empty($data['api_key'])) {
                    $headers['Authorization'] = 'Bearer ' . $data['api_key'];
                }
                $response = Http::withHeaders($headers)
                    ->timeout(15)
                    ->get($data['api_url']);
                return ['success' => $response->successful()];

            default:
                return ['success' => false, 'error' => 'Proveedor desconocido'];
        }
    }

    private function getProviderName(string $provider): string
    {
        return match ($provider) {
            'woocommerce' => 'WooCommerce',
            'shopify' => 'Shopify',
            'mercadolibre' => 'MercadoLibre',
            'custom_api' => 'API Personalizada',
            default => $provider,
        };
    }
}
