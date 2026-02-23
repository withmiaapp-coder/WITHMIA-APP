<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Product;
use App\Models\ProductIntegration;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Unified bot endpoint for products across all providers.
 * Called by n8n workflow tools — unauthenticated, uses company_slug.
 */
class ProductHubController extends Controller
{
    /**
     * Search products for the bot.
     * GET /api/product-hub/bot/search?company_slug=xxx&query=xxx&category=xxx
     */
    public function botSearch(Request $request): JsonResponse
    {
        $companySlug = $request->input('company_slug');
        if (!$companySlug) {
            return response()->json(['error' => 'company_slug requerido'], 400);
        }

        $company = Company::where('slug', $companySlug)->first();
        if (!$company) {
            return response()->json(['error' => 'Empresa no encontrada'], 404);
        }

        // Check if any provider has bot_access_enabled
        $enabledProviders = ProductIntegration::where('company_id', $company->id)
            ->where('is_connected', true)
            ->where('bot_access_enabled', true)
            ->pluck('provider')
            ->toArray();

        // Always include manual products
        $enabledProviders[] = 'manual';

        $query = Product::where('company_id', $company->id)
            ->where('is_active', true)
            ->whereIn('provider', $enabledProviders);

        // Search by query
        $searchTerm = $request->input('query') ?? $request->input('q');
        if ($searchTerm) {
            $query->search($searchTerm);
        }

        // Filter by category
        if ($category = $request->input('category')) {
            $query->where('category', 'like', "%{$category}%");
        }

        // Filter by price range
        if ($minPrice = $request->input('min_price')) {
            $query->where('price', '>=', $minPrice);
        }
        if ($maxPrice = $request->input('max_price')) {
            $query->where('price', '<=', $maxPrice);
        }

        // Filter by stock
        if ($request->boolean('in_stock_only', false)) {
            $query->where('stock_status', 'in_stock');
        }

        $products = $query->orderBy('name')->limit(20)->get();

        // Get categories for context
        $categories = Product::where('company_id', $company->id)
            ->where('is_active', true)
            ->whereIn('provider', $enabledProviders)
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct('category')
            ->pluck('category')
            ->sort()
            ->values();

        // Total count
        $totalProducts = Product::where('company_id', $company->id)
            ->where('is_active', true)
            ->whereIn('provider', $enabledProviders)
            ->count();

        // Format products for bot consumption
        $formattedProducts = $products->map(function ($product) {
            $result = [
                'name' => $product->name,
                'description' => $product->description,
                'price' => $product->price,
                'formatted_price' => $product->formatted_price,
                'currency' => $product->currency,
                'category' => $product->category,
                'brand' => $product->brand,
                'stock_status' => $product->stock_status,
                'stock_status_label' => match ($product->stock_status) {
                    'in_stock' => 'Disponible',
                    'out_of_stock' => 'Agotado',
                    'on_backorder' => 'Por encargo',
                    default => $product->stock_status,
                },
                'stock_quantity' => $product->stock_quantity,
                'sku' => $product->sku,
                'url' => $product->url,
                'image' => $product->first_image,
                'provider' => $product->provider,
            ];

            if ($product->compare_at_price && $product->compare_at_price > $product->price) {
                $result['original_price'] = $product->compare_at_price;
                $discount = round((1 - $product->price / $product->compare_at_price) * 100);
                $result['discount_percentage'] = $discount . '%';
            }

            // Generate checkout URL based on provider
            $result['checkout_url'] = $this->buildCheckoutUrl($product, $company);

            if ($product->attributes) {
                $result['attributes'] = $product->attributes;
            }

            if ($product->variants) {
                $result['variants'] = $product->variants;
            }

            return $result;
        });

        $hasProducts = $totalProducts > 0;

        $instructions = '';
        if (!$hasProducts) {
            $instructions = 'Esta empresa no tiene productos configurados aún. Informa amablemente que no tienes información de productos disponible.';
        } elseif ($formattedProducts->isEmpty() && $searchTerm) {
            $instructions = "No se encontraron productos que coincidan con '{$searchTerm}'. Informa al usuario y sugiere buscar con otros términos. Categorías disponibles: " . $categories->implode(', ');
        } else {
            $instructions = "Presenta los productos de forma atractiva y natural. Incluye precio, disponibilidad y enlace si existe. Si el producto tiene descuento, menciónalo destacando el ahorro. Si tiene checkout_url, úsalo cuando el cliente quiera comprar (es un enlace directo de compra). Si solo tiene url, úsalo como enlace informativo del producto. Usa las categorías disponibles para sugerir alternativas si el usuario lo necesita.";
        }

        return response()->json([
            'has_products' => $hasProducts,
            'total_products' => $totalProducts,
            'products_found' => $formattedProducts->count(),
            'products' => $formattedProducts,
            'categories' => $categories,
            'instructions' => $instructions,
        ]);
    }

    /**
     * Get full catalog summary for the bot.
     * GET /api/product-hub/bot/catalog?company_slug=xxx
     */
    public function botCatalog(Request $request): JsonResponse
    {
        $companySlug = $request->input('company_slug');
        if (!$companySlug) {
            return response()->json(['error' => 'company_slug requerido'], 400);
        }

        $company = Company::where('slug', $companySlug)->first();
        if (!$company) {
            return response()->json(['error' => 'Empresa no encontrada'], 404);
        }

        $enabledProviders = ProductIntegration::where('company_id', $company->id)
            ->where('is_connected', true)
            ->where('bot_access_enabled', true)
            ->pluck('provider')
            ->toArray();
        $enabledProviders[] = 'manual';

        // Categories with product counts
        $categories = Product::where('company_id', $company->id)
            ->where('is_active', true)
            ->whereIn('provider', $enabledProviders)
            ->whereNotNull('category')
            ->selectRaw('category, count(*) as count, MIN(price) as min_price, MAX(price) as max_price')
            ->groupBy('category')
            ->orderBy('category')
            ->get();

        // Price range
        $priceRange = Product::where('company_id', $company->id)
            ->where('is_active', true)
            ->whereIn('provider', $enabledProviders)
            ->whereNotNull('price')
            ->selectRaw('MIN(price) as min, MAX(price) as max')
            ->first();

        // Provider stats
        $providerStats = Product::where('company_id', $company->id)
            ->where('is_active', true)
            ->whereIn('provider', $enabledProviders)
            ->selectRaw('provider, count(*) as count')
            ->groupBy('provider')
            ->pluck('count', 'provider');

        $totalProducts = Product::where('company_id', $company->id)
            ->where('is_active', true)
            ->whereIn('provider', $enabledProviders)
            ->count();

        $inStock = Product::where('company_id', $company->id)
            ->where('is_active', true)
            ->whereIn('provider', $enabledProviders)
            ->where('stock_status', 'in_stock')
            ->count();

        return response()->json([
            'has_products' => $totalProducts > 0,
            'total_products' => $totalProducts,
            'in_stock' => $inStock,
            'out_of_stock' => $totalProducts - $inStock,
            'categories' => $categories,
            'price_range' => [
                'min' => $priceRange?->min,
                'max' => $priceRange?->max,
            ],
            'providers' => $providerStats,
            'instructions' => $totalProducts > 0
                ? "El catálogo tiene {$totalProducts} productos en " . $categories->count() . " categorías. Usa la herramienta 'Buscar Productos' con un query específico para obtener detalles de productos individuales."
                : 'No hay productos configurados.',
        ]);
    }

    /**
     * Generate a checkout/payment link for a specific product.
     * POST /api/product-hub/bot/generate-link
     */
    public function botGenerateLink(Request $request): JsonResponse
    {
        $companySlug = $request->input('company_slug');
        $productId = $request->input('product_id');
        $productName = $request->input('product_name');
        $quantity = max(1, (int) ($request->input('quantity', 1)));

        if (!$companySlug) {
            return response()->json(['error' => 'company_slug requerido'], 400);
        }

        $company = Company::where('slug', $companySlug)->first();
        if (!$company) {
            return response()->json(['error' => 'Empresa no encontrada'], 404);
        }

        // Find product by ID or by name search
        $product = null;
        if ($productId) {
            $product = Product::where('company_id', $company->id)
                ->where('id', $productId)
                ->where('is_active', true)
                ->first();
        }

        if (!$product && $productName) {
            $product = Product::where('company_id', $company->id)
                ->where('is_active', true)
                ->search($productName)
                ->first();
        }

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Producto no encontrado. Usa la herramienta "Buscar Productos" primero para encontrar el producto correcto.',
                'instructions' => 'Informa al cliente que no encontraste el producto y ofrece ayuda para buscarlo.',
            ]);
        }

        // Build checkout URL
        $checkoutUrl = $this->buildCheckoutUrl($product, $company, $quantity);

        // Calculate total
        $total = $product->price * $quantity;
        $formattedTotal = $this->formatPrice($total, $product->currency);

        $response = [
            'success' => true,
            'product_name' => $product->name,
            'price' => $product->formatted_price,
            'quantity' => $quantity,
            'total' => $formattedTotal,
            'currency' => $product->currency,
            'stock_status' => $product->stock_status,
            'provider' => $product->provider,
        ];

        if ($product->stock_status === 'out_of_stock') {
            $response['message'] = "El producto \"{$product->name}\" está agotado actualmente.";
            $response['instructions'] = 'Informa al cliente que el producto no está disponible y ofrece alternativas o conectar con el equipo.';
            return response()->json($response);
        }

        if ($product->stock_quantity !== null && $quantity > $product->stock_quantity) {
            $response['message'] = "Solo hay {$product->stock_quantity} unidades disponibles de \"{$product->name}\".";
            $response['instructions'] = 'Informa al cliente del stock disponible y pregunta si quiere ajustar la cantidad.';
            return response()->json($response);
        }

        if ($checkoutUrl) {
            $response['checkout_url'] = $checkoutUrl;
            $response['message'] = "Enlace de compra generado para {$quantity}x {$product->name} por {$formattedTotal}.";
            $response['instructions'] = "Envía este enlace al cliente junto con el resumen del pedido: producto, cantidad, precio total. El enlace lleva directamente a la página de pago.";
        } else {
            $response['product_url'] = $product->url;
            $response['message'] = "No se puede generar un enlace de pago directo para este producto.";
            $response['instructions'] = $product->url
                ? "Envía la URL del producto al cliente y explica que puede completar la compra desde ahí."
                : "No hay enlace disponible. Ofrece conectar al cliente con el equipo para completar la compra manualmente. Confirma: producto, cantidad y precio total.";
        }

        // Add discount info
        $discountAmount = 0;
        if ($product->compare_at_price && $product->compare_at_price > $product->price) {
            $discount = round((1 - $product->price / $product->compare_at_price) * 100);
            $response['discount'] = "{$discount}% de descuento";
            $response['original_price'] = $this->formatPrice($product->compare_at_price, $product->currency);
            $discountAmount = ($product->compare_at_price - $product->price) * $quantity;
        }

        // Auto-record sale for tracking
        try {
            $sale = Sale::create([
                'company_id' => $company->id,
                'product_id' => $product->id,
                'customer_name' => $request->input('customer_name'),
                'customer_phone' => $request->input('customer_phone'),
                'product_name' => $product->name,
                'product_sku' => $product->sku,
                'product_category' => $product->category,
                'product_provider' => $product->provider,
                'quantity' => $quantity,
                'unit_price' => $product->price,
                'total_price' => $total,
                'discount_amount' => $discountAmount,
                'currency' => $product->currency ?? 'USD',
                'status' => $checkoutUrl ? 'link_generated' : 'link_generated',
                'source' => 'bot_whatsapp',
                'checkout_url' => $checkoutUrl ?? $product->url,
                'conversation_id' => $request->input('conversation_id'),
            ]);
            $response['sale_id'] = $sale->id;
        } catch (\Exception $e) {
            Log::warning("Failed to record sale: {$e->getMessage()}");
        }

        return response()->json($response);
    }

    /**
     * Build a checkout URL for a product based on its provider.
     */
    private function buildCheckoutUrl(Product $product, Company $company, int $quantity = 1): ?string
    {
        // If the product already has a URL, use smart provider-based checkout
        $integration = ProductIntegration::where('company_id', $company->id)
            ->where('provider', $product->provider)
            ->where('is_connected', true)
            ->first();

        $storeUrl = $integration?->store_url ? rtrim($integration->store_url, '/') : null;

        switch ($product->provider) {
            case 'woocommerce':
                if ($storeUrl && $product->external_id) {
                    return "{$storeUrl}/?add-to-cart={$product->external_id}&quantity={$quantity}";
                }
                return $product->url;

            case 'shopify':
                // Shopify: use variant ID if available, otherwise product URL
                if ($storeUrl && $product->variants && count($product->variants) > 0) {
                    $variantId = $product->variants[0]['id'] ?? null;
                    if ($variantId) {
                        return "{$storeUrl}/cart/{$variantId}:{$quantity}";
                    }
                }
                return $product->url;

            case 'mercadolibre':
                // MercadoLibre products link directly to the listing
                return $product->url;

            case 'custom_api':
            case 'manual':
            default:
                return $product->url ?: null;
        }
    }

    /**
     * Format a price with currency symbol.
     */
    private function formatPrice(float $price, ?string $currency): string
    {
        $symbols = [
            'USD' => 'US$', 'EUR' => '€', 'CLP' => '$',
            'ARS' => 'AR$', 'MXN' => 'MX$', 'BRL' => 'R$',
            'COP' => 'COL$', 'PEN' => 'S/',
        ];

        $symbol = $symbols[$currency ?? 'USD'] ?? '$';
        $decimals = in_array($currency, ['CLP', 'COP']) ? 0 : 2;

        return $symbol . number_format($price, $decimals, ',', '.');
    }
}
