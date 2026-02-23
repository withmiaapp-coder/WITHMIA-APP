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
     * Soporta múltiples proveedores: google, outlook, calendly.
     * Para proveedores con API key (reservo, agendapro, dentalink, medilink) no se necesita refresh.
     */
    public function refreshAccessToken(): ?string
    {
        if (empty($this->refresh_token)) {
            return null;
        }

        // Proveedores con API Key no necesitan refresh
        if (in_array($this->provider, ['reservo', 'agendapro', 'dentalink', 'medilink'])) {
            return $this->access_token;
        }

        $tokenUrl = match ($this->provider) {
            'google' => 'https://oauth2.googleapis.com/token',
            'outlook' => 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            'calendly' => 'https://auth.calendly.com/oauth/token',
            default => null,
        };

        if (!$tokenUrl) {
            return null;
        }

        $params = match ($this->provider) {
            'google' => [
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'refresh_token' => $this->refresh_token,
                'grant_type' => 'refresh_token',
            ],
            'outlook' => [
                'client_id' => config('services.microsoft.client_id'),
                'client_secret' => config('services.microsoft.client_secret'),
                'refresh_token' => $this->refresh_token,
                'grant_type' => 'refresh_token',
                'scope' => 'openid profile email offline_access Calendars.ReadWrite',
            ],
            'calendly' => [
                'client_id' => config('services.calendly.client_id'),
                'client_secret' => config('services.calendly.client_secret'),
                'refresh_token' => $this->refresh_token,
                'grant_type' => 'refresh_token',
            ],
            default => [],
        };

        try {
            $response = \Illuminate\Support\Facades\Http::asForm()->post($tokenUrl, $params);

            if ($response->successful()) {
                $data = $response->json();
                $updateData = [
                    'access_token' => $data['access_token'],
                    'token_expires_at' => now()->addSeconds($data['expires_in'] ?? 3600),
                ];
                // Some providers return a new refresh token
                if (!empty($data['refresh_token'])) {
                    $updateData['refresh_token'] = $data['refresh_token'];
                }
                $this->update($updateData);
                return $data['access_token'];
            }

            \Illuminate\Support\Facades\Log::warning("[Calendar:{$this->provider}] Token refresh failed", [
                'user_id' => $this->user_id,
                'status' => $response->status(),
            ]);

            return null;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("[Calendar:{$this->provider}] Token refresh error", [
                'user_id' => $this->user_id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Verificar si este es un proveedor basado en API Key (no expira).
     */
    public function isApiKeyProvider(): bool
    {
        return in_array($this->provider, ['reservo', 'agendapro', 'dentalink', 'medilink']);
    }

    /**
     * Override isTokenExpired para API key providers.
     */
    public function isTokenExpired(): bool
    {
        if ($this->isApiKeyProvider()) {
            return false; // API keys don't expire
        }

        if (!$this->token_expires_at) {
            return true;
        }
        return $this->token_expires_at->isPast();
    }

    /**
     * Override isConnected para soportar múltiples proveedores.
     */
    public function isConnected(): bool
    {
        if ($this->isApiKeyProvider()) {
            return $this->is_active && !empty($this->access_token);
        }

        return $this->is_active 
            && !empty($this->refresh_token) 
            && !empty($this->access_token);
    }
}
