<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferralRedemption extends Model
{
    protected $fillable = [
        'referral_code_id',
        'redeemer_company_id',
        'discount_percent',
        'discount_months',
        'months_remaining',
    ];

    protected $casts = [
        'discount_percent' => 'integer',
        'discount_months' => 'integer',
        'months_remaining' => 'integer',
    ];

    /* ── Relationships ── */

    public function referralCode(): BelongsTo
    {
        return $this->belongsTo(ReferralCode::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'redeemer_company_id');
    }

    /* ── Helpers ── */

    /**
     * Whether this redemption still has active discount months.
     */
    public function isActive(): bool
    {
        return $this->months_remaining > 0;
    }

    /**
     * Consume one month of the discount (called on each billing cycle).
     */
    public function consumeMonth(): void
    {
        if ($this->months_remaining > 0) {
            $this->decrement('months_remaining');
        }
    }
}
