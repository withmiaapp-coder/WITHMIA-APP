<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\TeamInvitationMail;
use App\Models\Subscription;
use App\Models\Company;
use App\Models\TeamInvitation;
use App\Models\User;
use App\Services\FlowService;
use App\Services\DLocalService;
use App\Services\AiUsageService;
use App\Services\OverageService;
use App\Services\CurrencyService;
use App\Services\ChatwootService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SubscriptionController extends Controller
{
    private FlowService $flow;
    private DLocalService $dlocal;
    private AiUsageService $aiUsage;
    private OverageService $overage;
    private CurrencyService $currency;

    public function __construct(FlowService $flow, DLocalService $dlocal, AiUsageService $aiUsage, OverageService $overage, CurrencyService $currency)
    {
        $this->flow = $flow;
        $this->dlocal = $dlocal;
        $this->aiUsage = $aiUsage;
        $this->overage = $overage;
        $this->currency = $currency;
    }

    /* ═══════════════════════════════════════════
       GET /api/subscription
       Current subscription status & billing info
       ═══════════════════════════════════════════ */

    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $company = Company::where('slug', $user->company_slug)->first();

        if (!$company) {
            return response()->json([
                'subscription' => null,
                'team_count'   => 1,
                'plan'         => 'free',
                'currency'     => 'CLP',
                'base_price'   => config('billing.base_price_monthly'),
                'per_member'   => config('billing.per_member_monthly'),
                'total_price'  => 0,
                'is_active'    => false,
            ]);
        }

        $subscription = Subscription::where('company_id', $company->id)
            ->whereIn('status', ['active', 'past_due'])
            ->latest()
            ->first();

        $teamCount = $company->users()->count();

        if (!$subscription) {
            return response()->json([
                'subscription' => null,
                'team_count'   => $teamCount,
                'plan'         => 'free',
                'currency'     => 'CLP',
                'base_price'   => config('billing.base_price_monthly'),
                'per_member'   => config('billing.per_member_monthly'),
                'total_price'  => 0,
                'is_active'    => false,
            ]);
        }

        // Detect the actual plan tier from payment_info or plan_name
        $paymentInfo = $subscription->payment_info ?? [];
        $planTier = $paymentInfo['plan'] ?? 'pro';
        if (!in_array($planTier, ['pro', 'business', 'enterprise'])) {
            // Fallback: detect from plan_name
            $planName = strtolower($subscription->plan_name ?? '');
            if (str_contains($planName, 'enterprise')) {
                $planTier = 'enterprise';
            } elseif (str_contains($planName, 'business')) {
                $planTier = 'business';
            } else {
                $planTier = 'pro';
            }
        }

        $planConfig   = config("billing.plans.{$planTier}", config('billing.plans.pro'));
        $billingCycle = $subscription->billing_cycle ?? 'monthly';
        $basePrice    = $billingCycle === 'annual' ? (int)$planConfig['price_annual'] : (int)$planConfig['price_monthly'];
        $perMember    = $billingCycle === 'annual' ? config('billing.per_member_annual') : config('billing.per_member_monthly');
        $membersIncluded = $planConfig['members_included'] ?? 1;
        $additional   = max(0, $teamCount - $membersIncluded);
        $totalPrice   = $basePrice + ($additional * $perMember);

        return response()->json([
            'subscription' => [
                'id'            => $subscription->id,
                'plan_name'     => $subscription->plan_name,
                'billing_cycle' => $subscription->billing_cycle,
                'status'        => $subscription->status,
                'starts_at'     => $subscription->starts_at,
                'ends_at'       => $subscription->ends_at,
            ],
            'team_count'  => $teamCount,
            'plan'        => $planTier,
            'currency'    => 'CLP',
            'base_price'  => $basePrice,
            'per_member'  => $perMember,
            'total_price' => $totalPrice,
            'is_active'   => true,
        ]);
    }

    /* ═══════════════════════════════════════════
       GET /api/subscription/usage
       Current AI usage stats for the company
       ═══════════════════════════════════════════ */

    public function usage(Request $request): JsonResponse
    {
        $user = Auth::user();
        $company = Company::where('slug', $user->company_slug)->first();

        if (!$company) {
            return response()->json([
                'messages_used' => 0,
                'messages_limit' => config('billing.plans.free.ai_messages', 500),
                'remaining' => config('billing.plans.free.ai_messages', 500),
                'percentage' => 0,
                'has_reached_limit' => false,
                'period' => now()->format('Y-m'),
            ]);
        }

        return response()->json($this->aiUsage->getUsageStats($company->id));
    }

    /* ═══════════════════════════════════════════
       GET /api/subscription/plans
       Available plans and pricing (auto-localized by IP)
       ═══════════════════════════════════════════ */

    public function plans(Request $request): JsonResponse
    {
        $plans = config('billing.plans', []);

        // Detect user location for currency conversion
        $geo = $this->currency->detectCountry($request->ip());
        $userCurrency = $geo['currency'];
        $countryCode  = $geo['country_code'];
        $gateway      = $this->currency->gatewayForCountry($countryCode);

        $formatted = [];

        foreach ($plans as $key => $plan) {
            $entry = [
                'id' => $key,
                'name' => $plan['name'],
                'price_monthly' => $plan['price_monthly'],
                'price_annual' => $plan['price_annual'],
                'ai_messages' => $plan['ai_messages'],
                'channels' => $plan['channels'],
                'max_members' => $plan['max_members'],
                'members_included' => $plan['members_included'] ?? $plan['max_members'],
                'max_documents' => $plan['max_documents'],
                'max_workflows' => $plan['max_workflows'],
                'available_models' => $plan['available_models'],
                'support' => $plan['support'],
            ];

            // Add localized pricing if user is not in Chile
            if ($userCurrency !== 'CLP') {
                $localMonthly = $this->currency->convertFromCLP($plan['price_monthly'], $userCurrency);
                $localAnnual  = $this->currency->convertFromCLP($plan['price_annual'], $userCurrency);
                $entry['local_price_monthly'] = $localMonthly['amount'];
                $entry['local_price_annual']  = $localAnnual['amount'];
                $entry['local_currency']      = $userCurrency;
            }

            $formatted[] = $entry;
        }

        $response = [
            'plans' => $formatted,
            'currency' => 'CLP',
            'per_member_monthly' => config('billing.per_member_monthly'),
            'per_member_annual' => config('billing.per_member_annual'),
        ];

        // Add localized member pricing
        if ($userCurrency !== 'CLP') {
            $localMemberMonthly = $this->currency->convertFromCLP(config('billing.per_member_monthly'), $userCurrency);
            $localMemberAnnual  = $this->currency->convertFromCLP(config('billing.per_member_annual'), $userCurrency);
            $response['local_currency'] = $userCurrency;
            $response['local_per_member_monthly'] = $localMemberMonthly['amount'];
            $response['local_per_member_annual']  = $localMemberAnnual['amount'];
            $response['country'] = $countryCode;
            $response['gateway'] = $gateway;
            $response['currency_name'] = $this->currency->currencyName($userCurrency);
        }

        return response()->json($response);
    }

    /* ═══════════════════════════════════════════
       POST /api/subscription/checkout
       Create Flow.cl subscription → redirect URL
       ═══════════════════════════════════════════ */

    public function checkout(Request $request): JsonResponse
    {
        $request->validate([
            'billing_cycle' => 'required|in:monthly,annual',
            'plan'          => 'nullable|in:pro,business,enterprise',
            'gateway'       => 'nullable|in:flow,dlocal',
        ]);

        $user    = Auth::user();
        $company = Company::where('slug', $user->company_slug)->first();

        if (!$company) {
            return response()->json(['message' => 'No se encontró la empresa'], 404);
        }

        // Check if already has active subscription
        $existing = Subscription::where('company_id', $company->id)
            ->where('status', 'active')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Ya tienes una suscripción activa. Cancélala primero para cambiar de plan.',
            ], 422);
        }

        $cycle = $request->billing_cycle;
        $plan  = $request->input('plan', 'pro');

        // Validate plan exists in config
        $planConfig = config("billing.plans.{$plan}");
        if (!$planConfig) {
            return response()->json(['message' => 'Plan no válido'], 422);
        }

        // ── Auto-detect gateway based on user's country ──
        // Can be overridden by the frontend sending `gateway` param
        $geo = $this->currency->detectCountry($request->ip());
        $countryCode = $geo['country_code'];
        $userCurrency = $geo['currency'];

        // Gateway selection: Chile → Flow.cl, others → dLocal
        $gateway = $request->input('gateway') ?? $this->currency->gatewayForCountry($countryCode);

        // Validate the selected gateway is configured
        if ($gateway === 'flow' && !$this->flow->isConfigured()) {
            // Fallback to dLocal if Flow not configured
            $gateway = 'dlocal';
        }
        if ($gateway === 'dlocal' && !$this->dlocal->isConfigured()) {
            // Fallback to Flow if dLocal not configured
            $gateway = 'flow';
        }

        // If neither is configured, bail
        if (($gateway === 'flow' && !$this->flow->isConfigured()) ||
            ($gateway === 'dlocal' && !$this->dlocal->isConfigured())) {
            Log::error('No payment gateway configured', ['gateway' => $gateway]);
            return response()->json(['message' => 'No hay pasarela de pago disponible. Contacta soporte.'], 500);
        }

        // ── Route to the appropriate gateway ──
        if ($gateway === 'flow') {
            return $this->checkoutViaFlow($request, $company, $user, $plan, $cycle, $planConfig);
        } else {
            return $this->checkoutViaDlocal($request, $company, $user, $plan, $cycle, $planConfig, $countryCode, $userCurrency);
        }
    }

    /**
     * Process checkout via Flow.cl (Chile only — CLP subscriptions).
     */
    private function checkoutViaFlow(Request $request, Company $company, $user, string $plan, string $cycle, array $planConfig): JsonResponse
    {
        // Map plan + cycle to the correct Flow.cl subscription plan ID
        $flowPlanIds = [
            'pro' => [
                'monthly' => config('billing.flow.plan_monthly_id'),
                'annual'  => config('billing.flow.plan_annual_id'),
            ],
            'business' => [
                'monthly' => config('billing.flow.business_monthly_id'),
                'annual'  => config('billing.flow.business_annual_id'),
            ],
            'enterprise' => [
                'monthly' => config('billing.flow.enterprise_monthly_id'),
                'annual'  => config('billing.flow.enterprise_annual_id'),
            ],
        ];

        $flowPlanId = $flowPlanIds[$plan][$cycle] ?? config('billing.flow.plan_monthly_id');

        $amount = $cycle === 'annual'
            ? (int) $planConfig['price_annual']
            : (int) $planConfig['price_monthly'];

        $planLabel  = strtoupper($planConfig['name']);
        $cycleLabel = $cycle === 'annual' ? 'Anual' : 'Mensual';

        try {
            $baseUrl    = config('app.url');
            $returnUrl  = $baseUrl . str_replace('{slug}', $company->slug, config('billing.flow.return_url'));
            $confirmUrl = $baseUrl . '/api/webhooks/flow-subscription';

            // Find or create customer in Flow.cl
            $flowCustomer = $this->flow->findOrCreateCustomer(
                $user->name ?? $company->name,
                $user->email,
                "company-{$company->id}"
            );

            $flowCustomerId = $flowCustomer['customerId'] ?? null;

            if (!$flowCustomerId) {
                Log::error('Flow: could not create/find customer', ['result' => $flowCustomer]);
                return response()->json(['message' => 'Error al registrar cliente en Flow. Contacta soporte.'], 500);
            }

            // Create subscription in Flow (recurring billing)
            $subscriptionResult = $this->flow->createSubscription(
                $flowPlanId,
                $flowCustomerId,
                $returnUrl,
                $confirmUrl
            );

            Log::info('Flow createSubscription response', [
                'plan'            => $plan,
                'flow_plan_id'    => $flowPlanId,
                'flow_customer'   => $flowCustomerId,
                'amount'          => $amount,
                'result'          => $subscriptionResult,
            ]);

            // Build redirect URL
            $redirectUrl = null;
            if (!empty($subscriptionResult['url']) && !empty($subscriptionResult['token'])) {
                $redirectUrl = $subscriptionResult['url'] . '?token=' . $subscriptionResult['token'];
            }

            if (!$redirectUrl) {
                Log::error('Flow subscription: no redirect URL', ['result' => $subscriptionResult]);
                return response()->json(['message' => 'No se obtuvo URL de pago de Flow. Contacta soporte.'], 500);
            }

            // Save pending subscription locally
            Subscription::updateOrCreate(
                ['company_id' => $company->id],
                [
                    'plan_name'            => "WITHMIA {$planLabel}",
                    'price'                => $amount,
                    'billing_cycle'        => $cycle,
                    'max_agents'           => $planConfig['max_members'] ?? $company->users()->count(),
                    'status'               => 'suspended',
                    'starts_at'            => now(),
                    'flow_subscription_id' => $subscriptionResult['subscriptionId'] ?? null,
                    'flow_customer_id'     => $flowCustomerId,
                    'payment_info'         => [
                        'payment_method'  => 'flow',
                        'type'            => 'subscription',
                        'plan'            => $plan,
                        'flow_plan_id'    => $flowPlanId,
                        'cycle'           => $cycle,
                        'currency'        => 'CLP',
                        'amount_clp'      => $amount,
                        'country'         => 'CL',
                        'flow_customer'   => $flowCustomerId,
                        'flow_token'      => $subscriptionResult['token'] ?? null,
                    ],
                ]
            );

            return response()->json([
                'checkout_url' => $redirectUrl,
                'token'        => $subscriptionResult['token'] ?? null,
                'gateway'      => 'flow',
            ]);

        } catch (\Exception $e) {
            Log::error('Flow checkout error', [
                'company_id' => $company->id,
                'plan'       => $plan,
                'cycle'      => $cycle,
                'error'      => $e->getMessage(),
            ]);

            return response()->json(['message' => 'Error al iniciar el pago. Intenta nuevamente.'], 500);
        }
    }

    /**
     * Process checkout via dLocal Go (International — multi-currency).
     *
     * Converts CLP pricing to the user's local currency at current exchange rates.
     * Supports all LATAM currencies + USD as fallback.
     */
    private function checkoutViaDlocal(Request $request, Company $company, $user, string $plan, string $cycle, array $planConfig, string $countryCode, string $userCurrency): JsonResponse
    {
        $amountCLP = $cycle === 'annual'
            ? (int) $planConfig['price_annual']
            : (int) $planConfig['price_monthly'];

        // Convert CLP to user's local currency
        $converted = $this->currency->convertFromCLP($amountCLP, $userCurrency);
        $amount   = $converted['amount'];
        $currency = $converted['currency'];
        $rate     = $converted['rate'];

        $planLabel  = strtoupper($planConfig['name']);
        $cycleLabel = $cycle === 'annual' ? 'Anual' : 'Mensual';

        try {
            $baseUrl = config('app.url');
            $successUrl = $baseUrl . str_replace('{slug}', $company->slug, config('billing.dlocal.return_url', config('billing.flow.return_url')));
            $backUrl = $baseUrl . str_replace('{slug}', $company->slug, config('billing.dlocal.cancel_url', config('billing.flow.cancel_url')));
            $notificationUrl = $baseUrl . '/api/webhooks/dlocal';

            $orderId = "withmia-{$plan}-{$company->id}-{$cycle}-" . time();

            $result = $this->dlocal->createPayment(
                $orderId,
                "WITHMIA {$planLabel} ({$cycleLabel})",
                $amount,
                $currency,
                $user->email,
                $successUrl,
                $backUrl,
                $notificationUrl,
                [
                    'company_id'    => $company->id,
                    'plan'          => $plan,
                    'billing_cycle' => $cycle,
                    'country'       => $countryCode,
                    'currency'      => $currency,
                    'amount_clp'    => $amountCLP,
                    'exchange_rate' => $rate,
                ]
            );

            Log::info('dLocal checkout created', [
                'company_id' => $company->id,
                'plan'       => $plan,
                'cycle'      => $cycle,
                'country'    => $countryCode,
                'currency'   => $currency,
                'amount'     => $amount,
                'amount_clp' => $amountCLP,
                'rate'       => $rate,
            ]);

            // Save pending subscription
            Subscription::updateOrCreate(
                ['company_id' => $company->id],
                [
                    'plan_name'            => "WITHMIA {$planLabel}",
                    'price'                => $amountCLP, // Always store in CLP for consistency
                    'billing_cycle'        => $cycle,
                    'max_agents'           => $planConfig['max_members'] ?? 1,
                    'status'               => 'suspended',
                    'starts_at'            => now(),
                    'dlocal_payment_id'    => $result['id'] ?? null,
                    'payment_info'         => [
                        'payment_method'   => 'dlocal',
                        'type'             => 'payment',
                        'plan'             => $plan,
                        'cycle'            => $cycle,
                        'order_id'         => $orderId,
                        'country'          => $countryCode,
                        'currency'         => $currency,
                        'amount_local'     => $amount,
                        'amount_clp'       => $amountCLP,
                        'exchange_rate'    => $rate,
                    ],
                ]
            );

            $checkoutUrl = $result['checkout_url'] ?? null;

            if (!$checkoutUrl) {
                Log::error('dLocal checkout: no redirect URL', ['result' => $result]);
                return response()->json(['message' => 'No se obtuvo URL de pago. Contacta soporte.'], 500);
            }

            return response()->json([
                'checkout_url' => $checkoutUrl,
                'payment_id'   => $result['id'] ?? null,
                'gateway'      => 'dlocal',
                'currency'     => $currency,
                'amount'       => $amount,
                'amount_clp'   => $amountCLP,
            ]);

        } catch (\Exception $e) {
            Log::error('dLocal checkout error', [
                'company_id' => $company->id,
                'plan'       => $plan,
                'cycle'      => $cycle,
                'country'    => $countryCode,
                'currency'   => $currency,
                'error'      => $e->getMessage(),
            ]);

            return response()->json(['message' => 'Error al iniciar el pago internacional.'], 500);
        }
    }

    /* ═══════════════════════════════════════════
       POST /api/subscription/checkout-member
       Create Flow.cl payment for an extra team member
       On payment success (webhook), the invitation is auto-sent.
       ═══════════════════════════════════════════ */

    public function checkoutMember(Request $request): JsonResponse
    {
        $request->validate([
            'email'   => 'required|email',
            'name'    => 'nullable|string|max:255',
            'role'    => 'required|in:agent,administrator',
            'team_id' => 'nullable|integer',
        ]);

        $user    = Auth::user();
        $company = Company::where('slug', $user->company_slug)->first();

        if (!$company) {
            return response()->json(['message' => 'No se encontró la empresa'], 404);
        }

        // Must have active subscription
        $subscription = Subscription::where('company_id', $company->id)
            ->where('status', 'active')
            ->first();

        if (!$subscription) {
            return response()->json([
                'message' => 'Necesitas un plan Pro activo para invitar miembros.',
            ], 422);
        }

        // Check for existing user in company
        $email = strtolower($request->email);
        $existingUser = User::where('email', $email)
            ->where('company_slug', $company->slug)
            ->first();

        if ($existingUser) {
            return response()->json([
                'message' => 'Este usuario ya pertenece a tu empresa.',
            ], 400);
        }

        // Check for pending invitation
        $existingInvitation = TeamInvitation::where('email', $email)
            ->where('company_id', $company->id)
            ->where('status', 'pending')
            ->first();

        if ($existingInvitation) {
            return response()->json([
                'message' => 'Ya existe una invitación pendiente para este email.',
            ], 400);
        }

        if (!$this->flow->isConfigured()) {
            return response()->json(['message' => 'El sistema de pagos no está configurado.'], 500);
        }

        // Determine price based on billing cycle
        $billingCycle = $subscription->billing_cycle ?? 'monthly';
        $amount       = $billingCycle === 'annual'
            ? (int) config('billing.per_member_annual')
            : (int) config('billing.per_member_monthly');

        $cycleName = $billingCycle === 'annual' ? 'Anual' : 'Mensual';

        try {
            $baseUrl    = config('app.url');
            $returnUrl  = $baseUrl . str_replace('{slug}', $company->slug, config('billing.flow.return_url'));
            $confirmUrl = $baseUrl . config('billing.flow.webhook_url');

            $commerceOrder = "withmia-member-{$company->id}-" . time();

            $paymentResult = $this->flow->createPayment(
                $commerceOrder,
                "Miembro adicional WITHMIA ({$cycleName})",
                $amount,
                $user->email,
                $confirmUrl,
                $returnUrl,
                [
                    'type'          => 'member_addon',
                    'company_id'    => $company->id,
                    'invited_by'    => $user->id,
                    'invite_email'  => $email,
                    'invite_name'   => $request->name,
                    'invite_role'   => $request->role,
                    'invite_team'   => $request->team_id,
                    'billing_cycle' => $billingCycle,
                ]
            );

            $redirectUrl = null;
            if (!empty($paymentResult['url']) && !empty($paymentResult['token'])) {
                $redirectUrl = $paymentResult['url'] . '?token=' . $paymentResult['token'];
            }

            if (!$redirectUrl) {
                return response()->json([
                    'message' => 'No se obtuvo URL de pago de Flow.',
                ], 500);
            }

            Log::info('Flow member checkout created', [
                'company_id'     => $company->id,
                'invite_email'   => $email,
                'amount'         => $amount,
                'commerce_order' => $commerceOrder,
            ]);

            return response()->json([
                'checkout_url' => $redirectUrl,
                'amount'       => $amount,
                'token'        => $paymentResult['token'] ?? null,
            ]);

        } catch (\Exception $e) {
            Log::error('Flow member checkout error', [
                'company_id' => $company->id,
                'email'      => $email,
                'error'      => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Error al iniciar el pago. Intenta nuevamente.',
            ], 500);
        }
    }

    /* ═══════════════════════════════════════════
       GET /api/subscription/callback
       Handle return from Flow.cl checkout page
       ═══════════════════════════════════════════ */

    public function callback(Request $request): \Illuminate\Http\RedirectResponse
    {
        $token = $request->query('token');
        if ($token) {
            Log::info('Flow callback return', ['token' => $token]);
        }

        $user = Auth::user();
        $slug = $user?->company_slug ?? '';
        return redirect("/dashboard/{$slug}?section=subscription");
    }

    /* ═══════════════════════════════════════════
       POST /api/subscription/cancel
       Cancel current subscription
       ═══════════════════════════════════════════ */

    public function cancel(Request $request): JsonResponse
    {
        $user    = Auth::user();
        $company = Company::where('slug', $user->company_slug)->first();

        if (!$company) {
            return response()->json(['message' => 'No se encontró la empresa'], 404);
        }

        $subscription = Subscription::where('company_id', $company->id)
            ->where('status', 'active')
            ->latest()
            ->first();

        if (!$subscription) {
            return response()->json(['message' => 'No tienes una suscripción activa'], 404);
        }

        try {
            if ($subscription->flow_subscription_id) {
                $this->flow->cancelSubscription($subscription->flow_subscription_id);
            }

            $subscription->update([
                'status'       => 'cancelled',
                'cancelled_at' => now(),
            ]);

            return response()->json([
                'message' => 'Suscripción cancelada. Tendrás acceso hasta el final del período actual.',
            ]);
        } catch (\Exception $e) {
            Log::error('Flow cancel error', [
                'subscription_id' => $subscription->id,
                'error'           => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Error al cancelar. Contacta soporte@withmia.com'], 500);
        }
    }

    /* ═══════════════════════════════════════════
       POST /api/subscription/portal
       ═══════════════════════════════════════════ */

    public function portal(Request $request): JsonResponse
    {
        return response()->json([
            'portal_url' => null,
            'message'    => 'Para gestionar tu suscripción, usa la sección de facturación en tu dashboard o contacta soporte@withmia.com',
        ]);
    }

    /* ═══════════════════════════════════════════
       POST /api/subscription/referral
       ═══════════════════════════════════════════ */

    public function applyReferral(Request $request): JsonResponse
    {
        $request->validate(['code' => 'required|string|max:50']);
        $code = strtoupper(trim($request->code));

        if (!preg_match('/^[A-Z0-9\-]{4,20}$/', $code)) {
            return response()->json(['message' => 'Código de referido inválido'], 422);
        }

        return response()->json([
            'message' => 'Código de referido registrado. El descuento se aplicará en tu próxima factura.',
        ]);
    }

    /* ═══════════════════════════════════════════
       POST /api/webhooks/flow
       Handle Flow.cl payment confirmation webhook
       ═══════════════════════════════════════════ */

    public function webhook(Request $request): JsonResponse
    {
        $token = $request->input('token');

        if (!$token) {
            Log::warning('Flow webhook: no token received');
            return response()->json(['received' => true], 200);
        }

        try {
            // Retrieve payment details from Flow using the token
            $data = $this->flow->getPaymentStatus($token);

            Log::info('Flow webhook received', ['data' => $data]);

            // Flow payment statuses: 1=pending, 2=paid, 3=rejected, 4=cancelled
            $status        = (int) ($data['status'] ?? 0);
            $commerceOrder = $data['commerceOrder'] ?? null;
            $flowOrder     = $data['flowOrder'] ?? null;
            $amount        = $data['amount'] ?? null;
            $optionalRaw   = $data['optional'] ?? null;

            // Parse optional data (contains company_id, plan_id, billing_cycle)
            $optional = [];
            if ($optionalRaw) {
                $optional = is_string($optionalRaw) ? json_decode($optionalRaw, true) : (array) $optionalRaw;
            }

            // ─── Member addon payment (invitation) ───
            if (($optional['type'] ?? null) === 'member_addon') {
                return $this->handleMemberAddonWebhook($status, $optional, $flowOrder, $amount);
            }

            // ─── Overage payment ───
            if (($optional['type'] ?? null) === 'overage') {
                return $this->handleFlowOverageWebhook($status, $optional, $flowOrder, $amount);
            }

            // ─── Regular subscription payment ───
            // Find subscription by commerce_order stored in payment_info
            $subscription = null;

            if ($commerceOrder) {
                $subscription = Subscription::where('flow_customer_id', $commerceOrder)->first();
            }

            // Fallback: find by company_id from optional data
            if (!$subscription && !empty($optional['company_id'])) {
                $subscription = Subscription::where('company_id', $optional['company_id'])
                    ->where('status', 'suspended')
                    ->latest()
                    ->first();
            }

            if (!$subscription) {
                Log::warning('Flow webhook: subscription not found', compact('commerceOrder', 'flowOrder', 'optional'));
                return response()->json(['received' => true], 200);
            }

            $billingCycle = $subscription->billing_cycle ?? 'monthly';

            if ($status === 2) {
                // Payment successful → activate subscription
                $subscription->update([
                    'status'               => 'active',
                    'flow_subscription_id' => $flowOrder,
                    'starts_at'            => now(),
                    'ends_at'              => $billingCycle === 'annual' ? now()->addYear() : now()->addMonth(),
                    'payment_info'         => array_merge($subscription->payment_info ?? [], [
                        'last_payment_date' => now()->toISOString(),
                        'flow_status'       => $status,
                        'flow_order'        => $flowOrder,
                        'amount_paid'       => $amount,
                    ]),
                ]);
                Log::info('Flow payment confirmed - subscription activated', [
                    'subscription_id' => $subscription->id,
                    'flow_order'      => $flowOrder,
                    'amount'          => $amount,
                ]);

            } elseif ($status === 3 || $status === 4) {
                // Payment rejected or cancelled
                $subscription->update([
                    'status'       => 'cancelled',
                    'payment_info' => array_merge($subscription->payment_info ?? [], [
                        'last_failed_date' => now()->toISOString(),
                        'flow_status'      => $status,
                    ]),
                ]);
                Log::warning('Flow payment failed/cancelled', [
                    'subscription_id' => $subscription->id,
                    'status'          => $status,
                ]);
            }

            return response()->json(['received' => true], 200);

        } catch (\Exception $e) {
            Log::error('Flow webhook error', ['token' => $token, 'error' => $e->getMessage()]);
            return response()->json(['received' => true], 200);
        }
    }

    /* ═══════════════════════════════════════════
       POST /api/subscription/checkout-dlocal
       Explicit dLocal checkout (kept for backward compatibility)
       Now redirects to the unified checkout with gateway=dlocal
       ═══════════════════════════════════════════ */

    public function checkoutDlocal(Request $request): JsonResponse
    {
        // Merge gateway=dlocal and delegate to unified checkout
        $request->merge(['gateway' => 'dlocal']);
        return $this->checkout($request);
    }

    /* ═══════════════════════════════════════════
       POST /api/webhooks/dlocal
       Handle dLocal payment notification webhook
       ═══════════════════════════════════════════ */

    public function webhookDlocal(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('X-Signature', '');

        // Verify signature if secret is configured
        if ($this->dlocal->isConfigured() && $signature) {
            if (!$this->dlocal->verifyWebhookSignature($payload, $signature)) {
                Log::warning('dLocal webhook: invalid signature');
                return response()->json(['received' => true], 200);
            }
        }

        $data = $request->all();
        Log::info('dLocal webhook received', ['data' => $data]);

        $paymentId = $data['id'] ?? $data['payment_id'] ?? null;
        $status = $data['status'] ?? null;
        $metadata = $data['metadata'] ?? [];

        if (!$paymentId || !$status) {
            return response()->json(['received' => true], 200);
        }

        // Handle overage payments
        if (($metadata['type'] ?? null) === 'overage') {
            return $this->handleDlocalOverageWebhook($status, $metadata, $paymentId);
        }

        // Handle subscription payments
        $companyId = $metadata['company_id'] ?? null;
        $subscription = null;

        if ($paymentId) {
            $subscription = Subscription::where('dlocal_payment_id', $paymentId)->first();
        }

        if (!$subscription && $companyId) {
            $subscription = Subscription::where('company_id', $companyId)
                ->where('status', 'suspended')
                ->latest()
                ->first();
        }

        if (!$subscription) {
            Log::warning('dLocal webhook: subscription not found', compact('paymentId', 'metadata'));
            return response()->json(['received' => true], 200);
        }

        $internalStatus = $this->dlocal->mapStatus($status);
        $billingCycle = $subscription->billing_cycle ?? 'monthly';

        if ($internalStatus === 'active') {
            // Extract card_id if present (from Smart Fields payments)
            $cardId = $data['card']['card_id'] ?? ($metadata['dlocal_card_id'] ?? null);
            $existingPaymentInfo = $subscription->payment_info ?? [];

            // Preserve existing card_id if we already have one
            if (!$cardId && !empty($existingPaymentInfo['dlocal_card_id'])) {
                $cardId = $existingPaymentInfo['dlocal_card_id'];
            }

            $updateData = [
                'status'            => 'active',
                'dlocal_payment_id' => $paymentId,
                'starts_at'         => now(),
                'ends_at'           => $billingCycle === 'annual' ? now()->addYear() : now()->addMonth(),
                'payment_info'      => array_merge($existingPaymentInfo, [
                    'last_payment_date' => now()->toISOString(),
                    'dlocal_status'     => $status,
                    'dlocal_payment_id' => $paymentId,
                    'renewal_attempts'  => 0, // Reset on successful payment
                ]),
            ];

            // Save card_id for recurring if available
            if ($cardId) {
                $updateData['payment_info']['dlocal_card_id'] = $cardId;
                $updateData['payment_info']['recurring'] = true;
            }

            $subscription->update($updateData);

            Log::info('dLocal payment confirmed — subscription activated', [
                'subscription_id' => $subscription->id,
                'payment_id'      => $paymentId,
                'has_card_id'     => !empty($cardId),
                'recurring'       => !empty($cardId),
            ]);
        } elseif ($internalStatus === 'cancelled') {
            $subscription->update([
                'status'       => 'cancelled',
                'payment_info' => array_merge($subscription->payment_info ?? [], [
                    'last_failed_date' => now()->toISOString(),
                    'dlocal_status'    => $status,
                ]),
            ]);
            Log::warning('dLocal payment failed/cancelled', [
                'subscription_id' => $subscription->id,
                'status'          => $status,
            ]);
        }

        return response()->json(['received' => true], 200);
    }

    /**
     * Handle dLocal webhook for overage payments.
     */
    private function handleDlocalOverageWebhook(string $status, array $metadata, string $paymentId): JsonResponse
    {
        $internalStatus = $this->dlocal->mapStatus($status);
        $companyId = $metadata['company_id'] ?? null;

        if ($internalStatus === 'active' && $companyId) {
            Log::info('dLocal overage payment confirmed', [
                'company_id' => $companyId,
                'payment_id' => $paymentId,
                'period'     => $metadata['period'] ?? 'unknown',
                'packs'      => $metadata['packs'] ?? 0,
            ]);
        } else {
            Log::warning('dLocal overage payment failed', [
                'company_id' => $companyId,
                'status'     => $status,
            ]);
        }

        return response()->json(['received' => true], 200);
    }

    /* ═══════════════════════════════════════════
       GET /api/subscription/overage
       Get current overage stats for the company
       ═══════════════════════════════════════════ */

    public function overageStats(Request $request): JsonResponse
    {
        $user = Auth::user();
        $company = Company::where('slug', $user->company_slug)->first();

        if (!$company) {
            return response()->json([
                'overage_enabled' => false,
                'overage_messages' => 0,
                'overage_cost_clp' => 0,
            ]);
        }

        return response()->json($this->overage->getOverageStats($company->id));
    }

    /* ═══════════════════════════════════════════
       POST /api/subscription/purchase-overage
       Manually purchase an overage pack
       ═══════════════════════════════════════════ */

    public function purchaseOverage(Request $request): JsonResponse
    {
        $request->validate([
            'packs' => 'required|integer|min:1|max:10',
        ]);

        $user    = Auth::user();
        $company = Company::where('slug', $user->company_slug)->first();

        if (!$company) {
            return response()->json(['message' => 'No se encontró la empresa'], 404);
        }

        $subscription = Subscription::where('company_id', $company->id)
            ->where('status', 'active')
            ->first();

        if (!$subscription) {
            return response()->json(['message' => 'Necesitas un plan activo.'], 422);
        }

        $packs = (int) $request->packs;
        $pricePerPack = $this->overage->pricePerPack();
        $totalAmount = $packs * $pricePerPack;
        $totalMessages = $packs * 1000;

        $orderId = "withmia-overage-{$company->id}-{$packs}pk-" . time();
        $description = "WITHMIA — {$packs} pack(s) de 1.000 mensajes IA extra";

        try {
            $baseUrl = config('app.url');
            $returnUrl = $baseUrl . str_replace('{slug}', $company->slug, config('billing.flow.return_url'));

            // Prefer dLocal if the subscription uses it, else Flow.cl
            if ($subscription->dlocal_payment_id && $this->dlocal->isConfigured()) {
                $notificationUrl = $baseUrl . '/api/webhooks/dlocal';
                $result = $this->dlocal->createPayment(
                    $orderId,
                    $description,
                    (float) $totalAmount,
                    config('billing.currency', 'CLP'),
                    $user->email,
                    $returnUrl,
                    $returnUrl,
                    $notificationUrl,
                    [
                        'type'       => 'overage',
                        'company_id' => $company->id,
                        'packs'      => $packs,
                        'messages'   => $totalMessages,
                        'period'     => now()->format('Y-m'),
                    ]
                );

                return response()->json([
                    'checkout_url' => $result['checkout_url'] ?? null,
                    'amount'       => $totalAmount,
                    'packs'        => $packs,
                    'messages'     => $totalMessages,
                    'gateway'      => 'dlocal',
                ]);
            }

            // Flow.cl
            if (!$this->flow->isConfigured()) {
                return response()->json(['message' => 'Sistema de pagos no configurado.'], 500);
            }

            $confirmUrl = $baseUrl . config('billing.flow.webhook_url');
            $result = $this->flow->createPayment(
                $orderId,
                $description,
                $totalAmount,
                $user->email,
                $confirmUrl,
                $returnUrl,
                [
                    'type'       => 'overage',
                    'company_id' => $company->id,
                    'packs'      => $packs,
                    'messages'   => $totalMessages,
                    'period'     => now()->format('Y-m'),
                ]
            );

            $redirectUrl = null;
            if (!empty($result['url']) && !empty($result['token'])) {
                $redirectUrl = $result['url'] . '?token=' . $result['token'];
            }

            return response()->json([
                'checkout_url' => $redirectUrl,
                'amount'       => $totalAmount,
                'packs'        => $packs,
                'messages'     => $totalMessages,
                'gateway'      => 'flow',
            ]);

        } catch (\Exception $e) {
            Log::error('Overage purchase error', [
                'company_id' => $company->id,
                'packs'      => $packs,
                'error'      => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Error al procesar el pago.'], 500);
        }
    }

    /* ═══════════════════════════════════════════
       GET /api/subscription/gateways
       Available payment gateways (auto-detected by IP)
       ═══════════════════════════════════════════ */

    public function gateways(Request $request): JsonResponse
    {
        $geo = $this->currency->detectCountry($request->ip());
        $recommended = $this->currency->gatewayForCountry($geo['country_code']);

        return response()->json([
            'gateways' => [
                [
                    'id'          => 'flow',
                    'name'        => 'Flow.cl',
                    'available'   => $this->flow->isConfigured(),
                    'currencies'  => ['CLP'],
                    'countries'   => ['CL'],
                    'description' => 'Tarjeta de crédito/débito, transferencia bancaria (Chile)',
                ],
                [
                    'id'          => 'dlocal',
                    'name'        => 'dLocal',
                    'available'   => $this->dlocal->isConfigured(),
                    'currencies'  => config('billing.dlocal.supported_currencies', ['CLP', 'BRL', 'MXN', 'ARS', 'COP', 'PEN', 'UYU', 'USD']),
                    'countries'   => ['CL', 'BR', 'MX', 'AR', 'CO', 'PE', 'UY', 'PY', 'BO', 'CR', 'GT', 'HN', 'NI', 'DO', 'US'],
                    'description' => 'Pagos internacionales LATAM (tarjeta, transferencia, PIX, OXXO, etc.)',
                ],
            ],
            'recommended' => $recommended,
            'detected'    => [
                'country_code'  => $geo['country_code'],
                'country_name'  => $geo['country_name'],
                'currency'      => $geo['currency'],
                'currency_name' => $this->currency->currencyName($geo['currency']),
                'gateway'       => $recommended,
            ],
        ]);
    }

    /* ═══════════════════════════════════════════
       GET /api/subscription/smart-fields-config
       Returns dLocal Smart Fields SDK config for frontend
       ═══════════════════════════════════════════ */

    public function smartFieldsConfig(Request $request): JsonResponse
    {
        if (!$this->dlocal->isSmartFieldsConfigured()) {
            return response()->json([
                'available' => false,
                'message'   => 'Smart Fields no está configurado.',
            ]);
        }

        // Detect country from IP for correct SDK initialization
        $geo = $this->currency->detectCountry($request->ip());
        $config = $this->dlocal->getSmartFieldsConfig($geo['country_code']);

        return response()->json([
            'available' => true,
            ...$config,
        ]);
    }

    /* ═══════════════════════════════════════════
       POST /api/subscription/checkout-smart-fields
       Process payment with dLocal Smart Fields card token.
       Enables recurring billing by saving the card_id.
       ═══════════════════════════════════════════ */

    public function checkoutSmartFields(Request $request): JsonResponse
    {
        $request->validate([
            'card_token'    => 'required|string',
            'billing_cycle' => 'required|in:monthly,annual',
            'plan'          => 'nullable|in:pro,business,enterprise',
            'payer_name'    => 'required|string|max:255',
            'payer_document' => 'nullable|string|max:30',
        ]);

        if (!$this->dlocal->isSmartFieldsConfigured()) {
            return response()->json(['message' => 'Smart Fields no está disponible.'], 422);
        }

        $user    = Auth::user();
        $company = Company::where('slug', $user->company_slug)->first();

        if (!$company) {
            return response()->json(['message' => 'No se encontró la empresa'], 404);
        }

        // Check if already has active subscription
        $existing = Subscription::where('company_id', $company->id)
            ->where('status', 'active')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Ya tienes una suscripción activa. Cancélala primero para cambiar de plan.',
            ], 422);
        }

        $cycle = $request->billing_cycle;
        $plan  = $request->input('plan', 'pro');

        $planConfig = config("billing.plans.{$plan}");
        if (!$planConfig) {
            return response()->json(['message' => 'Plan no válido'], 422);
        }

        // ── Detect country & convert currency ──
        $geo = $this->currency->detectCountry($request->ip());
        $countryCode  = $geo['country_code'];
        $userCurrency = $geo['currency'];

        $amountCLP = $cycle === 'annual'
            ? (int) $planConfig['price_annual']
            : (int) $planConfig['price_monthly'];

        $converted = $this->currency->convertFromCLP($amountCLP, $userCurrency);
        $amount   = $converted['amount'];
        $currency = $converted['currency'];
        $rate     = $converted['rate'];

        $planLabel  = strtoupper($planConfig['name']);
        $cycleLabel = $cycle === 'annual' ? 'Anual' : 'Mensual';

        try {
            $baseUrl = config('app.url');
            $notificationUrl = $baseUrl . '/api/webhooks/dlocal';
            $orderId = "withmia-sf-{$plan}-{$company->id}-{$cycle}-" . time();

            // Build payer info with document
            $docInfo = DLocalService::COUNTRY_DOCUMENT_TYPES[$countryCode] ?? null;
            $payer = [
                'name'          => $request->payer_name,
                'email'         => $user->email,
                'document'      => $request->payer_document ?? null,
                'document_type' => $docInfo['type'] ?? null,
            ];

            // ── Charge the card via Smart Fields token ──
            $result = $this->dlocal->createPaymentWithToken(
                $request->card_token,
                $orderId,
                $amount,
                $currency,
                $countryCode,
                $payer,
                "WITHMIA {$planLabel} ({$cycleLabel})",
                $notificationUrl,
                [
                    'company_id'    => $company->id,
                    'plan'          => $plan,
                    'billing_cycle' => $cycle,
                    'country'       => $countryCode,
                    'currency'      => $currency,
                    'amount_clp'    => $amountCLP,
                    'exchange_rate' => $rate,
                    'type'          => 'smart_fields_subscription',
                ]
            );

            Log::info('dLocal Smart Fields payment created', [
                'company_id' => $company->id,
                'plan'       => $plan,
                'cycle'      => $cycle,
                'country'    => $countryCode,
                'currency'   => $currency,
                'amount'     => $amount,
                'payment_id' => $result['id'] ?? null,
                'status'     => $result['status'] ?? null,
            ]);

            $paymentStatus = strtoupper($result['status'] ?? 'PENDING');
            $cardId = $result['card']['card_id'] ?? null;
            $internalStatus = $this->dlocal->mapStatus($paymentStatus);

            // Determine subscription dates
            $startsAt = now();
            $endsAt = $cycle === 'annual' ? now()->addYear() : now()->addMonth();

            // Save subscription with card_id for recurring
            Subscription::updateOrCreate(
                ['company_id' => $company->id],
                [
                    'plan_name'            => "WITHMIA {$planLabel}",
                    'price'                => $amountCLP, // Always CLP internally
                    'billing_cycle'        => $cycle,
                    'max_agents'           => $planConfig['max_members'] ?? 1,
                    'status'               => $internalStatus === 'active' ? 'active' : 'suspended',
                    'starts_at'            => $internalStatus === 'active' ? $startsAt : null,
                    'ends_at'              => $internalStatus === 'active' ? $endsAt : null,
                    'dlocal_payment_id'    => $result['id'] ?? null,
                    'payment_info'         => [
                        'payment_method'   => 'dlocal',
                        'type'             => 'smart_fields_subscription',
                        'recurring'        => true,
                        'plan'             => $plan,
                        'cycle'            => $cycle,
                        'order_id'         => $orderId,
                        'country'          => $countryCode,
                        'currency'         => $currency,
                        'amount_local'     => $amount,
                        'amount_clp'       => $amountCLP,
                        'exchange_rate'    => $rate,
                        'dlocal_card_id'   => $cardId,
                        'dlocal_status'    => $paymentStatus,
                        'payer_name'       => $request->payer_name,
                        'payer_email'      => $user->email,
                        'last_payment_date' => now()->toISOString(),
                        'renewal_attempts' => 0,
                    ],
                ]
            );

            // If payment was immediately approved
            if ($internalStatus === 'active') {
                return response()->json([
                    'success'    => true,
                    'status'     => 'active',
                    'message'    => 'Suscripción activada exitosamente con renovación automática.',
                    'gateway'    => 'dlocal_smart_fields',
                    'recurring'  => true,
                    'payment_id' => $result['id'] ?? null,
                    'currency'   => $currency,
                    'amount'     => $amount,
                    'next_renewal' => $endsAt->toDateString(),
                ]);
            }

            // If pending (3DS or async processing)
            if (!empty($result['three_dsecure']['redirect_url'])) {
                return response()->json([
                    'success'      => true,
                    'status'       => 'pending_3ds',
                    'redirect_url' => $result['three_dsecure']['redirect_url'],
                    'message'      => 'Redirigiendo para verificación 3D Secure...',
                    'payment_id'   => $result['id'] ?? null,
                ]);
            }

            return response()->json([
                'success'    => true,
                'status'     => 'pending',
                'message'    => 'Pago en proceso. Te notificaremos cuando se confirme.',
                'payment_id' => $result['id'] ?? null,
            ]);

        } catch (\Exception $e) {
            Log::error('dLocal Smart Fields checkout error', [
                'company_id' => $company->id,
                'plan'       => $plan,
                'cycle'      => $cycle,
                'country'    => $countryCode,
                'error'      => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al procesar el pago con tarjeta. Verifica los datos e intenta nuevamente.',
            ], 500);
        }
    }

    /* ═══════════════════════════════════════════
       GET /api/subscription/detect-location
       Detect user country from IP → currency, gateway
       ═══════════════════════════════════════════ */

    public function detectLocation(Request $request): JsonResponse
    {
        $geo = $this->currency->detectCountry($request->ip());
        $gateway = $this->currency->gatewayForCountry($geo['country_code']);

        // Get localized pricing for all plans
        $localPricing = null;
        if ($geo['currency'] !== 'CLP') {
            $localPricing = $this->currency->getAllPlanPricings($geo['currency']);
        }

        // Check if Smart Fields is available for recurring payments
        $smartFieldsAvailable = $this->dlocal->isSmartFieldsConfigured() && $gateway === 'dlocal';

        return response()->json([
            'country_code'  => $geo['country_code'],
            'country_name'  => $geo['country_name'],
            'currency'      => $geo['currency'],
            'currency_name' => $this->currency->currencyName($geo['currency']),
            'gateway'       => $gateway,
            'is_chile'      => $geo['country_code'] === 'CL',
            'local_pricing' => $localPricing,
            'smart_fields'  => $smartFieldsAvailable,
            'document_required' => DLocalService::COUNTRY_DOCUMENT_TYPES[$geo['country_code']] ?? null,
        ]);
    }

    /* ═══════════════════════════════════════════
       Handle member addon webhook
       Creates the team invitation after payment
       ═══════════════════════════════════════════ */

    private function handleMemberAddonWebhook(int $status, array $optional, ?string $flowOrder, $amount): JsonResponse
    {
        $companyId  = $optional['company_id'] ?? null;
        $invitedBy  = $optional['invited_by'] ?? null;
        $email      = $optional['invite_email'] ?? null;
        $name       = $optional['invite_name'] ?? null;
        $role       = $optional['invite_role'] ?? 'agent';
        $teamId     = $optional['invite_team'] ?? null;

        if ($status === 2 && $companyId && $email) {
            // Payment successful → create invitation
            try {
                $invitation = TeamInvitation::create([
                    'company_id' => $companyId,
                    'invited_by' => $invitedBy,
                    'email'      => strtolower($email),
                    'name'       => $name,
                    'role'       => $role,
                    'team_id'    => $teamId,
                    'token'      => TeamInvitation::generateToken(),
                    'status'     => 'pending',
                    'expires_at' => now()->addDays(7),
                ]);

                // Send invitation email
                try {
                    Mail::to($email)->send(new TeamInvitationMail($invitation));
                } catch (\Exception $e) {
                    Log::error('Failed to send invitation email after member payment', [
                        'error' => $e->getMessage(),
                        'email' => $email,
                    ]);
                }

                // Update subscription max_agents
                $subscription = Subscription::where('company_id', $companyId)
                    ->where('status', 'active')
                    ->first();

                if ($subscription) {
                    $subscription->increment('max_agents');
                }

                Log::info('Member addon payment confirmed → invitation created', [
                    'company_id'    => $companyId,
                    'email'         => $email,
                    'invitation_id' => $invitation->id,
                    'flow_order'    => $flowOrder,
                    'amount'        => $amount,
                ]);

            } catch (\Exception $e) {
                Log::error('Failed to create invitation after member payment', [
                    'error'      => $e->getMessage(),
                    'company_id' => $companyId,
                    'email'      => $email,
                ]);
            }
        } elseif ($status === 3 || $status === 4) {
            Log::warning('Member addon payment failed/cancelled', [
                'company_id' => $companyId,
                'email'      => $email,
                'status'     => $status,
            ]);
        }

        return response()->json(['received' => true], 200);
    }

    /**
     * Handle Flow.cl webhook for overage payments.
     */
    private function handleFlowOverageWebhook(int $status, array $optional, ?string $flowOrder, $amount): JsonResponse
    {
        $companyId = $optional['company_id'] ?? null;

        if ($status === 2 && $companyId) {
            // Overage payment confirmed — increase the company's message limit for this period
            $packs = (int) ($optional['packs'] ?? 1);
            $extraMessages = $packs * 1000;

            $usage = \App\Models\AiUsage::currentForCompany($companyId);
            $usage->increment('messages_limit', $extraMessages);

            Log::info('Overage payment confirmed via Flow — limit increased', [
                'company_id'     => $companyId,
                'packs'          => $packs,
                'extra_messages' => $extraMessages,
                'new_limit'      => $usage->fresh()->messages_limit,
                'flow_order'     => $flowOrder,
                'amount'         => $amount,
            ]);
        } elseif ($status === 3 || $status === 4) {
            Log::warning('Overage payment failed/cancelled via Flow', [
                'company_id' => $companyId,
                'status'     => $status,
            ]);
        }

        return response()->json(['received' => true], 200);
    }

    /* ═══════════════════════════════════════════
       POST /api/webhooks/flow-subscription
       Handle Flow.cl SUBSCRIPTION confirmation webhook.
       This is called by Flow when:
        - A new subscription is created (first payment)
        - A recurring subscription payment is processed
        - A subscription is cancelled or suspended
       ═══════════════════════════════════════════ */

    public function webhookSubscription(Request $request): JsonResponse
    {
        $token = $request->input('token');

        if (!$token) {
            Log::warning('Flow subscription webhook: no token received', ['all' => $request->all()]);
            return response()->json(['received' => true], 200);
        }

        try {
            // Flow sends a token — we query the payment status to get details
            $data = $this->flow->getPaymentStatus($token);

            Log::info('Flow subscription webhook received', ['data' => $data]);

            $status        = (int) ($data['status'] ?? 0);
            $flowOrder     = $data['flowOrder'] ?? null;
            $amount        = $data['amount'] ?? null;
            $payerEmail    = $data['payer'] ?? null;

            // Try to find the subscription by flow_customer_id (Flow's customer ID)
            // or by flow_subscription_id
            $subscription = null;

            // First: try by subscriptionId from response
            $subscriptionId = $data['subscriptionId'] ?? null;
            if ($subscriptionId) {
                $subscription = Subscription::where('flow_subscription_id', $subscriptionId)->first();
            }

            // Fallback: try by flow_customer_id (the Flow customer ID we stored)
            if (!$subscription) {
                $customerId = $data['customerId'] ?? null;
                if ($customerId) {
                    $subscription = Subscription::where('flow_customer_id', $customerId)
                        ->latest()
                        ->first();
                }
            }

            // Fallback: find suspended subscription for the payer's email
            if (!$subscription && $payerEmail) {
                $user = User::where('email', $payerEmail)->first();
                if ($user) {
                    $company = Company::where('slug', $user->company_slug)->first();
                    if ($company) {
                        $subscription = Subscription::where('company_id', $company->id)
                            ->whereIn('status', ['suspended', 'active'])
                            ->latest()
                            ->first();
                    }
                }
            }

            if (!$subscription) {
                Log::warning('Flow subscription webhook: subscription not found', [
                    'token'          => $token,
                    'subscriptionId' => $subscriptionId,
                    'flowOrder'      => $flowOrder,
                ]);
                return response()->json(['received' => true], 200);
            }

            $billingCycle = $subscription->billing_cycle ?? 'monthly';

            if ($status === 2) {
                // Payment successful
                $isFirstPayment = $subscription->status === 'suspended';

                $subscription->update([
                    'status'               => 'active',
                    'flow_subscription_id' => $subscriptionId ?? $subscription->flow_subscription_id,
                    'starts_at'            => $isFirstPayment ? now() : $subscription->starts_at,
                    'ends_at'              => $billingCycle === 'annual' ? now()->addYear() : now()->addMonth(),
                    'payment_info'         => array_merge($subscription->payment_info ?? [], [
                        'last_payment_date'     => now()->toISOString(),
                        'flow_status'           => $status,
                        'flow_order'            => $flowOrder,
                        'flow_subscription_id'  => $subscriptionId,
                        'amount_paid'           => $amount,
                        'payments_count'        => ($subscription->payment_info['payments_count'] ?? 0) + 1,
                    ]),
                ]);

                Log::info('Flow subscription payment confirmed', [
                    'subscription_id' => $subscription->id,
                    'is_first'        => $isFirstPayment,
                    'flow_order'      => $flowOrder,
                    'amount'          => $amount,
                    'next_ends_at'    => $subscription->fresh()->ends_at,
                ]);

            } elseif ($status === 3 || $status === 4) {
                // Payment rejected or cancelled
                $wasActive = $subscription->status === 'active';

                $subscription->update([
                    'status'       => $wasActive ? 'past_due' : 'cancelled',
                    'payment_info' => array_merge($subscription->payment_info ?? [], [
                        'last_failed_date' => now()->toISOString(),
                        'flow_status'      => $status,
                    ]),
                ]);

                Log::warning('Flow subscription payment failed/cancelled', [
                    'subscription_id' => $subscription->id,
                    'was_active'      => $wasActive,
                    'status'          => $status,
                ]);
            }

            return response()->json(['received' => true], 200);

        } catch (\Exception $e) {
            Log::error('Flow subscription webhook error', [
                'token' => $token,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['received' => true], 200);
        }
    }
}
