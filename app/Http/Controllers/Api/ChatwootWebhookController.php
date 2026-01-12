<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use App\Http\Controllers\Controller;
use App\Events\NewMessageReceived;
use App\Events\ConversationUpdated;
use App\Services\ConversationDeduplicationService;

class ChatwootWebhookController extends Controller
{
    /**
     * Recibir eventos de Chatwoot y notificar al frontend
     */
    public function handleWebhook(Request $request)
    {
        $event = $request->input('event');
        $data = $request->all();

        Log::info('🎯 Chatwoot Webhook Received', [
            'event' => $event,
            'conversation_id' => $data['conversation']['id'] ?? $data['id'] ?? null,
            'message_id' => $data['id'] ?? null,
            'account_id' => $data['account']['id'] ?? $data['account_id'] ?? null,
            'inbox_id' => $data['conversation']['inbox_id'] ?? $data['inbox_id'] ?? null,
            'identifier' => $data['conversation']['meta']['sender']['identifier'] ?? $data['meta']['sender']['identifier'] ?? null
        ]);

        // Validar que sea una solicitud válida
        if (!$event) {
            Log::warning('Invalid webhook - no event');
            return response()->json(['status' => 'error', 'message' => 'Invalid payload'], 400);
        }

        // Obtener inbox_id y account_id
        $inboxId = $data['conversation']['inbox_id'] ?? $data['inbox_id'] ?? null;
        $accountId = $data['account']['id'] ?? $data['account_id'] ?? 1;

        // 🔥 SOLUCIÓN COMPLETA: PREVENIR DUPLICADOS CON CACHE
        if ($event === 'conversation_created' && $inboxId) {
            $shouldContinue = $this->preventDuplicateConversationWithRedis($data, $accountId, $inboxId);
            
            // Si retorna false, significa que archivamos esta conversación (es duplicada)
            if (!$shouldContinue) {
                Log::info('🚫 Conversación duplicada archivada - NO se propaga al frontend');
                return response()->json(['status' => 'success', 'message' => 'Duplicate conversation archived']);
            }
        }

        // ✅ Disparar eventos de Broadcasting en tiempo real
        try {
            if ($event === 'message_created' && $inboxId && $accountId) {
                // Broadcast mensaje nuevo (sin toOthers porque viene de webhook externo)
                $messageEvent = new NewMessageReceived(
                    $data,
                    $data['conversation']['id'] ?? null,
                    $inboxId,
                    $accountId
                );
                broadcast($messageEvent);

                Log::info('📤 NewMessageReceived event broadcasted', [
                    'inbox_id' => $inboxId,
                    'conversation_id' => $data['conversation']['id'] ?? null,
                    'message_content' => substr($data['content'] ?? '', 0, 50)
                ]);
            }

            if (in_array($event, ['conversation_updated', 'conversation_status_changed', 'conversation_created']) && $inboxId && $accountId) {
                // Broadcast actualización de conversación
                $convEvent = new ConversationUpdated(
                    $data['conversation'] ?? $data,
                    $inboxId,
                    $accountId
                );
                broadcast($convEvent);

                Log::info('📤 ConversationUpdated event broadcasted', [
                    'event' => $event,
                    'inbox_id' => $inboxId,
                    'conversation_id' => $data['conversation']['id'] ?? null
                ]);
            }
        } catch (\Exception $e) {
            Log::error('❌ Error broadcasting event', [
                'event' => $event,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }

        // 🗑️ Invalidar caché cuando llega mensaje nuevo
        if ($event === 'message_created' && $inboxId) {
            $lastMessageCacheKey = "last_message_inbox_{$inboxId}";
            Cache::put($lastMessageCacheKey, now()->timestamp, now()->addMinutes(60));

            Log::info('🗑️ Cache invalidado', [
                'inbox_id' => $inboxId,
                'timestamp' => now()->timestamp
            ]);
        }

        // Guardar evento en cache para polling (fallback)
        $cacheKey = 'chatwoot_events_' . $accountId;
        $events = Cache::get($cacheKey, []);
        $events[] = array_merge($data, [
            'event' => $event,
            'timestamp' => now()->toIso8601String()
        ]);

        // Mantener solo los últimos 100 eventos
        if (count($events) > 100) {
            $events = array_slice($events, -100);
        }

        Cache::put($cacheKey, $events, now()->addMinutes(5));

        return response()->json(['status' => 'success']);
    }

    /**
     * 🔥 PREVENIR DUPLICADOS CON CACHE - SOLUCIÓN DEFINITIVA
     * 
     * Estrategia:
     * 1. Extraer número base del identifier (limpio, sin @lid ni @s.whatsapp.net)
     * 2. Buscar en Cache si ya existe una conversación para ese número
     * 3. Si existe:
     *    a. Determinar cuál mantener (prioridad: @s.whatsapp.net > @lid)
     *    b. Archivar la conversación que no corresponda
     *    c. Actualizar Cache con la conversación correcta
     * 4. Si no existe, guardar en Cache
     * 
     * Cache Keys:
     * - conversation:phone:{phoneBase}:{inboxId} -> conversationId
     * - conversation:id:{conversationId} -> phoneBase
     */
    private function preventDuplicateConversationWithRedis($data, $accountId, $inboxId)
    {
        try {
            $conversationId = $data['conversation']['id'] ?? $data['id'] ?? null;
            $identifier = $data['conversation']['meta']['sender']['identifier'] ?? 
                         $data['meta']['sender']['identifier'] ?? null;

            // Si no viene identifier, consultarlo de la API
            if ($conversationId && !$identifier) {
                $chatwootUrl = env('CHATWOOT_URL', 'http://127.0.0.1:3000');
                $chatwootToken = env('CHATWOOT_TOKEN');
                
                $convResponse = Http::withHeaders(['api_access_token' => $chatwootToken])
                    ->get($chatwootUrl . '/api/v1/accounts/' . $accountId . '/conversations/' . $conversationId);
                
                if ($convResponse->successful()) {
                    $convData = $convResponse->json();
                    $identifier = $convData['meta']['sender']['identifier'] ?? null;
                    Log::info('📞 Identifier obtenido de API', ['identifier' => $identifier]);
                }
            }

            if (!$conversationId || !$identifier) {
                Log::warning('⚠️ No se puede prevenir duplicados - faltan datos', [
                    'conversation_id' => $conversationId,
                    'identifier' => $identifier
                ]);
                return true; // Permitir que continúe
            }

            // Extraer número base (sin @lid ni @s.whatsapp.net)
            $phoneBase = $this->extractPhoneBase($identifier);
            $isLid = strpos($identifier, '@lid') !== false;
            $isRealNumber = strpos($identifier, '@s.whatsapp.net') !== false;

            Log::info('🔍 Analizando conversación', [
                'conversation_id' => $conversationId,
                'identifier' => $identifier,
                'phone_base' => $phoneBase,
                'is_lid' => $isLid,
                'is_real_number' => $isRealNumber
            ]);

            // Buscar en Cache si ya existe conversación para este número
            $cacheKey = "conversation:phone:{$phoneBase}:{$inboxId}";
            $existingConversationId = Cache::get($cacheKey);

            if ($existingConversationId && $existingConversationId != $conversationId) {
                // YA EXISTE UNA CONVERSACIÓN PARA ESTE NÚMERO
                Log::info('🚨 DUPLICADO DETECTADO', [
                    'existing_conversation_id' => $existingConversationId,
                    'new_conversation_id' => $conversationId,
                    'phone_base' => $phoneBase
                ]);

                // Obtener información de la conversación existente
                $chatwootUrl = env('CHATWOOT_URL', 'http://127.0.0.1:3000');
                $chatwootToken = env('CHATWOOT_TOKEN');
                
                $existingConvResponse = Http::withHeaders(['api_access_token' => $chatwootToken])
                    ->get($chatwootUrl . '/api/v1/accounts/' . $accountId . '/conversations/' . $existingConversationId);

                if ($existingConvResponse->successful()) {
                    $existingConvData = $existingConvResponse->json();
                    $existingIdentifier = $existingConvData['meta']['sender']['identifier'] ?? '';
                    $existingIsLid = strpos($existingIdentifier, '@lid') !== false;
                    $existingIsRealNumber = strpos($existingIdentifier, '@s.whatsapp.net') !== false;

                    Log::info('📊 Comparando conversaciones', [
                        'existing' => [
                            'id' => $existingConversationId,
                            'identifier' => $existingIdentifier,
                            'is_lid' => $existingIsLid,
                            'is_real' => $existingIsRealNumber
                        ],
                        'new' => [
                            'id' => $conversationId,
                            'identifier' => $identifier,
                            'is_lid' => $isLid,
                            'is_real' => $isRealNumber
                        ]
                    ]);

                    // ESTRATEGIA DE DECISIÓN:
                    // 1. Si la nueva es REAL y la existente es LID -> Mantener NUEVA, archivar EXISTENTE
                    // 2. Si la nueva es LID y la existente es REAL -> Mantener EXISTENTE, archivar NUEVA
                    // 3. Si ambas son del mismo tipo -> Mantener EXISTENTE (la más antigua), archivar NUEVA

                    $shouldArchiveNew = false;
                    $conversationToArchive = null;
                    $conversationToKeep = null;

                    if ($isRealNumber && $existingIsLid) {
                        // CASO 1: Nueva es REAL, existente es LID -> Archivar EXISTENTE, mantener NUEVA
                        $conversationToArchive = $existingConversationId;
                        $conversationToKeep = $conversationId;
                        $shouldArchiveNew = false;
                        Log::info('✅ DECISIÓN: Mantener NUEVA (real), archivar EXISTENTE (lid)');
                    } elseif ($isLid && $existingIsRealNumber) {
                        // CASO 2: Nueva es LID, existente es REAL -> Archivar NUEVA, mantener EXISTENTE
                        $conversationToArchive = $conversationId;
                        $conversationToKeep = $existingConversationId;
                        $shouldArchiveNew = true;
                        Log::info('✅ DECISIÓN: Mantener EXISTENTE (real), archivar NUEVA (lid)');
                    } else {
                        // CASO 3: Ambas del mismo tipo -> Mantener la más antigua (EXISTENTE)
                        $conversationToArchive = $conversationId;
                        $conversationToKeep = $existingConversationId;
                        $shouldArchiveNew = true;
                        Log::info('✅ DECISIÓN: Mantener EXISTENTE (más antigua), archivar NUEVA');
                    }

                    // Archivar la conversación seleccionada
                    $this->archiveConversation($conversationToArchive, $accountId);

                    // Actualizar Cache con la conversación a mantener (7 días)
                    Cache::put($cacheKey, $conversationToKeep, now()->addDays(7));
                    Cache::put("conversation:id:{$conversationToKeep}", $phoneBase, now()->addDays(7));

                    // Si archivamos la nueva, NO propagar al frontend
                    return !$shouldArchiveNew;
                }
            } else {
                // NO HAY DUPLICADO - Registrar en Cache
                Log::info('✅ Primera conversación para este número - Registrando en Cache', [
                    'conversation_id' => $conversationId,
                    'phone_base' => $phoneBase,
                    'cache_key' => $cacheKey
                ]);

                Cache::put($cacheKey, $conversationId, now()->addDays(7));
                Cache::put("conversation:id:{$conversationId}", $phoneBase, now()->addDays(7));
            }

            return true; // Permitir que continúe

        } catch (\Exception $e) {
            Log::error('❌ Error en preventDuplicateConversationWithRedis', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return true; // En caso de error, permitir que continúe
        }
    }

    /**
     * Archivar conversación en Chatwoot
     */
    private function archiveConversation($conversationId, $accountId)
    {
        try {
            $chatwootUrl = env('CHATWOOT_URL', 'http://127.0.0.1:3000');
            $chatwootToken = env('CHATWOOT_TOKEN');
            
            $response = Http::withHeaders([
                'api_access_token' => $chatwootToken
            ])->post(
                $chatwootUrl . '/api/v1/accounts/' . $accountId . '/conversations/' . $conversationId . '/toggle_status',
                ['status' => 'resolved']
            );

            if ($response->successful()) {
                Log::info('🗑️ Conversación archivada exitosamente', [
                    'conversation_id' => $conversationId
                ]);
                return true;
            } else {
                Log::error('❌ Error archivando conversación', [
                    'conversation_id' => $conversationId,
                    'status' => $response->status(),
                    'response' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('❌ Excepción archivando conversación', [
                'conversation_id' => $conversationId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Extraer número base del identifier
     * Ejemplos:
     * - "5491112345678@lid" -> "5491112345678"
     * - "5491112345678@s.whatsapp.net" -> "5491112345678"
     * - "5491112345678" -> "5491112345678"
     */
    private function extractPhoneBase($identifier)
    {
        // Remover @lid y @s.whatsapp.net
        $phone = preg_replace('/@(lid|s\.whatsapp\.net)$/', '', $identifier);
        // Limpiar cualquier carácter no numérico
        $phone = preg_replace('/[^0-9]/', '', $phone);
        return $phone;
    }

    /**
     * Limpiar eventos antiguos del cache
     */
    public function clearOldEvents(Request $request)
    {
        $accountId = $request->input('account_id', 1);
        $cacheKey = 'chatwoot_events_' . $accountId;
        Cache::forget($cacheKey);

        return response()->json(['status' => 'success', 'message' => 'Events cleared']);
    }

    /**
     * Obtener eventos del cache (polling fallback)
     */
    public function getEvents(Request $request)
    {
        $accountId = $request->input('account_id', 1);
        $cacheKey = 'chatwoot_events_' . $accountId;
        $events = Cache::get($cacheKey, []);

        return response()->json(['events' => $events]);
    }
}
