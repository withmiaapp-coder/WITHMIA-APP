<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppInstance extends Model
{
    use HasFactory;

    protected $table = 'whatsapp_instances';

    protected $fillable = [
        'company_id',
        'instance_name',
        'company_slug',
        'instance_url',
        'api_key',
        'n8n_workflow_id',
        'n8n_webhook_url',
        'chatwoot_inbox_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'chatwoot_inbox_id' => 'integer',
    ];

    protected $hidden = [
        'api_key',
    ];

    /**
     * Get the company that owns this WhatsApp instance.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Scope to filter only active instances.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Find instance by name.
     */
    public static function findByName(string $instanceName): ?self
    {
        return static::where('instance_name', $instanceName)->first();
    }
}
