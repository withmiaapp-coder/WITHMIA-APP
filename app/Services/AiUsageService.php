<?php

namespace App\Services;

use App\Models\AiUsage;
use App\Models\Company;
use App\Mail\AiUsageWarningMail;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AiUsageService
{
    /**
     * Cache TTL for usage checks (5 minutes).
     * Prevents DB hits on every single message.
     */
    private const CACHE_TTL = 300;

    /**
     * Check if a company can send an AI message (hasn't reached limit).
     * Now overage-aware: if overage billing is enabled, allow up to max overage.
     */
    public function canSendMessage(int $companyId): bool
    {
        $cacheKey = "ai_usage:{$companyId}:" . now()->format('Y-m');

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($companyId) {
            $usage = AiUsage::currentForCompany($companyId);

            // Under plan limit → always OK
            if (!$usage->hasReachedLimit()) {
                return true;
            }

            // Over plan limit — check overage policy
            $overageEnabled = (bool) config('billing.overage.enabled', false);
            if (!$overageEnabled) {
                return false;
            }

            // Allow up to max overage messages beyond plan limit
            $maxOverage = (int) config('billing.overage.max_extra_messages', 5000);
            $overageUsed = max(0, $usage->messages_used - $usage->messages_limit);

            return $overageUsed < $maxOverage;
        });
    }

    /**
     * Record an AI message for a company.
     * Returns the updated usage record.
     */
    public function recordMessage(int $companyId, int $tokensInput = 0, int $tokensOutput = 0, float $costUsd = 0): AiUsage
    {
        $usage = AiUsage::currentForCompany($companyId);
        $usage->incrementMessage($tokensInput, $tokensOutput, $costUsd);

        // Invalidate cache so limit check is fresh
        $cacheKey = "ai_usage:{$companyId}:" . now()->format('Y-m');
        Cache::forget($cacheKey);

        // Log warning if approaching limit
        $percentage = $usage->usagePercentage();
        if ($percentage >= 90 && $percentage < 100) {
            Log::warning("⚠️ AI usage at {$percentage}% for company {$companyId}", [
                'used' => $usage->messages_used,
                'limit' => $usage->messages_limit,
            ]);
            $this->sendUsageWarningOnce($companyId, $usage, $percentage, 'warning_90');
        } elseif ($percentage >= 100) {
            Log::warning("🚫 AI usage limit reached for company {$companyId}", [
                'used' => $usage->messages_used,
                'limit' => $usage->messages_limit,
            ]);
            $this->sendUsageWarningOnce($companyId, $usage, $percentage, 'warning_100');
        }

        return $usage;
    }

    /**
     * Get current usage stats for a company.
     */
    public function getUsageStats(int $companyId): array
    {
        $usage = AiUsage::currentForCompany($companyId);

        $overageEnabled = (bool) config('billing.overage.enabled', false);
        $overageMessages = max(0, $usage->messages_used - $usage->messages_limit);
        $overagePacks = $overageMessages > 0 ? (int) ceil($overageMessages / 1000) : 0;
        $pricePerPack = (int) config('billing.overage.price_per_1000', 5990);

        return [
            'messages_used' => $usage->messages_used,
            'messages_limit' => $usage->messages_limit,
            'remaining' => $usage->remainingMessages(),
            'percentage' => $usage->usagePercentage(),
            'has_reached_limit' => $usage->hasReachedLimit(),
            'tokens_input' => $usage->tokens_input,
            'tokens_output' => $usage->tokens_output,
            'estimated_cost_usd' => (float) $usage->estimated_cost_usd,
            'period' => now()->format('Y-m'),
            // Overage info
            'overage_enabled' => $overageEnabled,
            'overage_messages' => $overageMessages,
            'overage_packs' => $overagePacks,
            'overage_cost_clp' => $overagePacks * $pricePerPack,
            'overage_price_per_pack' => $pricePerPack,
        ];
    }

    /**
     * Send a usage warning email ONCE per threshold per billing period.
     * Uses cache to avoid sending the same warning multiple times.
     */
    private function sendUsageWarningOnce(int $companyId, AiUsage $usage, int $percentage, string $thresholdKey): void
    {
        $cacheKey = "ai_usage_warning:{$companyId}:{$usage->year}-{$usage->month}:{$thresholdKey}";

        // Already notified for this threshold this month
        if (Cache::has($cacheKey)) {
            return;
        }

        try {
            $company = Company::find($companyId);
            if (!$company) {
                return;
            }

            // Send to all company admins
            $admins = $company->users()->where('role', 'admin')->get();
            if ($admins->isEmpty()) {
                $admins = $company->users()->take(1)->get(); // fallback to first user
            }

            $overageEnabled = (bool) config('billing.overage.enabled', false);
            $overageMessages = max(0, $usage->messages_used - $usage->messages_limit);
            $overagePacks = $overageMessages > 0 ? (int) ceil($overageMessages / 1000) : 0;
            $pricePerPack = (int) config('billing.overage.price_per_1000', 5990);
            $overageCostClp = $overagePacks * $pricePerPack;

            $subscriptionUrl = config('app.url') . "/{$company->slug}/settings/subscription";

            foreach ($admins as $admin) {
                Mail::to($admin->email)->queue(new AiUsageWarningMail(
                    companyName: $company->name,
                    messagesUsed: $usage->messages_used,
                    messagesLimit: $usage->messages_limit,
                    percentage: $percentage,
                    overageEnabled: $overageEnabled,
                    overageMessages: $overageMessages,
                    overageCostClp: $overageCostClp,
                    subscriptionUrl: $subscriptionUrl,
                ));
            }

            // Cache for the rest of the billing period (max 31 days)
            Cache::put($cacheKey, true, now()->endOfMonth());

            Log::info("AI usage warning email sent ({$thresholdKey})", [
                'company_id' => $companyId,
                'percentage' => $percentage,
                'recipients' => $admins->pluck('email')->toArray(),
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to send AI usage warning email", [
                'company_id' => $companyId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Determine the recommended AI model based on company plan.
     * Smart model routing: cheaper models for lower tiers.
     */
    public function getRecommendedModel(int $companyId): array
    {
        $company = Company::find($companyId);
        if (!$company) {
            return $this->getModelConfig('free');
        }

        $subscription = $company->activeSubscription;
        if (!$subscription || $subscription->status !== 'active') {
            return $this->getModelConfig('free');
        }

        $planName = strtolower($subscription->plan_name ?? '');

        if (str_contains($planName, 'enterprise')) {
            return $this->getModelConfig('enterprise');
        }
        if (str_contains($planName, 'business')) {
            return $this->getModelConfig('business');
        }
        if (str_contains($planName, 'pro')) {
            return $this->getModelConfig('pro');
        }

        return $this->getModelConfig('free');
    }

    /**
     * Get model configuration for a plan tier.
     */
    private function getModelConfig(string $plan): array
    {
        $configs = config('billing.plans', []);
        $planConfig = $configs[$plan] ?? $configs['free'] ?? [];

        return [
            'primary_model' => $planConfig['primary_model'] ?? 'gpt-4o-mini',
            'fallback_model' => $planConfig['fallback_model'] ?? 'gpt-4o-mini',
            'available_models' => $planConfig['available_models'] ?? ['gpt-4o-mini'],
            'plan' => $plan,
        ];
    }

    /**
     * Update limits for all companies (run monthly or when plans change).
     */
    public function refreshLimitsForCompany(int $companyId): void
    {
        $newLimit = AiUsage::getLimitForCompany($companyId);
        $usage = AiUsage::currentForCompany($companyId);

        if ($usage->messages_limit !== $newLimit) {
            $usage->update(['messages_limit' => $newLimit]);
            Log::info("Updated AI limit for company {$companyId}: {$usage->messages_limit} → {$newLimit}");
        }
    }
}
