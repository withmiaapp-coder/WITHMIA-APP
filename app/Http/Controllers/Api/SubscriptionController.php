<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SubscriptionController extends Controller
{
    // Pricing constants
    private const BASE_PRICE_MONTHLY = 18;
    private const BASE_PRICE_ANNUAL = 15;
    private const PER_MEMBER_MONTHLY = 10;
    private const PER_MEMBER_ANNUAL = 8;
    private const TRIAL_DAYS = 14;

    // dLocal GO subscription checkout URL (pre-configured plan)
    private const DLOCAL_CHECKOUT_URL = 'https://checkout.dlocalgo.com/validate/subscription/ZdwgZ40KegihK2EB3uJolVekTbWzi264';

    /**
     * GET /api/subscription
     * Return current subscription status & billing info
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $company = Company::where('slug', $user->company_slug)->first();

        if (!$company) {
            return response()->json([
                'subscription' => null,
                'team_count' => 1,
                'base_price' => self::BASE_PRICE_MONTHLY,
                'per_member_price' => self::PER_MEMBER_MONTHLY,
                'total_price' => self::BASE_PRICE_MONTHLY,
                'trial_days_remaining' => null,
                'is_trial' => false,
            ]);
        }

        $subscription = Subscription::where('company_id', $company->id)
            ->latest()
            ->first();

        $teamCount = $company->users()->count();

        // Determine trial status
        $isTrial = false;
        $trialDaysRemaining = null;

        if ($subscription && $subscription->isTrialing()) {
            $isTrial = true;
            $trialDaysRemaining = $subscription->trialDaysRemaining();
        }

        // Calculate pricing
        $billingCycle = $subscription?->billing_cycle ?? 'monthly';
        $basePrice = $billingCycle === 'annual' ? self::BASE_PRICE_ANNUAL : self::BASE_PRICE_MONTHLY;
        $perMemberPrice = $billingCycle === 'annual' ? self::PER_MEMBER_ANNUAL : self::PER_MEMBER_MONTHLY;
        $additionalMembers = max(0, $teamCount - 1);
        $totalPrice = $basePrice + ($additionalMembers * $perMemberPrice);

        return response()->json([
            'subscription' => $subscription,
            'team_count' => $teamCount,
            'base_price' => $basePrice,
            'per_member_price' => $perMemberPrice,
            'total_price' => $totalPrice,
            'trial_days_remaining' => $trialDaysRemaining,
            'is_trial' => $isTrial,
        ]);
    }

    /**
     * POST /api/subscription/checkout
     * Return the dLocal GO subscription checkout URL
     */
    public function checkout(Request $request)
    {
        $request->validate([
            'billing_cycle' => 'required|in:monthly,annual',
        ]);

        $user = Auth::user();
        $company = Company::where('slug', $user->company_slug)->first();

        if (!$company) {
            return response()->json(['message' => 'No se encontró la empresa'], 404);
        }

        // Return the pre-configured dLocal GO subscription checkout URL
        return response()->json([
            'checkout_url' => self::DLOCAL_CHECKOUT_URL,
        ]);
    }

    /**
     * GET /api/subscription/callback
     * Handle return from dLocal GO checkout
     */
    public function callback(Request $request)
    {
        $companyId = $request->query('company_id');
        $billingCycle = $request->query('cycle', 'monthly');
        $paymentId = $request->query('payment_id');

        if ($companyId && $paymentId) {
            $company = Company::find($companyId);

            if ($company) {
                $teamCount = $company->users()->count();
                $additionalMembers = max(0, $teamCount - 1);
                $basePrice = $billingCycle === 'annual' ? self::BASE_PRICE_ANNUAL : self::BASE_PRICE_MONTHLY;
                $perMemberPrice = $billingCycle === 'annual' ? self::PER_MEMBER_ANNUAL : self::PER_MEMBER_MONTHLY;
                $totalPrice = $basePrice + ($additionalMembers * $perMemberPrice);

                // Create or update subscription
                Subscription::updateOrCreate(
                    ['company_id' => $company->id],
                    [
                        'plan_name' => 'WITHMIA Pro',
                        'price' => $totalPrice,
                        'billing_cycle' => $billingCycle,
                        'max_agents' => $teamCount,
                        'status' => 'active',
                        'starts_at' => now(),
                        'ends_at' => $billingCycle === 'annual' ? now()->addYear() : now()->addMonth(),
                        'dlocal_payment_id' => $paymentId,
                        'payment_info' => [
                            'payment_method' => 'dlocal_go',
                            'payment_id' => $paymentId,
                        ],
                    ]
                );
            }
        }

        // Redirect back to dashboard subscription section
        $user = Auth::user();
        $slug = $user?->company_slug ?? '';
        return redirect("/dashboard/{$slug}?section=subscription");
    }

    /**
     * POST /api/subscription/portal
     * Redirect to dLocal GO management portal (if available)
     */
    public function portal(Request $request)
    {
        $user = Auth::user();
        $company = Company::where('slug', $user->company_slug)->first();
        $subscription = $company ? Subscription::where('company_id', $company->id)->latest()->first() : null;

        // dLocal GO doesn't have a native portal like Stripe
        // For now, return a contact message or a management URL if we create one
        return response()->json([
            'portal_url' => null,
            'message' => 'Para gestionar tu suscripción, contacta a soporte@withmia.com',
        ]);
    }

    /**
     * POST /api/subscription/referral
     * Apply a referral code
     */
    public function applyReferral(Request $request)
    {
        $request->validate([
            'code' => 'required|string|max:50',
        ]);

        // TODO: Implement referral code logic
        // For now, just validate format
        $code = strtoupper(trim($request->code));

        // Validate code format (e.g., WITHMIA-XXXX)
        if (!preg_match('/^[A-Z0-9\-]{4,20}$/', $code)) {
            return response()->json([
                'message' => 'Código de referido inválido',
            ], 422);
        }

        // TODO: Check code in database, apply discount
        return response()->json([
            'message' => 'Código de referido registrado. El descuento se aplicará en tu próxima factura.',
        ]);
    }

    /**
     * POST /api/webhooks/dlocal
     * Handle dLocal GO payment notifications (webhook)
     */
    public function webhook(Request $request)
    {
        $payload = $request->all();

        Log::info('dLocal GO webhook received', ['payload' => $payload]);

        $paymentId = $payload['id'] ?? null;
        $status = $payload['status'] ?? null;
        $metadata = $payload['metadata'] ?? [];
        $companyId = $metadata['company_id'] ?? null;

        if (!$companyId || !$paymentId) {
            return response()->json(['received' => true], 200);
        }

        $company = Company::find($companyId);
        if (!$company) {
            return response()->json(['received' => true], 200);
        }

        if ($status === 'PAID' || $status === 'COMPLETED' || $status === 'approved') {
            $billingCycle = $metadata['billing_cycle'] ?? 'monthly';
            $teamCount = $metadata['team_count'] ?? 1;
            $basePrice = $metadata['base_price'] ?? self::BASE_PRICE_MONTHLY;
            $perMemberPrice = $metadata['per_member_price'] ?? self::PER_MEMBER_MONTHLY;
            $additionalMembers = max(0, $teamCount - 1);
            $totalPrice = $basePrice + ($additionalMembers * $perMemberPrice);

            Subscription::updateOrCreate(
                ['company_id' => $company->id],
                [
                    'plan_name' => 'WITHMIA Pro',
                    'price' => $totalPrice,
                    'billing_cycle' => $billingCycle,
                    'max_agents' => $teamCount,
                    'status' => 'active',
                    'starts_at' => now(),
                    'ends_at' => $billingCycle === 'annual' ? now()->addYear() : now()->addMonth(),
                    'dlocal_payment_id' => $paymentId,
                    'payment_info' => [
                        'payment_method' => 'dlocal_go',
                        'payment_id' => $paymentId,
                        'card_brand' => $payload['card']['brand'] ?? null,
                        'last_four' => $payload['card']['last_four'] ?? null,
                    ],
                ]
            );
        } elseif ($status === 'CANCELLED' || $status === 'REJECTED') {
            $subscription = Subscription::where('company_id', $company->id)
                ->where('dlocal_payment_id', $paymentId)
                ->first();

            if ($subscription) {
                $subscription->update(['status' => 'cancelled']);
            }
        }

        return response()->json(['received' => true], 200);
    }
}
