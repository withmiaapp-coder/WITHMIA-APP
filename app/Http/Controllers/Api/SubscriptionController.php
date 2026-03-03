<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\TeamInvitationMail;
use App\Models\Subscription;
use App\Models\Company;
use App\Models\TeamInvitation;
use App\Models\User;
use App\Services\FlowService;
use App\Services\ChatwootService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SubscriptionController extends Controller
{
    private FlowService $flow;

    public function __construct(FlowService $flow)
    {
        $this->flow = $flow;
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

        $billingCycle = $subscription->billing_cycle ?? 'monthly';
        $basePrice    = $billingCycle === 'annual' ? config('billing.base_price_annual') : config('billing.base_price_monthly');
        $perMember    = $billingCycle === 'annual' ? config('billing.per_member_annual') : config('billing.per_member_monthly');
        $additional   = max(0, $teamCount - 1);
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
            'plan'        => 'pro',
            'currency'    => 'CLP',
            'base_price'  => $basePrice,
            'per_member'  => $perMember,
            'total_price' => $totalPrice,
            'is_active'   => true,
        ]);
    }

    /* ═══════════════════════════════════════════
       POST /api/subscription/checkout
       Create Flow.cl subscription → redirect URL
       ═══════════════════════════════════════════ */

    public function checkout(Request $request): JsonResponse
    {
        $request->validate([
            'billing_cycle' => 'required|in:monthly,annual',
        ]);

        $user    = Auth::user();
        $company = Company::where('slug', $user->company_slug)->first();

        if (!$company) {
            return response()->json(['message' => 'No se encontró la empresa'], 404);
        }

        // Validate Flow.cl is configured
        if (!$this->flow->isConfigured()) {
            Log::error('Flow.cl API not configured – missing FLOW_API_KEY or FLOW_SECRET_KEY env vars');
            return response()->json(['message' => 'El sistema de pagos no está configurado. Contacta soporte.'], 500);
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

        $cycle  = $request->billing_cycle;
        $planId = $cycle === 'annual'
            ? config('billing.flow.plan_annual_id')
            : config('billing.flow.plan_monthly_id');

        try {
            // 1. Build URLs
            $baseUrl    = config('app.url');
            $returnUrl  = $baseUrl . str_replace('{slug}', $company->slug, config('billing.flow.return_url'));
            $confirmUrl = $baseUrl . config('billing.flow.webhook_url');

            // 2. Calculate price
            $amount = $cycle === 'annual'
                ? (int) config('billing.base_price_annual')
                : (int) config('billing.base_price_monthly');

            // 3. Generate unique commerce order ID
            $commerceOrder = "withmia-{$company->id}-{$cycle}-" . time();

            // 4. Create payment order in Flow (this returns url + token for redirect)
            $paymentResult = $this->flow->createPayment(
                $commerceOrder,
                'WITHMIA Pro ' . ($cycle === 'annual' ? 'Anual' : 'Mensual'),
                $amount,
                $user->email,
                $confirmUrl,
                $returnUrl,
                [
                    'company_id'    => $company->id,
                    'plan_id'       => $planId,
                    'billing_cycle' => $cycle,
                ]
            );

            Log::info('Flow createPayment response', ['result' => $paymentResult]);

            // 5. Build redirect URL
            $redirectUrl = null;
            if (!empty($paymentResult['url']) && !empty($paymentResult['token'])) {
                $redirectUrl = $paymentResult['url'] . '?token=' . $paymentResult['token'];
            }

            if (!$redirectUrl) {
                Log::error('Flow payment: no redirect URL', ['result' => $paymentResult]);
                return response()->json([
                    'message' => 'No se obtuvo URL de pago de Flow. Contacta soporte.',
                ], 500);
            }

            // 6. Save pending subscription locally
            Subscription::updateOrCreate(
                ['company_id' => $company->id],
                [
                    'plan_name'            => 'WITHMIA Pro',
                    'price'                => $amount,
                    'billing_cycle'        => $cycle,
                    'max_agents'           => $company->users()->count(),
                    'status'               => 'suspended',   // pending payment — webhook will set 'active'
                    'starts_at'            => now(),
                    'flow_subscription_id' => $paymentResult['flowOrder'] ?? null,
                    'flow_customer_id'     => $commerceOrder,
                    'payment_info'         => [
                        'payment_method' => 'flow',
                        'plan_id'        => $planId,
                        'cycle'          => $cycle,
                        'commerce_order' => $commerceOrder,
                        'flow_token'     => $paymentResult['token'] ?? null,
                    ],
                ]
            );

            // 7. Return redirect URL for payment
            return response()->json([
                'checkout_url' => $redirectUrl,
                'token'        => $paymentResult['token'] ?? null,
            ]);

        } catch (\Exception $e) {
            Log::error('Flow checkout error', [
                'company_id' => $company->id,
                'cycle'      => $cycle,
                'error'      => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Error al iniciar el pago. Intenta nuevamente.',
            ], 500);
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
}
