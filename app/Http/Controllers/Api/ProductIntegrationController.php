<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Product;
use App\Models\ProductIntegration;
use App\Traits\HasCompanyAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class ProductIntegrationController extends Controller
{
    use HasCompanyAccess;

    // =============================================
    // STATUS
    // =============================================

    /**
     * Get all product integration statuses
     */
    public function status(Request $request): JsonResponse
    {
        try {
            $company = $this->getCompanyFromRequest($request);
            if (!$company) {
                return response()->json(['error' => 'No autorizado'], 401);
            }

            // If tables don't exist yet, return empty defaults
            $hasProducts = Schema::hasTable('products');
            $hasIntegrations = Schema::hasTable('product_integrations');

            $integrations = $hasIntegrations
                ? ProductIntegration::where('company_id', $company->id)->get()
                : collect();

            $result = [];
            foreach (['woocommerce', 'shopify', 'mercadolibre', 'mysql_db', 'api_rest'] as $provider) {
                $integration = $integrations->firstWhere('provider', $provider);
                $productCount = $hasProducts
                    ? Product::where('company_id', $company->id)->where('provider', $provider)->count()
                    : 0;

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
                'products_count' => $hasProducts
                    ? Product::where('company_id', $company->id)->where('provider', 'manual')->count()
                    : 0,
            ];

            // Total
            $result['total_products'] = $hasProducts
                ? Product::where('company_id', $company->id)->count()
                : 0;

            return response()->json([
                'success' => true,
                'integrations' => $result,
            ]);
        } catch (\Throwable $e) {
            Log::error('ProductIntegrationController@status error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Error al cargar integraciones: ' . $e->getMessage(),
            ], 500);
        }
    }

    // =============================================
    // CONNECT / DISCONNECT
    // =============================================

    /**
     * Connect a product provider
     */
    public function connect(Request $request): JsonResponse
    {
        $company = $this->getCompanyFromRequest($request);
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
            'mysql_db' => [
                'db_host' => 'required|string',
                'db_port' => 'nullable|string',
                'db_name' => 'required|string',
                'db_user' => 'required|string',
                'db_password' => 'required|string',
                'db_table' => 'required|string',
            ],
            'api_rest' => [
                'api_url' => 'required|url',
                'api_key' => 'nullable|string',
            ],
            default => null,
        };

        if (!$rules) {
            return response()->json(['error' => 'Proveedor no vÃ¡lido'], 400);
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
                'error' => 'Error de conexiÃ³n: ' . $e->getMessage(),
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
            case 'mysql_db':
                $port = $validated['db_port'] ?? '3306';
                $data['store_url'] = "mysql://{$validated['db_host']}:{$port}/{$validated['db_name']}";
                $data['api_key'] = $validated['db_password'];
                $data['settings'] = [
                    'connection_type' => 'mysql',
                    'db_host' => $validated['db_host'],
                    'db_port' => $port ?: '3306',
                    'db_name' => $validated['db_name'],
                    'db_user' => $validated['db_user'],
                    'db_table' => $validated['db_table'],
                ];
                break;
            case 'api_rest':
                $data['store_url'] = $validated['api_url'];
                $data['api_key'] = $validated['api_key'] ?? null;
                $data['settings'] = ['connection_type' => 'api'];
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
    public function disconnect(Request $request): JsonResponse
    {
        $company = $this->getCompanyFromRequest($request);
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
    public function toggleBotAccess(Request $request): JsonResponse
    {
        $company = $this->getCompanyFromRequest($request);
        if (!$company) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $provider = $request->input('provider');

        $integration = ProductIntegration::where('company_id', $company->id)
            ->where('provider', $provider)
            ->first();

        if (!$integration) {
            return response()->json(['error' => 'IntegraciÃ³n no encontrada'], 404);
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
    public function sync(Request $request): JsonResponse
    {
        $company = $this->getCompanyFromRequest($request);
        if (!$company) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $provider = $request->input('provider');

        $integration = ProductIntegration::where('company_id', $company->id)
            ->where('provider', $provider)
            ->where('is_connected', true)
            ->first();

        if (!$integration) {
            return response()->json(['error' => 'IntegraciÃ³n no conectada'], 400);
        }

        try {
            $result = match ($provider) {
                'woocommerce' => $this->syncWooCommerce($company, $integration),
                'shopify' => $this->syncShopify($company, $integration),
                'mercadolibre' => $this->syncMercadoLibre($company, $integration),
                'mysql_db' => $this->syncMysql($company, $integration),
                'api_rest' => $this->syncApiRest($company, $integration),
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

    private function syncApiRest(Company $company, ProductIntegration $integration): array
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
            throw new \Exception("API personalizada devolviÃ³ error: {$response->status()}");
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
                ->where('provider', 'api_rest')
                ->where('external_id', $externalId)
                ->first();

            $productData = [
                'company_id' => $company->id,
                'provider' => 'api_rest',
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
            ->where('provider', 'api_rest')
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

            case 'mysql_db':
                $port = $data['db_port'] ?? '3306';
                $dsn = "mysql:host={$data['db_host']};port={$port};dbname={$data['db_name']}";
                $pdo = new \PDO($dsn, $data['db_user'], $data['db_password'], [
                    \PDO::ATTR_TIMEOUT => 10,
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                ]);
                // Verify the table exists
                $stmt = $pdo->prepare('SELECT 1 FROM ' . $this->sanitizeTableName($data['db_table']) . ' LIMIT 1');
                $stmt->execute();
                return ['success' => true];

            case 'api_rest':
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
            'mysql_db' => 'Base de datos MySQL',
            'api_rest' => 'API REST',
            default => $provider,
        };
    }

    /**
     * Sanitize table name to prevent SQL injection
     */
    private function sanitizeTableName(string $table): string
    {
        return preg_replace('/[^a-zA-Z0-9_]/', '', $table);
    }

    /**
     * Sync products from a MySQL database
     */
    private function syncMysql(Company $company, ProductIntegration $integration): array
    {
        $settings = $integration->settings ?? [];
        $host = $settings['db_host'] ?? null;
        $port = $settings['db_port'] ?? '3306';
        $dbName = $settings['db_name'] ?? null;
        $dbUser = $settings['db_user'] ?? null;
        $dbPassword = $integration->api_key; // stored encrypted
        $table = $settings['db_table'] ?? null;

        if (!$host || !$dbName || !$dbUser || !$table) {
            throw new \Exception('Faltan datos de conexiÃ³n MySQL');
        }

        $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";
        $pdo = new \PDO($dsn, $dbUser, $dbPassword, [
            \PDO::ATTR_TIMEOUT => 30,
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
        ]);

        $safeTable = $this->sanitizeTableName($table);
        $stmt = $pdo->query("SELECT * FROM {$safeTable} WHERE 1=1 LIMIT 5000");
        $rows = $stmt->fetchAll();

        if (empty($rows)) {
            return ['count' => 0, 'created' => 0, 'updated' => 0];
        }

        // Get column names from first row for smart mapping
        $columns = array_keys($rows[0]);

        // Smart column detection - map common column patterns
        $colMap = $this->detectMysqlColumns($columns);

        $created = 0;
        $updated = 0;
        $allExternalIds = [];

        foreach ($rows as $idx => $row) {
            $externalId = (string) ($this->getCol($row, $colMap, 'id') ?? "mysql-{$idx}");
            $allExternalIds[] = $externalId;

            $name = $this->getCol($row, $colMap, 'name') ?? 'Sin nombre';
            $price = $this->getCol($row, $colMap, 'price');
            $description = $this->getCol($row, $colMap, 'description');
            $sku = $this->getCol($row, $colMap, 'sku');
            $stock = $this->getCol($row, $colMap, 'stock');
            $category = $this->getCol($row, $colMap, 'category');
            $image = $this->getCol($row, $colMap, 'image');
            $url = $this->getCol($row, $colMap, 'url');
            $brand = $this->getCol($row, $colMap, 'brand');
            $comparePrice = $this->getCol($row, $colMap, 'compare_price');
            $currency = $this->getCol($row, $colMap, 'currency') ?? 'CLP';
            $active = $this->getCol($row, $colMap, 'active');

            $images = [];
            if ($image) {
                // Handle comma-separated images
                if (str_contains((string) $image, ',')) {
                    $images = array_map('trim', explode(',', $image));
                } else {
                    $images = [$image];
                }
            }

            $existing = Product::where('company_id', $company->id)
                ->where('provider', 'mysql_db')
                ->where('external_id', $externalId)
                ->first();

            $productData = [
                'company_id' => $company->id,
                'provider' => 'mysql_db',
                'external_id' => $externalId,
                'name' => $name,
                'description' => $description,
                'price' => $price ? (float) $price : null,
                'compare_at_price' => $comparePrice ? (float) $comparePrice : null,
                'currency' => strtoupper($currency),
                'sku' => $sku,
                'stock_quantity' => $stock !== null ? (int) $stock : null,
                'stock_status' => ($stock === null || (int) $stock > 0) ? 'in_stock' : 'out_of_stock',
                'category' => $category,
                'images' => $images,
                'url' => $url,
                'brand' => $brand,
                'is_active' => $active !== null ? (bool) $active : true,
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
            ->where('provider', 'mysql_db')
            ->whereNotIn('external_id', $allExternalIds)
            ->delete();

        return ['count' => count($allExternalIds), 'created' => $created, 'updated' => $updated];
    }

    /**
     * Detect which MySQL columns map to product fields
     */
    private function detectMysqlColumns(array $columns): array
    {
        $map = [];
        $lower = array_map('strtolower', $columns);
        $original = array_combine($lower, $columns);

        // ID
        foreach (['id', 'product_id', 'codigo', 'code', 'idproducto', 'id_producto'] as $c) {
            if (isset($original[$c])) { $map['id'] = $original[$c]; break; }
        }

        // Name
        foreach (['name', 'nombre', 'title', 'titulo', 'product_name', 'nombre_producto', 'descripcion_corta'] as $c) {
            if (isset($original[$c])) { $map['name'] = $original[$c]; break; }
        }

        // Description
        foreach (['description', 'descripcion', 'detalle', 'detail', 'desc', 'descripcion_larga', 'product_description'] as $c) {
            if (isset($original[$c])) { $map['description'] = $original[$c]; break; }
        }

        // Price
        foreach (['price', 'precio', 'valor', 'monto', 'price_amount', 'precio_venta', 'pvp', 'unit_price'] as $c) {
            if (isset($original[$c])) { $map['price'] = $original[$c]; break; }
        }

        // Compare price
        foreach (['compare_at_price', 'precio_anterior', 'precio_original', 'old_price', 'precio_lista', 'regular_price', 'msrp'] as $c) {
            if (isset($original[$c])) { $map['compare_price'] = $original[$c]; break; }
        }

        // SKU
        foreach (['sku', 'codigo', 'code', 'ref', 'referencia', 'barcode', 'ean'] as $c) {
            if (isset($original[$c]) && !isset($map['id'])) { $map['sku'] = $original[$c]; break; }
            if (isset($original[$c]) && $c !== ($map['id'] ?? '')) { $map['sku'] = $original[$c]; break; }
        }

        // Stock
        foreach (['stock', 'stock_quantity', 'cantidad', 'qty', 'quantity', 'inventario', 'existencia', 'disponible'] as $c) {
            if (isset($original[$c])) { $map['stock'] = $original[$c]; break; }
        }

        // Category
        foreach (['category', 'categoria', 'cat', 'tipo', 'type', 'rubro', 'linea', 'family', 'familia', 'category_name'] as $c) {
            if (isset($original[$c])) { $map['category'] = $original[$c]; break; }
        }

        // Image
        foreach (['image', 'imagen', 'img', 'photo', 'foto', 'image_url', 'imagen_url', 'thumbnail', 'picture', 'images'] as $c) {
            if (isset($original[$c])) { $map['image'] = $original[$c]; break; }
        }

        // URL
        foreach (['url', 'link', 'enlace', 'permalink', 'product_url'] as $c) {
            if (isset($original[$c])) { $map['url'] = $original[$c]; break; }
        }

        // Brand
        foreach (['brand', 'marca', 'manufacturer', 'fabricante', 'brand_name'] as $c) {
            if (isset($original[$c])) { $map['brand'] = $original[$c]; break; }
        }

        // Currency
        foreach (['currency', 'moneda', 'divisa', 'currency_code'] as $c) {
            if (isset($original[$c])) { $map['currency'] = $original[$c]; break; }
        }

        // Active
        foreach (['active', 'activo', 'status', 'estado', 'enabled', 'habilitado', 'visible', 'published'] as $c) {
            if (isset($original[$c])) { $map['active'] = $original[$c]; break; }
        }

        return $map;
    }

    /**
     * Get a value from a row using the column map
     */
    private function getCol(array $row, array $colMap, string $field)
    {
        $col = $colMap[$field] ?? null;
        return $col ? ($row[$col] ?? null) : null;
    }
}
