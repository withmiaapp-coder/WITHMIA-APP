<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Sale extends Model
{
    protected $fillable = [
        'company_id',
        'product_id',
        'customer_name',
        'customer_phone',
        'customer_email',
        'product_name',
        'product_sku',
        'product_category',
        'product_provider',
        'quantity',
        'unit_price',
        'total_price',
        'discount_amount',
        'currency',
        'status',
        'source',
        'checkout_url',
        'conversation_id',
        'external_order_id',
        'metadata',
        'completed_at',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'total_price' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'quantity' => 'integer',
        'metadata' => 'array',
        'completed_at' => 'datetime',
    ];

    // ─── Relationships ──────────────────────────────────────

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    // ─── Scopes ─────────────────────────────────────────────

    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeLinkGenerated($query)
    {
        return $query->where('status', 'link_generated');
    }

    public function scopeLinkSent($query)
    {
        return $query->where('status', 'link_sent');
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', ['link_generated', 'link_sent']);
    }

    public function scopeInPeriod($query, string $period)
    {
        return match ($period) {
            'today' => $query->whereDate('created_at', today()),
            'week' => $query->where('created_at', '>=', now()->startOfWeek()),
            'month' => $query->where('created_at', '>=', now()->startOfMonth()),
            'year' => $query->where('created_at', '>=', now()->startOfYear()),
            default => $query,
        };
    }

    // ─── Accessors ──────────────────────────────────────────

    public function getFormattedTotalAttribute(): string
    {
        $symbols = [
            'USD' => 'US$', 'EUR' => '€', 'CLP' => '$',
            'ARS' => 'AR$', 'MXN' => 'MX$', 'BRL' => 'R$',
            'COP' => 'COL$', 'PEN' => 'S/',
        ];

        $symbol = $symbols[$this->currency ?? 'USD'] ?? '$';
        $decimals = in_array($this->currency, ['CLP', 'COP']) ? 0 : 2;

        return $symbol . number_format((float) $this->total_price, $decimals, ',', '.');
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'link_generated' => 'Enlace generado',
            'link_sent' => 'Enlace enviado',
            'completed' => 'Completada',
            'cancelled' => 'Cancelada',
            'expired' => 'Expirada',
            default => $this->status,
        };
    }

    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'link_generated' => 'yellow',
            'link_sent' => 'blue',
            'completed' => 'green',
            'cancelled' => 'red',
            'expired' => 'gray',
            default => 'gray',
        };
    }
}
