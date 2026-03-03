<?php

namespace App\Services;

use App\Models\AiUsage;
use App\Models\Company;
use App\Models\Subscription;
use Illuminate\Support\Facades\Log;

/**
 * AI Overage Billing Service
 *
 * Handles soft-cap enforcement: when a company exceeds its AI message
 * limit, instead of a hard stop, we can allow additional messages
 * that are billed as overage packs ($5.990 CLP per 1.000 messages).
 *
 * Flow:
 * 1. Company reaches 100% of their plan limit
 * 2. If overage is enabled, messages continue up to overage_max
 * 3. Overage usage is tracked in ai_usages.messages_used (above messages_limit)
 * 4. At end of billing cycle (or on-demand), overage is billed via Flow.cl/dLocal
 */
class OverageService
{
    /**
     * Price per pack of 1,000 extra messages (CLP, IVA incluido).
     */
    public function pricePerPack(): int
    {
        return (int) config('billing.overage.price_per_1000', 5990);
    }

    /**
     * Check if overage billing is enabled globally.
     */
    public function isEnabled(): bool
    {
        return (bool) config('billing.overage.enabled', false);
    }

    /**
     * Maximum overage messages allowed beyond plan limit.
     * Default: 5,000 extra messages (5 packs = $29.950 CLP max overage).
     */
    public function maxOverageMessages(): int
    {
        return (int) config('billing.overage.max_extra_messages', 5000);
    }

    /**
     * Check if a company can send a message considering overage.
     *
     * Logic:
     * - If under plan limit → always allowed
     * - If over plan limit AND overage enabled → allowed up to max overage
     * - If over plan limit AND overage disabled → blocked (hard cap)
     * - If over max overage → blocked
     */
    public function canSendWithOverage(int $companyId): array
    {
        $usage = AiUsage::currentForCompany($companyId);

        $planLimit = $usage->messages_limit;
        $used = $usage->messages_used;

        // Under plan limit — always OK
        if ($used < $planLimit) {
            return [
                'allowed' => true,
                'is_overage' => false,
                'overage_messages' => 0,
                'overage_cost_clp' => 0,
            ];
        }

        // At or over plan limit — check overage policy
        if (!$this->isEnabled()) {
            return [
                'allowed' => false,
                'is_overage' => false,
                'overage_messages' => 0,
                'overage_cost_clp' => 0,
                'reason' => 'limit_reached',
            ];
        }

        $overageUsed = max(0, $used - $planLimit);
        $maxOverage = $this->maxOverageMessages();

        if ($overageUsed >= $maxOverage) {
            return [
                'allowed' => false,
                'is_overage' => true,
                'overage_messages' => $overageUsed,
                'overage_cost_clp' => $this->calculateOverageCost($overageUsed),
                'reason' => 'overage_limit_reached',
            ];
        }

        return [
            'allowed' => true,
            'is_overage' => true,
            'overage_messages' => $overageUsed,
            'overage_cost_clp' => $this->calculateOverageCost($overageUsed),
        ];
    }

    /**
     * Calculate overage cost in CLP for a given number of overage messages.
     * Charged in packs of 1,000 (rounded up).
     */
    public function calculateOverageCost(int $overageMessages): int
    {
        if ($overageMessages <= 0) {
            return 0;
        }

        $packs = (int) ceil($overageMessages / 1000);
        return $packs * $this->pricePerPack();
    }

    /**
     * Get full overage stats for a company (for API/frontend).
     */
    public function getOverageStats(int $companyId): array
    {
        $usage = AiUsage::currentForCompany($companyId);

        $planLimit = $usage->messages_limit;
        $used = $usage->messages_used;
        $overageUsed = max(0, $used - $planLimit);
        $overagePacks = $overageUsed > 0 ? (int) ceil($overageUsed / 1000) : 0;

        return [
            'overage_enabled' => $this->isEnabled(),
            'overage_messages' => $overageUsed,
            'overage_packs' => $overagePacks,
            'overage_cost_clp' => $this->calculateOverageCost($overageUsed),
            'overage_cost_formatted' => '$' . number_format($this->calculateOverageCost($overageUsed), 0, ',', '.'),
            'price_per_pack' => $this->pricePerPack(),
            'price_per_pack_formatted' => '$' . number_format($this->pricePerPack(), 0, ',', '.'),
            'max_overage_messages' => $this->maxOverageMessages(),
            'overage_remaining' => max(0, $this->maxOverageMessages() - $overageUsed),
        ];
    }

    /**
     * Generate an overage billing summary for end-of-cycle invoicing.
     * Called by a scheduled job or manually by admin.
     */
    public function generateOverageInvoice(int $companyId): ?array
    {
        if (!$this->isEnabled()) {
            return null;
        }

        $usage = AiUsage::currentForCompany($companyId);
        $overageUsed = max(0, $usage->messages_used - $usage->messages_limit);

        if ($overageUsed <= 0) {
            return null;
        }

        $company = Company::find($companyId);
        $subscription = $company?->activeSubscription;

        $cost = $this->calculateOverageCost($overageUsed);
        $packs = (int) ceil($overageUsed / 1000);

        return [
            'company_id' => $companyId,
            'company_name' => $company?->name ?? 'Unknown',
            'period' => now()->format('Y-m'),
            'plan_limit' => $usage->messages_limit,
            'total_used' => $usage->messages_used,
            'overage_messages' => $overageUsed,
            'overage_packs' => $packs,
            'amount_clp' => $cost,
            'amount_usd' => round($cost / 950, 2), // Reference conversion
            'billing_cycle' => $subscription?->billing_cycle ?? 'monthly',
            'gateway' => $subscription?->dlocal_payment_id ? 'dlocal' : 'flow',
            'subscription_id' => $subscription?->id,
        ];
    }

    /**
     * Bill overage for a company using the preferred gateway.
     * Returns the payment result or null if nothing to bill.
     */
    public function billOverage(int $companyId): ?array
    {
        $invoice = $this->generateOverageInvoice($companyId);

        if (!$invoice || $invoice['amount_clp'] <= 0) {
            return null;
        }

        $company = Company::find($companyId);
        $subscription = $company?->activeSubscription;
        $user = $company?->users()->first();

        if (!$subscription || !$user) {
            Log::warning('Cannot bill overage — no subscription or user', [
                'company_id' => $companyId,
            ]);
            return null;
        }

        $orderId = "withmia-overage-{$companyId}-" . now()->format('Ym') . '-' . time();
        $description = "WITHMIA — {$invoice['overage_packs']} pack(s) de mensajes IA extra ({$invoice['overage_messages']} msgs)";

        // Try dLocal first if configured, fall back to Flow.cl
        if ($subscription->dlocal_payment_id && app(DLocalService::class)->isConfigured()) {
            return $this->billViaDLocal($orderId, $description, $invoice, $user, $company);
        }

        return $this->billViaFlow($orderId, $description, $invoice, $user, $company);
    }

    /**
     * Create overage payment via Flow.cl.
     */
    private function billViaFlow(string $orderId, string $description, array $invoice, $user, Company $company): ?array
    {
        try {
            $flowService = app(FlowService::class);

            if (!$flowService->isConfigured()) {
                Log::error('Cannot bill overage via Flow — not configured');
                return null;
            }

            $baseUrl = config('app.url');
            $returnUrl = $baseUrl . str_replace('{slug}', $company->slug, config('billing.flow.return_url'));
            $confirmUrl = $baseUrl . config('billing.flow.webhook_url');

            $result = $flowService->createPayment(
                $orderId,
                $description,
                $invoice['amount_clp'],
                $user->email,
                $confirmUrl,
                $returnUrl,
                [
                    'type'        => 'overage',
                    'company_id'  => $company->id,
                    'period'      => $invoice['period'],
                    'packs'       => $invoice['overage_packs'],
                    'messages'    => $invoice['overage_messages'],
                ]
            );

            Log::info('Overage payment created via Flow', [
                'company_id' => $company->id,
                'amount'     => $invoice['amount_clp'],
                'order_id'   => $orderId,
            ]);

            return array_merge($invoice, [
                'gateway'      => 'flow',
                'checkout_url' => ($result['url'] ?? '') . '?token=' . ($result['token'] ?? ''),
                'order_id'     => $orderId,
            ]);

        } catch (\Exception $e) {
            Log::error('Overage Flow billing error', [
                'company_id' => $company->id,
                'error'      => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Create overage payment via dLocal.
     */
    private function billViaDLocal(string $orderId, string $description, array $invoice, $user, Company $company): ?array
    {
        try {
            $dlocal = app(DLocalService::class);

            $baseUrl = config('app.url');
            $successUrl = $baseUrl . str_replace('{slug}', $company->slug, config('billing.flow.return_url'));
            $backUrl = $successUrl;
            $notificationUrl = $baseUrl . '/api/webhooks/dlocal';

            $result = $dlocal->createPayment(
                $orderId,
                $description,
                (float) $invoice['amount_clp'],
                'CLP',
                $user->email,
                $successUrl,
                $backUrl,
                $notificationUrl,
                [
                    'type'       => 'overage',
                    'company_id' => $company->id,
                    'period'     => $invoice['period'],
                    'packs'      => $invoice['overage_packs'],
                    'messages'   => $invoice['overage_messages'],
                ]
            );

            Log::info('Overage payment created via dLocal', [
                'company_id' => $company->id,
                'amount'     => $invoice['amount_clp'],
                'order_id'   => $orderId,
            ]);

            return array_merge($invoice, [
                'gateway'      => 'dlocal',
                'checkout_url' => $result['checkout_url'] ?? null,
                'payment_id'   => $result['id'] ?? null,
                'order_id'     => $orderId,
            ]);

        } catch (\Exception $e) {
            Log::error('Overage dLocal billing error', [
                'company_id' => $company->id,
                'error'      => $e->getMessage(),
            ]);
            return null;
        }
    }
}
