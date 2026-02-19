<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class Company extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'user_id',
        'name',
        'assistant_name',
        'slug',
        'chatwoot_account_id',
        'chatwoot_inbox_id',
        'chatwoot_data',
        'chatwoot_provisioned',
        'chatwoot_provisioned_at',
        'description',
        'website',
        'client_type',
        'logo_url',
        'branding',
        'timezone',
        'settings',
        'is_active',
    ];

    protected $casts = [
        'settings' => 'array',
        'chatwoot_data' => 'array',
        'chatwoot_provisioned_at' => 'datetime',
        'is_active' => 'boolean',
        'chatwoot_provisioned' => 'boolean',
        'branding' => 'array',
    ];

    // ==========================================
    // CACHE HELPERS
    // ==========================================

    /**
     * 🚀 OPTIMIZACIÓN: Obtener company por slug con cache de 10 minutos
     * Evita queries repetidas al buscar company por slug
     */
    public static function findBySlugCached(string $slug): ?self
    {
        if (empty($slug)) {
            return null;
        }

        return Cache::remember(
            "company_by_slug:{$slug}",
            600, // 10 minutos
            fn() => static::where('slug', $slug)->first()
        );
    }

    /**
     * Invalidar cache de company (llamar al actualizar)
     */
    public function clearCache(): void
    {
        Cache::forget("company_by_slug:{$this->slug}");
    }

    /**
     * Boot del modelo para limpiar cache automáticamente
     */
    protected static function boot()
    {
        parent::boot();

        static::updated(function ($company) {
            $company->clearCache();
        });

        static::deleted(function ($company) {
            $company->clearCache();
        });
    }

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

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * Get the active subscription (active or trialing).
     */
    public function activeSubscription()
    {
        return $this->hasOne(Subscription::class)
            ->where(function ($q) {
                $q->where('status', 'active')
                  ->orWhere(function ($q2) {
                      $q2->where('status', 'trialing')
                         ->where('trial_ends_at', '>', now());
                  });
            })
            ->latest('created_at');
    }

    /**
     * Get the current plan info for display.
     */
    public function getPlanInfoAttribute(): array
    {
        $sub = $this->activeSubscription;

        if (!$sub) {
            return [
                'name' => 'Gratis',
                'status' => 'free',
                'badge_color' => 'gray',
                'trial_days' => null,
            ];
        }

        $isTrialing = $sub->isTrialing();

        return [
            'name' => $sub->plan_name ?? 'Pro',
            'status' => $isTrialing ? 'trialing' : $sub->status,
            'badge_color' => match ($sub->status) {
                'active' => 'green',
                'trialing' => 'amber',
                'past_due' => 'red',
                'cancelled' => 'gray',
                default => 'gray',
            },
            'trial_days' => $isTrialing ? $sub->trialDaysRemaining() : null,
            'billing_cycle' => $sub->billing_cycle,
            'ends_at' => $sub->ends_at?->toISOString(),
        ];
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
