<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiUsage extends Model
{
    protected $fillable = [
        'company_id',
        'year',
        'month',
        'messages_used',
        'messages_limit',
        'tokens_input',
        'tokens_output',
        'estimated_cost_usd',
    ];

    protected $casts = [
        'messages_used' => 'integer',
        'messages_limit' => 'integer',
        'tokens_input' => 'integer',
        'tokens_output' => 'integer',
        'estimated_cost_usd' => 'decimal:4',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get or create the current month's usage record for a company.
     */
    public static function currentForCompany(int $companyId): self
    {
        return static::firstOrCreate(
            [
                'company_id' => $companyId,
                'year' => now()->year,
                'month' => now()->month,
            ],
            [
                'messages_used' => 0,
                'messages_limit' => self::getLimitForCompany($companyId),
            ]
        );
    }

    /**
     * Increment message count and return updated record.
     */
    public function incrementMessage(int $tokensInput = 0, int $tokensOutput = 0, float $costUsd = 0): self
    {
        $this->increment('messages_used');

        if ($tokensInput > 0) {
            $this->increment('tokens_input', $tokensInput);
        }
        if ($tokensOutput > 0) {
            $this->increment('tokens_output', $tokensOutput);
        }
        if ($costUsd > 0) {
            $this->increment('estimated_cost_usd', $costUsd);
        }

        return $this->fresh();
    }

    /**
     * Check if the company has reached its AI message limit.
     */
    public function hasReachedLimit(): bool
    {
        return $this->messages_used >= $this->messages_limit;
    }

    /**
     * Get remaining messages for the month.
     */
    public function remainingMessages(): int
    {
        return max(0, $this->messages_limit - $this->messages_used);
    }

    /**
     * Get usage percentage (0-100).
     */
    public function usagePercentage(): float
    {
        if ($this->messages_limit <= 0) {
            return 100;
        }
        return round(($this->messages_used / $this->messages_limit) * 100, 1);
    }

    /**
     * Determine AI message limit based on company subscription plan.
     */
    public static function getLimitForCompany(int $companyId): int
    {
        $company = Company::find($companyId);
        if (!$company) {
            return config('billing.plans.free.ai_messages', 500);
        }

        $subscription = $company->activeSubscription;
        if (!$subscription || $subscription->status !== 'active') {
            return config('billing.plans.free.ai_messages', 500);
        }

        $planName = strtolower($subscription->plan_name ?? '');

        if (str_contains($planName, 'enterprise')) {
            return config('billing.plans.enterprise.ai_messages', 25000);
        }
        if (str_contains($planName, 'business')) {
            return config('billing.plans.business.ai_messages', 8000);
        }
        if (str_contains($planName, 'pro')) {
            return config('billing.plans.pro.ai_messages', 2000);
        }

        return config('billing.plans.free.ai_messages', 500);
    }
}
