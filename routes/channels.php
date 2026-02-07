<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// ✅ NUEVO: Canal privado por inbox - SEGURIDAD MULTI-TENANT
Broadcast::channel('inbox.{inboxId}', function ($user, $inboxId) {
    // Verificar inbox del usuario directamente o a través de la company
    $userInboxId = $user->chatwoot_inbox_id;
    
    // Si el usuario no tiene inbox directo, buscar en su company
    if (!$userInboxId) {
        // Cargar company explícitamente si existe
        $company = \App\Models\Company::where('slug', $user->company_slug)->first();
        if ($company) {
            $userInboxId = $company->chatwoot_inbox_id;
        }
    }
    
    // Log para debug
    \Illuminate\Support\Facades\Log::debug('🔐 Broadcasting auth check', [
        'user_id' => $user->id,
        'user_inbox_id' => $userInboxId,
        'company_slug' => $user->company_slug,
        'requested_inbox_id' => $inboxId,
        'match' => $userInboxId == (int) $inboxId
    ]);
    
    return $userInboxId == (int) $inboxId;
});


