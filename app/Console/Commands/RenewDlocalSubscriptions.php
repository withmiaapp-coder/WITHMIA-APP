<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Models\Company;
use App\Models\User;
use App\Services\CurrencyService;
use App\Services\DLocalService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Automatic renewal of dLocal Smart Fields subscriptions.
 *
 * Runs daily via scheduler. Finds subscriptions that:
 * - Use dLocal (payment_method = 'dlocal')
 * - Have a saved card (dlocal_card_id in payment_info)
 * - Are expiring today or already expired (within grace period)
 * - Are still active or past_due
 *
 * For each eligible subscription:
 * 1. Convert CLP price to local currency at current exchange rate
 * 2. Charge the saved card via dLocal Full API
 * 3. On success: extend ends_at by 1 month/year
 * 4. On failure: retry according to policy, eventually suspend
 *
 * @see config('billing.dlocal.renewal')
 */
class RenewDlocalSubscriptions extends Command
{
    protected $signature = 'subscriptions:renew-dlocal
                            {--dry-run : Preview what would be renewed without charging}
                            {--force : Force renewal even if not yet expired}';

    protected $description = 'Auto-renew dLocal Smart Fields subscriptions with saved cards';

    private CurrencyService $currency;
    private DLocalService $dlocal;

    public function handle(CurrencyService $currency, DLocalService $dlocal): int
    {
        $this->currency = $currency;
        $this->dlocal = $dlocal;

        if (!$this->dlocal->isSmartFieldsConfigured()) {
            $this->warn('dLocal Smart Fields not configured — skipping renewal.');
            return self::SUCCESS;
        }

        if (!config('billing.dlocal.renewal.enabled', true)) {
            $this->info('dLocal renewal is disabled.');
            return self::SUCCESS;
        }

        $isDryRun = $this->option('dry-run');
        $isForce  = $this->option('force');

        $graceDays = config('billing.dlocal.renewal.grace_period_days', 3);

        // Query subscriptions eligible for renewal
        $query = Subscription::query()
            ->whereIn('status', ['active', 'past_due'])
            ->whereNotNull('payment_info')
            ->whereJsonContains('payment_info->payment_method', 'dlocal')
            ->whereJsonContains('payment_info->recurring', true);

        if (!$isForce) {
            // Only renew if ends_at is today or in the past (within grace period)
            $query->where('ends_at', '<=', now()->addDay()); // Starting tomorrow = today is the last day
        }

        $subscriptions = $query->get();

        if ($subscriptions->isEmpty()) {
            $this->info('No subscriptions to renew.');
            return self::SUCCESS;
        }

        $this->info("Found {$subscriptions->count()} subscription(s) to renew.");

        $renewed  = 0;
        $failed   = 0;
        $skipped  = 0;

        foreach ($subscriptions as $subscription) {
            $info = $subscription->payment_info ?? [];
            $cardId = $info['dlocal_card_id'] ?? null;

            if (!$cardId) {
                $this->warn("  #{$subscription->id} — No card_id saved. Skipping.");
                $skipped++;
                continue;
            }

            // Check retry policy
            $attempts = (int) ($info['renewal_attempts'] ?? 0);
            $retryDays = config('billing.dlocal.renewal.retry_days', [0, 1, 3, 7]);
            $maxAttempts = count($retryDays);

            if ($attempts >= $maxAttempts && !$isForce) {
                // Exceeded retry policy → suspend
                $this->suspendSubscription($subscription, "Max renewal attempts ({$maxAttempts}) exceeded");
                $failed++;
                continue;
            }

            // Check if enough days have passed since last attempt
            $lastAttemptDate = isset($info['last_renewal_attempt']) ? \Carbon\Carbon::parse($info['last_renewal_attempt']) : null;
            if ($lastAttemptDate && $attempts < $maxAttempts && !$isForce) {
                $nextRetryDay = $retryDays[$attempts] ?? end($retryDays);
                $nextRetryDate = $lastAttemptDate->copy()->addDays($nextRetryDay);
                if (now()->lt($nextRetryDate)) {
                    $this->info("  #{$subscription->id} — Next retry on {$nextRetryDate->toDateString()}. Skipping.");
                    $skipped++;
                    continue;
                }
            }

            $company = Company::find($subscription->company_id);
            if (!$company) {
                $this->warn("  #{$subscription->id} — Company not found. Skipping.");
                $skipped++;
                continue;
            }

            $plan = $info['plan'] ?? 'pro';
            $cycle = $subscription->billing_cycle ?? 'monthly';
            $countryCode = $info['country'] ?? 'US';
            $userCurrency = $info['currency'] ?? 'USD';

            // Convert CLP price to local currency at current rates
            $planConfig = config("billing.plans.{$plan}");
            if (!$planConfig) {
                $this->warn("  #{$subscription->id} — Plan '{$plan}' not found in config. Skipping.");
                $skipped++;
                continue;
            }

            $amountCLP = $cycle === 'annual'
                ? (int) $planConfig['price_annual']
                : (int) $planConfig['price_monthly'];

            $converted = $this->currency->convertFromCLP($amountCLP, $userCurrency);
            $amount = $converted['amount'];
            $rate = $converted['rate'];

            $this->info("  #{$subscription->id} — {$company->name} — {$plan}/{$cycle} — {$userCurrency} {$amount} (CLP {$amountCLP})");

            if ($isDryRun) {
                $this->info("    [DRY RUN] Would charge card {$cardId}");
                $renewed++;
                continue;
            }

            // ── Charge the saved card ──
            try {
                $orderId = "renewal-{$plan}-{$subscription->company_id}-{$cycle}-" . time();
                $notificationUrl = config('app.url') . '/api/webhooks/dlocal';

                // Resolve payer info
                $user = User::where('company_slug', $company->slug)->first();
                $payerName = $info['payer_name'] ?? $user?->name ?? $company->name;
                $payerEmail = $info['payer_email'] ?? $user?->email ?? '';

                $result = $this->dlocal->chargeWithCardId(
                    $cardId,
                    $orderId,
                    $amount,
                    $userCurrency,
                    $countryCode,
                    ['name' => $payerName, 'email' => $payerEmail],
                    $notificationUrl,
                    [
                        'company_id'    => $subscription->company_id,
                        'plan'          => $plan,
                        'billing_cycle' => $cycle,
                        'type'          => 'renewal',
                        'country'       => $countryCode,
                        'currency'      => $userCurrency,
                        'amount_clp'    => $amountCLP,
                        'exchange_rate' => $rate,
                    ]
                );

                $paymentStatus = strtoupper($result['status'] ?? 'PENDING');
                $internalStatus = $this->dlocal->mapStatus($paymentStatus);
                $newCardId = $result['card']['card_id'] ?? $cardId;

                if ($internalStatus === 'active') {
                    // Successful renewal
                    $newEndsAt = $cycle === 'annual'
                        ? ($subscription->ends_at ?? now())->copy()->addYear()
                        : ($subscription->ends_at ?? now())->copy()->addMonth();

                    $subscription->update([
                        'status'            => 'active',
                        'ends_at'           => $newEndsAt,
                        'dlocal_payment_id' => $result['id'] ?? $subscription->dlocal_payment_id,
                        'payment_info'      => array_merge($info, [
                            'last_payment_date'     => now()->toISOString(),
                            'last_renewal_status'   => 'success',
                            'last_renewal_amount'   => $amount,
                            'last_renewal_currency' => $userCurrency,
                            'exchange_rate'         => $rate,
                            'renewal_attempts'      => 0,
                            'dlocal_card_id'        => $newCardId,
                            'dlocal_status'         => $paymentStatus,
                            'dlocal_payment_id'     => $result['id'] ?? null,
                        ]),
                    ]);

                    $this->info("    ✓ Renewed until {$newEndsAt->toDateString()}");
                    $renewed++;

                    Log::info('dLocal subscription renewed', [
                        'subscription_id' => $subscription->id,
                        'company_id'      => $subscription->company_id,
                        'amount'          => $amount,
                        'currency'        => $userCurrency,
                        'next_ends_at'    => $newEndsAt->toISOString(),
                    ]);
                } else {
                    // Payment failed or pending
                    $subscription->update([
                        'status'       => $attempts + 1 >= $maxAttempts ? 'suspended' : 'past_due',
                        'payment_info' => array_merge($info, [
                            'last_renewal_attempt' => now()->toISOString(),
                            'last_renewal_status'  => 'failed',
                            'renewal_attempts'     => $attempts + 1,
                            'dlocal_status'        => $paymentStatus,
                        ]),
                    ]);

                    $this->error("    ✗ Payment {$paymentStatus} — attempt " . ($attempts + 1) . "/{$maxAttempts}");
                    $failed++;

                    Log::warning('dLocal subscription renewal failed', [
                        'subscription_id' => $subscription->id,
                        'company_id'      => $subscription->company_id,
                        'status'          => $paymentStatus,
                        'attempt'         => $attempts + 1,
                    ]);
                }

            } catch (\Exception $e) {
                $subscription->update([
                    'payment_info' => array_merge($info, [
                        'last_renewal_attempt' => now()->toISOString(),
                        'last_renewal_status'  => 'error',
                        'last_renewal_error'   => $e->getMessage(),
                        'renewal_attempts'     => $attempts + 1,
                    ]),
                ]);

                $this->error("    ✗ Error: {$e->getMessage()}");
                $failed++;

                Log::error('dLocal subscription renewal error', [
                    'subscription_id' => $subscription->id,
                    'error'           => $e->getMessage(),
                ]);
            }
        }

        $this->info("\nRenewal complete: {$renewed} renewed, {$failed} failed, {$skipped} skipped.");

        return self::SUCCESS;
    }

    /**
     * Suspend a subscription and log the reason.
     */
    private function suspendSubscription(Subscription $subscription, string $reason): void
    {
        $info = $subscription->payment_info ?? [];

        $subscription->update([
            'status'       => 'suspended',
            'payment_info' => array_merge($info, [
                'suspended_at'     => now()->toISOString(),
                'suspended_reason' => $reason,
                'recurring'        => false, // Stop future renewal attempts
            ]),
        ]);

        Log::warning('dLocal subscription suspended', [
            'subscription_id' => $subscription->id,
            'company_id'      => $subscription->company_id,
            'reason'          => $reason,
        ]);

        $this->warn("  #{$subscription->id} — SUSPENDED: {$reason}");
    }
}
