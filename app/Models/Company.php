<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $guarded = [];

    protected $casts = [
        'settings' => 'array',
        'chatwoot_data' => 'array',
        'chatwoot_provisioned_at' => 'datetime',
        'is_active' => 'boolean'
    ];

    // ==========================================
    // RELACIONES
    // ==========================================

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function users()
    {
        return $this->hasMany(User::class, 'company_slug', 'slug');
    }

    public function whatsappInstances()
    {
        return $this->hasMany(WhatsAppInstance::class);
    }

    public function knowledgeDocuments()
    {
        return $this->hasMany(KnowledgeDocument::class);
    }

    public function pipelines()
    {
        return $this->hasMany(Pipeline::class);
    }

    public function pipelineItems()
    {
        return $this->hasMany(PipelineItem::class);
    }

    public function teamInvitations()
    {
        return $this->hasMany(TeamInvitation::class);
    }

    // ==========================================
    // SCOPES
    // ==========================================

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeWithChatwoot($query)
    {
        return $query->whereNotNull('chatwoot_account_id');
    }

    // ==========================================
    // ACCESSORS
    // ==========================================

    public function getHasChatwootAttribute(): bool
    {
        return !empty($this->chatwoot_account_id);
    }

    public function getHasWhatsappAttribute(): bool
    {
        return $this->whatsappInstances()->where('is_active', true)->exists();
    }
}
