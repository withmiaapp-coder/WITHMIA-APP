<?php

namespace App\Observers;

use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Observer para el modelo User.
 *
 * NOTA: La limpieza completa de datos relacionados (Evolution API, Excel,
 * Qdrant, sessions, tokens, cache) se centraliza en UserDeletionService.
 * Este observer solo loguea eventos del ciclo de vida.
 *
 * Si un controlador llama $user->delete() directamente SIN pasar por
 * UserDeletionService, este observer NO limpia datos externos — esa
 * responsabilidad ahora es exclusiva del servicio.
 */
class UserObserver
{
    public function created(User $user): void
    {
        Log::debug('UserObserver::created', ['user_id' => $user->id, 'name' => $user->name]);
    }

    public function updated(User $user): void
    {
        Log::debug('UserObserver::updated', ['user_id' => $user->id, 'step' => $user->onboarding_step]);
    }

    public function deleted(User $user): void
    {
        Log::debug('UserObserver::deleted', ['user_id' => $user->id]);
    }

    public function restored(User $user): void
    {
        Log::debug('UserObserver::restored', ['user_id' => $user->id]);
    }

    public function forceDeleted(User $user): void
    {
        Log::debug('UserObserver::forceDeleted', ['user_id' => $user->id]);
    }
}
