<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProductController extends Controller
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

    /**
     * List products with search, filtering, and pagination
     */
    public function index(Request $request)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $query = Product::where('company_id', $company->id);

        // Search
        if ($search = $request->input('search')) {
            $query->search($search);
        }

        // Filter by provider
        if ($provider = $request->input('provider')) {
            $query->fromProvider($provider);
        }

        // Filter by category
        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        // Filter by stock status
        if ($stockStatus = $request->input('stock_status')) {
            $query->where('stock_status', $stockStatus);
        }

        // Filter by active
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Sort
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        // Get stats
        $totalProducts = Product::where('company_id', $company->id)->count();
        $categories = Product::where('company_id', $company->id)
            ->whereNotNull('category')
            ->distinct('category')
            ->pluck('category')
            ->sort()
            ->values();

        $providerCounts = Product::where('company_id', $company->id)
            ->selectRaw('provider, count(*) as count')
            ->groupBy('provider')
            ->pluck('count', 'provider');

        $products = $query->paginate($request->input('per_page', 50));

        return response()->json([
            'success' => true,
            'products' => $products->items(),
            'pagination' => [
                'total' => $products->total(),
                'per_page' => $products->perPage(),
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
            ],
            'stats' => [
                'total' => $totalProducts,
                'categories' => $categories,
                'by_provider' => $providerCounts,
            ],
        ]);
    }

    /**
     * Create a manual product
     */
    public function store(Request $request)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'nullable|numeric|min:0',
            'compare_at_price' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'sku' => 'nullable|string|max:100',
            'stock_quantity' => 'nullable|integer|min:0',
            'stock_status' => 'nullable|in:in_stock,out_of_stock,on_backorder',
            'category' => 'nullable|string|max:255',
            'images' => 'nullable|array',
            'images.*' => 'url',
            'attributes' => 'nullable|array',
            'variants' => 'nullable|array',
            'url' => 'nullable|url',
            'brand' => 'nullable|string|max:255',
            'weight' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['company_id'] = $company->id;
        $validated['provider'] = 'manual';

        $product = Product::create($validated);

        return response()->json([
            'success' => true,
            'product' => $product,
            'message' => 'Producto creado exitosamente',
        ], 201);
    }

    /**
     * Get a single product
     */
    public function show(Request $request, $id)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $product = Product::where('company_id', $company->id)->findOrFail($id);

        return response()->json([
            'success' => true,
            'product' => $product,
        ]);
    }

    /**
     * Update a product
     */
    public function update(Request $request, $id)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $product = Product::where('company_id', $company->id)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'nullable|numeric|min:0',
            'compare_at_price' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'sku' => 'nullable|string|max:100',
            'stock_quantity' => 'nullable|integer|min:0',
            'stock_status' => 'nullable|in:in_stock,out_of_stock,on_backorder',
            'category' => 'nullable|string|max:255',
            'images' => 'nullable|array',
            'images.*' => 'url',
            'attributes' => 'nullable|array',
            'variants' => 'nullable|array',
            'url' => 'nullable|url',
            'brand' => 'nullable|string|max:255',
            'weight' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $product->update($validated);

        return response()->json([
            'success' => true,
            'product' => $product->fresh(),
            'message' => 'Producto actualizado',
        ]);
    }

    /**
     * Delete a product
     */
    public function destroy(Request $request, $id)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $product = Product::where('company_id', $company->id)->findOrFail($id);
        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Producto eliminado',
        ]);
    }

    /**
     * Bulk delete products
     */
    public function bulkDelete(Request $request)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer',
        ]);

        $deleted = Product::where('company_id', $company->id)
            ->whereIn('id', $validated['ids'])
            ->delete();

        return response()->json([
            'success' => true,
            'deleted' => $deleted,
            'message' => "$deleted producto(s) eliminado(s)",
        ]);
    }

    /**
     * Upload product image
     */
    public function uploadImage(Request $request)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $request->validate([
            'image' => 'required|image|max:5120', // 5MB
        ]);

        $file = $request->file('image');
        $path = $file->store("products/{$company->id}", 'public');
        $url = asset("storage/{$path}");

        return response()->json([
            'success' => true,
            'url' => $url,
        ]);
    }

    /**
     * Get categories for this company
     */
    public function categories(Request $request)
    {
        $company = $this->getCompany($request);
        if (!$company) {
            return response()->json(['error' => 'No autorizado'], 401);
        }

        $categories = Product::where('company_id', $company->id)
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->selectRaw('category, count(*) as count')
            ->groupBy('category')
            ->orderBy('category')
            ->get();

        return response()->json([
            'success' => true,
            'categories' => $categories,
        ]);
    }
}
