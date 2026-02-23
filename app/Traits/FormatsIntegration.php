<?php

namespace App\Traits;

use App\Models\CalendarIntegration;

/**
 * Trait compartido para formatear CalendarIntegration en respuestas JSON.
 * Usado por: AgendaPro, Calendar, Calendly, Dentalink, Medilink, Reservo.
 */
trait FormatsIntegration
{
    private function formatIntegration(CalendarIntegration $integration): array
    {
        return [
            'id' => $integration->id,
            'provider' => $integration->provider,
            'provider_email' => $integration->provider_email,
            'is_active' => $integration->is_active,
            'is_connected' => $integration->isConnected(),
            'bot_access_enabled' => $integration->bot_access_enabled,
            'selected_calendar_id' => $integration->selected_calendar_id,
            'settings' => $integration->settings,
            'last_sync_at' => $integration->last_sync_at?->toISOString(),
            'created_at' => $integration->created_at?->toISOString(),
        ];
    }
}
