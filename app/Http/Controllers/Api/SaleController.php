<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Sales tracking controller.
 * - Dashboard endpoints (auth required) for viewing sales metrics
 * - Bot endpoints (no auth, uses company_slug) for recording sales from n8n
 */
class SaleController extends Controller
{
    // ═════════════════════════════════════════════════════════════
    // DASHBOARD ENDPOINTS (auth required)
    // ═════════════════════════════════════════════════════════════

    /**
     * Sales stats/metrics for the dashboard.
     * GET /api/sales/stats?period=month
     */
    public function stats(Request $request)
    {
        $company = $request->user()->company ?? Company::where('slug', $request->user()->company_slug)->first();
        if (!$company) {
            return response()->json(['error' => 'Empresa no encontrada'], 404);
        }

        // If sales table doesn't exist yet (migration pending), return empty data
        try {
            \Illuminate\Support\Facades\DB::select('SELECT 1 FROM sales LIMIT 1');
        } catch (\Exception $e) {
            return response()->json($this->emptySalesResponse($request->input('period', 'month')));
        }

        $period = $request->input('period', 'month');

        $baseQuery = Sale::forCompany($company->id);
        $periodQuery = Sale::forCompany($company->id)->inPeriod($period);

        // Core metrics
        $totalSales = (clone $periodQuery)->completed()->count();
        $totalRevenue = (clone $periodQuery)->completed()->sum('total_price');
        $pendingCount = (clone $periodQuery)->pending()->count();
        $pendingValue = (clone $periodQuery)->pending()->sum('total_price');
        $linksGenerated = (clone $periodQuery)->count();

        // Conversion rate: completed / links generated
        $conversionRate = $linksGenerated > 0
            ? round(($totalSales / $linksGenerated) * 100, 1)
            : 0;

        // Average ticket
        $avgTicket = $totalSales > 0 ? round($totalRevenue / $totalSales, 2) : 0;

        // Currency (most used)
        $mainCurrency = (clone $periodQuery)->selectRaw('currency, count(*) as cnt')
            ->groupBy('currency')
            ->orderByDesc('cnt')
            ->value('currency') ?? 'USD';

        // Sales by status
        $byStatus = (clone $periodQuery)
            ->selectRaw('status, count(*) as count, COALESCE(sum(total_price), 0) as total')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        // Sales by provider
        $byProvider = (clone $periodQuery)->completed()
            ->selectRaw('product_provider, count(*) as count, COALESCE(sum(total_price), 0) as total')
            ->groupBy('product_provider')
            ->get()
            ->keyBy('product_provider');

        // Top products (by revenue)
        $topProducts = (clone $periodQuery)->completed()
            ->selectRaw('product_name, product_category, count(*) as sales_count, sum(quantity) as units_sold, sum(total_price) as revenue')
            ->groupBy('product_name', 'product_category')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        // Daily sales trend (last 30 days or period)
        $dailySales = (clone $periodQuery)->completed()
            ->selectRaw('DATE(created_at) as date, count(*) as count, COALESCE(sum(total_price), 0) as revenue')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Recent sales
        $recentSales = (clone $periodQuery)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(fn($sale) => [
                'id' => $sale->id,
                'product_name' => $sale->product_name,
                'customer_name' => $sale->customer_name,
                'customer_phone' => $sale->customer_phone,
                'quantity' => $sale->quantity,
                'total_price' => $sale->total_price,
                'formatted_total' => $sale->formatted_total,
                'currency' => $sale->currency,
                'status' => $sale->status,
                'status_label' => $sale->status_label,
                'status_color' => $sale->status_color,
                'source' => $sale->source,
                'product_provider' => $sale->product_provider,
                'discount_amount' => $sale->discount_amount,
                'checkout_url' => $sale->checkout_url,
                'created_at' => $sale->created_at->toIso8601String(),
                'completed_at' => $sale->completed_at?->toIso8601String(),
            ]);

        // All-time totals for context
        $allTimeRevenue = (clone $baseQuery)->completed()->sum('total_price');
        $allTimeSales = (clone $baseQuery)->completed()->count();

        return response()->json([
            'period' => $period,
            'currency' => $mainCurrency,
            'metrics' => [
                'total_sales' => $totalSales,
                'total_revenue' => round((float) $totalRevenue, 2),
                'pending_count' => $pendingCount,
                'pending_value' => round((float) $pendingValue, 2),
                'links_generated' => $linksGenerated,
                'conversion_rate' => $conversionRate,
                'avg_ticket' => round((float) $avgTicket, 2),
            ],
            'all_time' => [
                'total_sales' => $allTimeSales,
                'total_revenue' => round((float) $allTimeRevenue, 2),
            ],
            'by_status' => $byStatus,
            'by_provider' => $byProvider,
            'top_products' => $topProducts,
            'daily_sales' => $dailySales,
            'recent_sales' => $recentSales,
        ]);
    }

    /**
     * List sales with pagination.
     * GET /api/sales?status=completed&page=1
     */
    public function index(Request $request)
    {
        $company = $request->user()->company ?? Company::where('slug', $request->user()->company_slug)->first();
        if (!$company) {
            return response()->json(['error' => 'Empresa no encontrada'], 404);
        }

        $query = Sale::forCompany($company->id)->orderByDesc('created_at');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        if ($period = $request->input('period')) {
            $query->inPeriod($period);
        }

        return $query->paginate($request->input('per_page', 25));
    }

    /**
     * Update sale status manually.
     * PATCH /api/sales/{id}/status
     */
    public function updateStatus(Request $request, int $id)
    {
        $company = $request->user()->company ?? Company::where('slug', $request->user()->company_slug)->first();
        if (!$company) {
            return response()->json(['error' => 'Empresa no encontrada'], 404);
        }

        $sale = Sale::forCompany($company->id)->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:link_generated,link_sent,completed,cancelled,expired',
        ]);

        $sale->status = $validated['status'];
        if ($validated['status'] === 'completed' && !$sale->completed_at) {
            $sale->completed_at = now();
        }
        $sale->save();

        return response()->json(['sale' => $sale, 'message' => 'Estado actualizado']);
    }

    // ═════════════════════════════════════════════════════════════
    // BOT ENDPOINTS (no auth, uses company_slug)
    // ═════════════════════════════════════════════════════════════

    /**
     * Record a sale from the bot (called by n8n after generating a checkout link).
     * POST /api/sales/bot/record
     */
    public function botRecord(Request $request)
    {
        $companySlug = $request->input('company_slug');
        if (!$companySlug) {
            return response()->json(['error' => 'company_slug requerido'], 400);
        }

        $company = Company::where('slug', $companySlug)->first();
        if (!$company) {
            return response()->json(['error' => 'Empresa no encontrada'], 404);
        }

        $productName = $request->input('product_name');
        $quantity = max(1, (int) $request->input('quantity', 1));
        $unitPrice = (float) $request->input('unit_price', 0);
        $totalPrice = (float) $request->input('total_price', 0);

        if (!$productName) {
            return response()->json(['error' => 'product_name requerido'], 400);
        }

        // Try to find the product for linking
        $product = Product::where('company_id', $company->id)
            ->where('is_active', true)
            ->search($productName)
            ->first();

        // Calculate total if not provided
        if ($totalPrice <= 0 && $unitPrice > 0) {
            $totalPrice = $unitPrice * $quantity;
        }

        // Calculate discount
        $discountAmount = 0;
        if ($product && $product->compare_at_price && $product->compare_at_price > $product->price) {
            $discountAmount = ($product->compare_at_price - $product->price) * $quantity;
        }

        $sale = Sale::create([
            'company_id' => $company->id,
            'product_id' => $product?->id,
            'customer_name' => $request->input('customer_name'),
            'customer_phone' => $request->input('customer_phone'),
            'customer_email' => $request->input('customer_email'),
            'product_name' => $productName,
            'product_sku' => $product?->sku ?? $request->input('product_sku'),
            'product_category' => $product?->category ?? $request->input('product_category'),
            'product_provider' => $product?->provider ?? $request->input('product_provider', 'manual'),
            'quantity' => $quantity,
            'unit_price' => $unitPrice ?: ($product?->price ?? 0),
            'total_price' => $totalPrice ?: (($product?->price ?? 0) * $quantity),
            'discount_amount' => $discountAmount,
            'currency' => $product?->currency ?? $request->input('currency', 'USD'),
            'status' => $request->input('status', 'link_generated'),
            'source' => $request->input('source', 'bot_whatsapp'),
            'checkout_url' => $request->input('checkout_url'),
            'conversation_id' => $request->input('conversation_id'),
            'metadata' => $request->input('metadata'),
        ]);

        Log::info("Sale recorded for company {$company->slug}", [
            'sale_id' => $sale->id,
            'product' => $productName,
            'total' => $sale->total_price,
            'status' => $sale->status,
        ]);

        return response()->json([
            'success' => true,
            'sale_id' => $sale->id,
            'message' => "Venta registrada: {$sale->product_name} x{$sale->quantity} = {$sale->formatted_total}",
        ]);
    }

    /**
     * Update sale status from bot (e.g., mark as link_sent).
     * PATCH /api/sales/bot/update-status
     */
    public function botUpdateStatus(Request $request)
    {
        $companySlug = $request->input('company_slug');
        if (!$companySlug) {
            return response()->json(['error' => 'company_slug requerido'], 400);
        }

        $company = Company::where('slug', $companySlug)->first();
        if (!$company) {
            return response()->json(['error' => 'Empresa no encontrada'], 404);
        }

        $saleId = $request->input('sale_id');
        if (!$saleId) {
            return response()->json(['error' => 'sale_id requerido'], 400);
        }

        $sale = Sale::forCompany($company->id)->find($saleId);
        if (!$sale) {
            return response()->json(['error' => 'Venta no encontrada'], 404);
        }

        $newStatus = $request->input('status');
        if (!in_array($newStatus, ['link_sent', 'completed', 'cancelled', 'expired'])) {
            return response()->json(['error' => 'Estado inválido'], 400);
        }

        $sale->status = $newStatus;
        if ($newStatus === 'completed' && !$sale->completed_at) {
            $sale->completed_at = now();
        }
        if ($externalOrderId = $request->input('external_order_id')) {
            $sale->external_order_id = $externalOrderId;
        }
        $sale->save();

        return response()->json([
            'success' => true,
            'sale_id' => $sale->id,
            'status' => $sale->status,
            'message' => "Venta actualizada a: {$sale->status_label}",
        ]);
    }

    /**
     * Returns an empty sales response (used when table doesn't exist yet)
     */
    private function emptySalesResponse(string $period = 'month'): array
    {
        return [
            'period' => $period,
            'currency' => 'USD',
            'metrics' => [
                'total_sales' => 0,
                'total_revenue' => 0,
                'pending_count' => 0,
                'pending_value' => 0,
                'links_generated' => 0,
                'conversion_rate' => 0,
                'avg_ticket' => 0,
            ],
            'all_time' => [
                'total_sales' => 0,
                'total_revenue' => 0,
            ],
            'by_status' => [],
            'by_provider' => [],
            'top_products' => [],
            'daily_sales' => [],
            'recent_sales' => [],
        ];
    }
}
