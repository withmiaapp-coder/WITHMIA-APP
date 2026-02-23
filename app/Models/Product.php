<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    protected $fillable = [
        'company_id',
        'provider',
        'external_id',
        'name',
        'description',
        'price',
        'compare_at_price',
        'currency',
        'sku',
        'stock_quantity',
        'stock_status',
        'category',
        'images',
        'attributes',
        'variants',
        'url',
        'brand',
        'weight',
        'is_active',
        'synced_at',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'compare_at_price' => 'decimal:2',
        'weight' => 'decimal:2',
        'images' => 'array',
        'attributes' => 'array',
        'variants' => 'array',
        'is_active' => 'boolean',
        'synced_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeFromProvider($query, string $provider)
    {
        return $query->where('provider', $provider);
    }

    public function scopeSearch($query, ?string $term)
    {
        if (!$term) return $query;

        // Escape LIKE wildcards to prevent injection via % or _
        $escaped = str_replace(['%', '_'], ['\%', '\_'], $term);

        return $query->where(function ($q) use ($escaped) {
            $q->where('name', 'like', "%{$escaped}%")
              ->orWhere('description', 'like', "%{$escaped}%")
              ->orWhere('sku', 'like', "%{$escaped}%")
              ->orWhere('category', 'like', "%{$escaped}%")
              ->orWhere('brand', 'like', "%{$escaped}%");
        });
    }

    public function getFirstImageAttribute(): ?string
    {
        $images = $this->images;
        return is_array($images) && count($images) > 0 ? $images[0] : null;
    }

    public function getFormattedPriceAttribute(): string
    {
        if ($this->price === null) return 'Sin precio';

        $symbol = match ($this->currency) {
            'USD' => 'US$',
            'EUR' => '€',
            'CLP' => '$',
            'ARS' => 'AR$',
            'MXN' => 'MX$',
            'BRL' => 'R$',
            'COP' => 'COL$',
            'PEN' => 'S/',
            default => '$',
        };

        // CLP doesn't use decimals
        if ($this->currency === 'CLP') {
            return $symbol . number_format((float) $this->price, 0, ',', '.');
        }

        return $symbol . number_format((float) $this->price, 2, ',', '.');
    }
}
