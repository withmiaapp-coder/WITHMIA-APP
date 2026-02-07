<?php

namespace App\Traits;

use Illuminate\Support\Facades\DB;

/**
 * Trait compartido para controllers que acceden a la BD de Chatwoot.
 * Provee helpers de conexión, búsqueda de conversaciones y constantes de status.
 *
 * Requiere que el controller que lo use tenga las propiedades:
 *   $accountId, $inboxId, $userId
 * (normalmente inicializadas vía ResolvesChatwootConfig + middleware)
 */
trait ChatwootDbAccess
{
    // Mapeo de status string <-> int
    protected const STATUS_TO_INT = ['open' => 0, 'resolved' => 1, 'pending' => 2, 'snoozed' => 3];
    protected const INT_TO_STATUS = [0 => 'open', 1 => 'resolved', 2 => 'pending', 3 => 'snoozed'];

    /**
     * Obtener conexión a BD de Chatwoot
     */
    protected function chatwootDb(): \Illuminate\Database\ConnectionInterface
    {
        return DB::connection('chatwoot');
    }

    /**
     * Buscar conversación por ID o display_id con filtro de seguridad
     */
    protected function findConversation($conversationId): ?object
    {
        return $this->chatwootDb()->table('conversations')
            ->where('account_id', $this->accountId)
            ->where('inbox_id', $this->inboxId)
            ->where(function ($q) use ($conversationId) {
                $q->where('id', $conversationId)->orWhere('display_id', $conversationId);
            })
            ->first();
    }

    /**
     * Convertir timestamp UTC de la BD a Unix timestamp
     */
    protected function utcToTimestamp($utcDatetime): ?int
    {
        if (!$utcDatetime) return null;
        return strtotime($utcDatetime . ' UTC');
    }

    /**
     * Inicializar propiedades de Chatwoot desde middleware auth
     */
    protected function bootChatwootMiddleware(): void
    {
        $this->middleware(function ($request, $next) {
            $this->initializeChatwootFromUser(auth()->user());
            $this->userId = $this->chatwootUserId;
            $this->accountId = $this->chatwootAccountId;
            $this->inboxId = $this->chatwootInboxId;
            return $next($request);
        });
    }
}
