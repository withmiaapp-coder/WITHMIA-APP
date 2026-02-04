<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Http\Controllers\Controller;
use App\Events\NewMessageReceived;
use App\Events\ConversationUpdated;
use App\Services\ChatwootService;
use App\Services\ConversationDeduplicationService;
use App\Helpers\PhoneNormalizer;
use App\Helpers\SystemMessagePatterns;

class ChatwootWebhookController extends Controller
{
    private ChatwootService $chatwootService;

    public function __construct(ChatwootService $chatwootService)
    {
        $this->chatwootService = $chatwootService;
    }

    /**
     * Recibir eventos de Chatwoot y notificar al frontend
     */
    public function handleWebhook(Request $request)
    {
        $event = $request->input('event');
        $data = $request->all();
        
        // 🚫 FILTRAR MENSAJES DE SISTEMA antes de procesar
        if ($event === 'message_created') {
            $messageContent = $data['content'] ?? '';
            if (SystemMessagePatterns::isSystemMessage($messageContent)) {
                Log::debug('🔇 Mensaje de sistema ignorado en Chatwoot webhook', [
                    'content' => substr($messageContent, 0, 50)
                ]);
                return response()->json(['status' => 'ignored', 'reason' => 'system_message']);
            }
        }

        Log::debug('🎯 Chatwoot Webhook Received', [
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
                Log::debug('🚫 Conversación duplicada archivada - NO se propaga al frontend');
                return response()->json(['status' => 'success', 'message' => 'Duplicate conversation archived']);
            }
        }

        // ✅ Disparar eventos de Broadcasting en tiempo real (OPTIMIZADO - ambos sincronizados)
        try {
            if ($event === 'message_created' && $inboxId && $accountId) {
                $conversationId = $data['conversation']['id'] ?? null;
                
                // 1️⃣ Broadcast mensaje nuevo al chat
                $messageEvent = new NewMessageReceived(
                    $data,
                    $conversationId,
                    $inboxId,
                    $accountId
                );
                broadcast($messageEvent);

                // 2️⃣ TAMBIÉN actualizar la lista de conversaciones (sincronizado)
                $convEvent = new ConversationUpdated(
                    $data['conversation'] ?? $data,
                    $inboxId,
                    $accountId
                );
                broadcast($convEvent);

                Log::debug('📤 NewMessageReceived + ConversationUpdated broadcasted SYNC', [
                    'inbox_id' => $inboxId,
                    'conversation_id' => $conversationId,
                    'message_content' => substr($data['content'] ?? '', 0, 50)
                ]);
            }

            // Solo para eventos que NO son message_created (evitar duplicado)
            if (in_array($event, ['conversation_updated', 'conversation_status_changed', 'conversation_created']) && $inboxId && $accountId) {
                // Broadcast actualización de conversación
                $convEvent = new ConversationUpdated(
                    $data['conversation'] ?? $data,
                    $inboxId,
                    $accountId
                );
                broadcast($convEvent);

                Log::debug('📤 ConversationUpdated event broadcasted', [
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

        // ✅ Los datos de conversaciones se obtienen en tiempo real desde BD (sin cache)

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

            // Si no viene identifier, consultarlo de la API usando el servicio
            if ($conversationId && !$identifier) {
                $chatwootToken = config('chatwoot.token', env('CHATWOOT_TOKEN'));
                
                $result = $this->chatwootService->getConversation($accountId, $chatwootToken, $conversationId);
                
                if ($result['success']) {
                    $convData = $result['data'];
                    $identifier = $convData['meta']['sender']['identifier'] ?? null;
                    Log::debug('📞 Identifier obtenido de API', ['identifier' => $identifier]);
                }
            }

            if (!$conversationId || !$identifier) {
                Log::warning('⚠️ No se puede prevenir duplicados - faltan datos', [
                    'conversation_id' => $conversationId,
                    'identifier' => $identifier
                ]);
                return true; // Permitir que continúe
            }

            // Extraer número base usando helper centralizado
            $phoneBase = PhoneNormalizer::normalize($identifier);
            $isLid = PhoneNormalizer::isLid($identifier);
            $isRealNumber = PhoneNormalizer::isRealNumber($identifier);

            Log::debug('🔍 Analizando conversación', [
                'conversation_id' => $conversationId,
                'identifier' => $identifier,
                'phone_base' => $phoneBase,
                'is_lid' => $isLid,
                'is_real_number' => $isRealNumber
            ]);

            // Validar phoneBase no vacío
            if (empty($phoneBase)) {
                Log::warning('⚠️ phoneBase inválido, permitiendo conversación', [
                    'conversation_id' => $conversationId,
                    'identifier' => $identifier,
                    'phone_base' => $phoneBase
                ]);
                return true;
            }

            // 🔒 OPERACIÓN ATÓMICA: Usar Cache::add() para prevenir race conditions
            // Cache::add() solo guarda si la key NO existe (atómico)
            $cacheKey = "conversation:phone:{$phoneBase}:{$inboxId}";
            
            // Intentar registrar esta conversación atómicamente
            $wasAdded = Cache::add($cacheKey, $conversationId, now()->addDays(7));
            
            if ($wasAdded) {
                // ✅ Primera conversación para este número - registrada exitosamente
                Cache::put("conversation:id:{$conversationId}", $phoneBase, now()->addDays(7));
                Log::debug('✅ Primera conversación para este número - Registrada atómicamente', [
                    'conversation_id' => $conversationId,
                    'phone_base' => $phoneBase
                ]);
                return true;
            }
            
            // Ya existe una conversación - verificar si es la misma o diferente
            $existingConversationId = Cache::get($cacheKey);

            if ($existingConversationId == $conversationId) {
                // Es la misma conversación, permitir
                return true;
            }
            
            // YA EXISTE UNA CONVERSACIÓN DIFERENTE PARA ESTE NÚMERO
                Log::debug('🚨 DUPLICADO DETECTADO', [
                    'existing_conversation_id' => $existingConversationId,
                    'new_conversation_id' => $conversationId,
                    'phone_base' => $phoneBase
                ]);

                // Obtener información de la conversación existente usando el servicio
                $chatwootToken = config('chatwoot.token', env('CHATWOOT_TOKEN'));
                
                $existingResult = $this->chatwootService->getConversation($accountId, $chatwootToken, $existingConversationId);

                if ($existingResult['success']) {
                    $existingConvData = $existingResult['data'];
                    $existingIdentifier = $existingConvData['meta']['sender']['identifier'] ?? '';
                    $existingIsLid = PhoneNormalizer::isLid($existingIdentifier);
                    $existingIsRealNumber = PhoneNormalizer::isRealNumber($existingIdentifier);

                    Log::debug('📊 Comparando conversaciones', [
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
                        Log::debug('✅ DECISIÓN: Mantener NUEVA (real), archivar EXISTENTE (lid)');
                    } elseif ($isLid && $existingIsRealNumber) {
                        // CASO 2: Nueva es LID, existente es REAL -> Archivar NUEVA, mantener EXISTENTE
                        $conversationToArchive = $conversationId;
                        $conversationToKeep = $existingConversationId;
                        $shouldArchiveNew = true;
                        Log::debug('✅ DECISIÓN: Mantener EXISTENTE (real), archivar NUEVA (lid)');
                    } else {
                        // CASO 3: Ambas del mismo tipo -> Mantener la más antigua (EXISTENTE)
                        $conversationToArchive = $conversationId;
                        $conversationToKeep = $existingConversationId;
                        $shouldArchiveNew = true;
                        Log::debug('✅ DECISIÓN: Mantener EXISTENTE (más antigua), archivar NUEVA');
                    }

                    // Archivar la conversación seleccionada
                    $this->archiveConversation($conversationToArchive, $accountId);

                    // Actualizar Cache con la conversación a mantener (7 días)
                    Cache::put($cacheKey, $conversationToKeep, now()->addDays(7));
                    Cache::put("conversation:id:{$conversationToKeep}", $phoneBase, now()->addDays(7));

                    // Si archivamos la nueva, NO propagar al frontend
                    return !$shouldArchiveNew;
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
            $chatwootToken = config('chatwoot.token', env('CHATWOOT_TOKEN'));
            
            $result = $this->chatwootService->toggleConversationStatus(
                $accountId,
                $chatwootToken,
                $conversationId,
                'resolved'
            );

            if ($result['success']) {
                Log::debug('🗑️ Conversación archivada exitosamente', [
                    'conversation_id' => $conversationId
                ]);
                return true;
            } else {
                Log::error('❌ Error archivando conversación', [
                    'conversation_id' => $conversationId,
                    'error' => $result['error'] ?? 'Unknown error'
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
