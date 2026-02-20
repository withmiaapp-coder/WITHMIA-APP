<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Product;
use App\Models\ProductIntegration;
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
    public function botSearch(Request $request)
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
            $instructions = "Presenta los productos de forma atractiva y natural. Incluye precio, disponibilidad y enlace si existe. Si el producto tiene descuento, menciónalo. Si tiene imagen, envíala. Usa las categorías disponibles para sugerir alternativas.";
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
    public function botCatalog(Request $request)
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
}
