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
     * ✅ FIX: Priorizar display_id (el que usa el frontend) para evitar colisiones con internal id
     */
    protected function findConversation($conversationId): ?object
    {
        $baseQuery = $this->chatwootDb()->table('conversations')
            ->where('account_id', $this->accountId);

        // Filter by inbox_id only if available
        if ($this->inboxId) {
            $baseQuery->where('inbox_id', $this->inboxId);
        }

        // Priorizar display_id (ID que usa el frontend)
        $result = (clone $baseQuery)->where('display_id', $conversationId)->first();
        if ($result) return $result;

        // Fallback: buscar por internal id
        return (clone $baseQuery)->where('id', $conversationId)->first();
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
            \Illuminate\Support\Facades\Log::info('[WITHMIA] bootChatwootMiddleware ENTRY', [
                'user' => auth()->id(),
                'path' => $request->path(),
            ]);
            try {
                $this->initializeChatwootFromUser(auth()->user());
                $this->userId = $this->chatwootUserId;
                $this->accountId = $this->chatwootAccountId;
                $this->inboxId = $this->chatwootInboxId;
                \Illuminate\Support\Facades\Log::info('[WITHMIA] bootChatwootMiddleware OK', [
                    'accountId' => $this->accountId,
                    'inboxId' => $this->inboxId,
                ]);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('[WITHMIA] bootChatwootMiddleware FAILED', [
                    'error' => $e->getMessage(),
                    'class' => get_class($e),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]);
                $this->userId = null;
                $this->accountId = config('chatwoot.account_id', '1');
                $this->inboxId = null;
            }
            return $next($request);
        });
    }
}
