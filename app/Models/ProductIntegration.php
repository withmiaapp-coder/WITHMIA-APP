<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductIntegration extends Model
{
    protected $fillable = [
        'company_id',
        'provider',
        'store_url',
        'api_key',
        'api_secret',
        'access_token',
        'refresh_token',
        'is_connected',
        'is_active',
        'bot_access_enabled',
        'settings',
        'products_count',
        'last_sync_at',
        'token_expires_at',
    ];

    protected $casts = [
        'is_connected' => 'boolean',
        'is_active' => 'boolean',
        'bot_access_enabled' => 'boolean',
        'settings' => 'array',
        'last_sync_at' => 'datetime',
        'token_expires_at' => 'datetime',
    ];

    protected $hidden = [
        'api_key',
        'api_secret',
        'access_token',
        'refresh_token',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
