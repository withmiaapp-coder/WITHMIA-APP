<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    protected $fillable = [
        'company_id',
        'plan_name',
        'price',
        'billing_cycle',
        'max_agents',
        'max_integrations',
        'max_monthly_requests',
        'features',
        'status',
        'starts_at',
        'ends_at',
        'trial_ends_at',
        'payment_info',
        'dlocal_payment_id',
        'dlocal_subscription_id',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'features' => 'array',
        'payment_info' => 'array',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'trial_ends_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isTrialing(): bool
    {
        return $this->trial_ends_at && $this->trial_ends_at->isFuture();
    }

    public function trialDaysRemaining(): ?int
    {
        if (!$this->trial_ends_at || $this->trial_ends_at->isPast()) {
            return null;
        }
        return (int) now()->diffInDays($this->trial_ends_at, false);
    }
}
