<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ReferralCode extends Model
{
    protected $fillable = [
        'company_id',
        'code',
        'discount_percent',
        'discount_months',
        'max_uses',
        'times_used',
        'is_active',
        'expires_at',
    ];

    protected $casts = [
        'discount_percent' => 'integer',
        'discount_months' => 'integer',
        'max_uses' => 'integer',
        'times_used' => 'integer',
        'is_active' => 'boolean',
        'expires_at' => 'datetime',
    ];

    /* ── Relationships ── */

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function redemptions()
    {
        return $this->hasMany(ReferralRedemption::class);
    }

    /* ── Helpers ── */

    /**
     * Generate a unique referral code.
     */
    public static function generateCode(string $prefix = ''): string
    {
        do {
            $code = strtoupper($prefix . Str::random(6));
        } while (static::where('code', $code)->exists());

        return $code;
    }

    /**
     * Check if this code can still be redeemed.
     */
    public function canRedeem(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        if ($this->max_uses > 0 && $this->times_used >= $this->max_uses) {
            return false;
        }

        return true;
    }

    /**
     * Redeem this code for a company.
     */
    public function redeem(int $redeemerCompanyId): ReferralRedemption
    {
        $redemption = $this->redemptions()->create([
            'redeemer_company_id' => $redeemerCompanyId,
            'discount_percent' => $this->discount_percent,
            'discount_months' => $this->discount_months,
            'months_remaining' => $this->discount_months,
        ]);

        $this->increment('times_used');

        return $redemption;
    }
}
