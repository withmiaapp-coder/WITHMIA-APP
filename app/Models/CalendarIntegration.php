<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Integración de calendario externo (Google Calendar, Outlook, etc.)
 * Almacena tokens OAuth y configuración por usuario/empresa.
 */
class CalendarIntegration extends Model
{
    protected $fillable = [
        'company_id',
        'user_id',
        'provider',
        'provider_email',
        'access_token',
        'refresh_token',
        'token_expires_at',
        'scopes',
        'settings',
        'selected_calendar_id',
        'is_active',
        'bot_access_enabled',
        'last_sync_at',
        'sync_status',
    ];

    protected $casts = [
        'scopes' => 'array',
        'settings' => 'array',
        'sync_status' => 'array',
        'is_active' => 'boolean',
        'bot_access_enabled' => 'boolean',
        'token_expires_at' => 'datetime',
        'last_sync_at' => 'datetime',
    ];

    protected $hidden = [
        'access_token',
        'refresh_token',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Verificar si el token de acceso ha expirado.
     */
    public function isTokenExpired(): bool
    {
        if (!$this->token_expires_at) {
            return true;
        }
        return $this->token_expires_at->isPast();
    }

    /**
     * Verificar si la integración está conectada y activa.
     */
    public function isConnected(): bool
    {
        return $this->is_active 
            && !empty($this->refresh_token) 
            && !empty($this->access_token);
    }

    /**
     * Obtener el access token válido, refrescándolo si es necesario.
     */
    public function getValidAccessToken(): ?string
    {
        if (!$this->isConnected()) {
            return null;
        }

        if (!$this->isTokenExpired()) {
            return $this->access_token;
        }

        // Refrescar token
        return $this->refreshAccessToken();
    }

    /**
     * Refrescar el access token usando el refresh token.
     */
    public function refreshAccessToken(): ?string
    {
        if (empty($this->refresh_token)) {
            return null;
        }

        try {
            $response = \Illuminate\Support\Facades\Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'refresh_token' => $this->refresh_token,
                'grant_type' => 'refresh_token',
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $this->update([
                    'access_token' => $data['access_token'],
                    'token_expires_at' => now()->addSeconds($data['expires_in'] ?? 3600),
                ]);
                return $data['access_token'];
            }

            \Illuminate\Support\Facades\Log::warning('[Calendar] Token refresh failed', [
                'user_id' => $this->user_id,
                'status' => $response->status(),
            ]);

            return null;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[Calendar] Token refresh error', [
                'user_id' => $this->user_id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }
}
