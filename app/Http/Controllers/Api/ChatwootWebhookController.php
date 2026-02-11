<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Http\Controllers\Controller;
use App\Events\NewMessageReceived;
use App\Events\ConversationUpdated;
use App\Services\ChatwootService;
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

        // 🔍 DIAGNÓSTICO: Log completo para mensajes con content vacío (posibles audios/media)
        if ($event === 'message_created' && empty($data['content'] ?? '')) {
            Log::info('🔊 Chatwoot webhook - mensaje sin contenido (posible media)', [
                'message_id' => $data['id'] ?? null,
                'content_type' => $data['content_type'] ?? null,
                'has_attachments' => isset($data['attachments']) && is_array($data['attachments']) ? count($data['attachments']) : 'NO',
                'attachments_raw' => $data['attachments'] ?? 'NOT_PRESENT',
                'source_id' => $data['source_id'] ?? null,
                'message_type' => $data['message_type'] ?? null,
                'all_keys' => array_keys($data),
            ]);
        }

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
                $messageId = $data['id'] ?? null;
                $sourceId = $data['source_id'] ?? null; // ID único de WhatsApp
                $content = $data['content'] ?? '';
                $messageType = $data['message_type'] ?? null;
                $isIncoming = $messageType === 'incoming' || $messageType === 0;
                
                // 🔓 HUMAN TAKEOVER: Si es mensaje entrante con palabra clave de desbloqueo → eliminar bloqueo
                if ($isIncoming && $content) {
                    $this->handleUnlockKeyword($data, $inboxId, $content);
                }
                
                // 🔒 DEDUPLICACIÓN: Solo por IDs únicos (sin hash de contenido)
                // El hash causaba que mensajes con mismo contenido se filtraran
                $dedupKeys = [];
                
                if ($messageId) {
                    $dedupKeys[] = "msg_id_{$conversationId}_{$messageId}";
                }
                if ($sourceId) {
                    $dedupKeys[] = "msg_src_{$sourceId}";
                }
                
                // Verificar si alguna clave ya existe
                foreach ($dedupKeys as $key) {
                    if (\Cache::has($key)) {
                        Log::debug('🚫 Mensaje duplicado detectado', [
                            'key' => $key,
                            'conversation_id' => $conversationId,
                            'message_id' => $messageId,
                            'source_id' => $sourceId
                        ]);
                        return response()->json(['status' => 'success', 'message' => 'Duplicate message ignored']);
                    }
                }
                
                // Marcar todas las claves como procesadas (60 segundos)
                foreach ($dedupKeys as $key) {
                    \Cache::put($key, true, 60);
                }
                
                $messageType = $data['message_type'] ?? null;
                $isOutgoing = $messageType === 'outgoing' || $messageType === 1;
                
                Log::debug('📨 Chatwoot mensaje para broadcast', [
                    'conversation_id' => $conversationId,
                    'message_id' => $messageId,
                    'source_id' => $sourceId,
                    'message_type' => $messageType,
                    'is_outgoing' => $isOutgoing,
                    'content_preview' => substr($content, 0, 50)
                ]);
                
                // Broadcast para TODOS los mensajes (entrantes y del bot)
                // Wrapped in try-catch: si Reverb no responde, no debe bloquear el webhook
                try {
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
                } catch (\Throwable $broadcastError) {
                    Log::warning('⚠️ Broadcast failed (Reverb unreachable?), continuing webhook processing', [
                        'error' => $broadcastError->getMessage(),
                        'conversation_id' => $conversationId,
                    ]);
                }
            }

            // Solo para eventos que NO son message_created (evitar duplicado)
            if (in_array($event, ['conversation_updated', 'conversation_status_changed', 'conversation_created']) && $inboxId && $accountId) {
                try {
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
                } catch (\Throwable $broadcastError) {
                    Log::warning('⚠️ ConversationUpdated broadcast failed', [
                        'error' => $broadcastError->getMessage(),
                        'event' => $event,
                    ]);
                }
            }
        } catch (\Throwable $e) {
            Log::error('❌ Error broadcasting event', [
                'event' => $event,
                'error' => $e->getMessage()
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

        // 🔊 ENRIQUECER Y REENVIAR A N8N para mensajes entrantes
        // PRIORIDAD: Despachar a n8n ANTES del broadcast (broadcast puede bloquear si Reverb no responde)
        if ($event === 'message_created') {
            $this->forwardToN8nWithEnrichment($data, $inboxId, $accountId);
        }

        return response()->json(['status' => 'success']);
    }

    /**
     * � Enriquecer mensaje con attachments y reenviar a n8n
     * 
     * Chatwoot puede disparar el webhook ANTES de que el attachment se guarde (race condition).
     * Este método detecta mensajes sin contenido ni attachments, espera a que Chatwoot guarde
     * el attachment, consulta la API para obtenerlo, y reenvía el payload enriquecido a n8n.
     * 
     * OPTIMIZACIÓN: Despacha un Job en cola para no bloquear workers de Octane.
     */
    private function forwardToN8nWithEnrichment(array $data, ?int $inboxId, ?int $accountId): void
    {
        try {
            $messageType = $data['message_type'] ?? null;
            $isIncoming = $messageType === 'incoming' || $messageType === 0;
            
            // Solo procesar mensajes entrantes
            if (!$isIncoming) {
                return;
            }
            
            // Dedup: si el Evolution webhook ya despachó el forward, no duplicar
            $sourceId = $data['source_id'] ?? null;
            if ($sourceId) {
                $dedupKey = "n8n_evo_fwd_{$sourceId}";
                if (\Cache::has($dedupKey)) {
                    Log::debug('⏭️ n8n forward ya enviado desde Evolution webhook (dedup)', [
                        'source_id' => $sourceId,
                    ]);
                    return;
                }
                // Mark as sent so Evolution job also won't duplicate
                \Cache::put($dedupKey, true, 120);
            }
            
            // Resolver company slug desde inbox_id (DB lookup con cache, fallback inbox name)
            $companySlug = $this->resolveCompanySlugFromInbox($inboxId, $data);
            
            if (!$companySlug) {
                Log::warning('🔊 No se pudo determinar companySlug para n8n forward', [
                    'inbox_id' => $inboxId,
                    'inbox_name' => $data['inbox']['name'] ?? null,
                ]);
                return;
            }
            
            Log::info('🔀 Despachando ForwardToN8nWithEnrichmentJob', [
                'company_slug' => $companySlug,
                'message_id' => $data['id'] ?? null,
            ]);
            
            \App\Jobs\ForwardToN8nWithEnrichmentJob::dispatch(
                $data,
                $inboxId,
                $accountId,
                $companySlug,
            );
            
        } catch (\Throwable $e) {
            Log::error('❌ Error al despachar ForwardToN8nWithEnrichmentJob', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Resolver el company slug desde un inbox_id.
     * Cadena de fallback: WhatsAppInstance → Company → inbox name parsing (legacy)
     */
    private function resolveCompanySlugFromInbox(?int $inboxId, array $data): ?string
    {
        if (!$inboxId) return null;

        // 1. Buscar en WhatsAppInstance por chatwoot_inbox_id (cached 10 min)
        $companySlug = \Illuminate\Support\Facades\Cache::remember(
            "inbox_to_company:{$inboxId}",
            600,
            function () use ($inboxId) {
                return \App\Models\WhatsAppInstance::where('chatwoot_inbox_id', $inboxId)
                    ->where('is_active', true)
                    ->value('company_slug');
            }
        );

        if ($companySlug) return $companySlug;

        // 2. Fallback: buscar en Company por chatwoot_inbox_id
        $companySlug = \App\Models\Company::where('chatwoot_inbox_id', $inboxId)->value('slug');
        if ($companySlug) return $companySlug;

        // 3. Fallback legacy: derivar del nombre del inbox (ej: "WhatsApp mi-empresa" → "mi-empresa")
        $inboxName = $data['inbox']['name'] ?? null;
        return $inboxName ? preg_replace('/^WhatsApp\s+/i', '', $inboxName) : null;
    }

    /**
     * �🔥 PREVENIR DUPLICADOS CON CACHE - SOLUCIÓN DEFINITIVA
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
                $chatwootToken = config('chatwoot.platform_token');
                
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
                $chatwootToken = config('chatwoot.platform_token');
                
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

        } catch (\Throwable $e) {
            Log::error('❌ Error en preventDuplicateConversationWithRedis', [
                'error' => $e->getMessage()
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
            $chatwootToken = config('chatwoot.platform_token');
            
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
        } catch (\Throwable $e) {
            Log::error('❌ Excepción archivando conversación', [
                'conversation_id' => $conversationId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * 🔓 HUMAN TAKEOVER: Verificar si el mensaje entrante es la palabra clave de desbloqueo
     * Si es "BOTA" (o la unlock_keyword configurada), eliminar la clave de bloqueo de Redis
     */
    private function handleUnlockKeyword(array $data, int $inboxId, string $content): void
    {
        try {
            // Obtener el teléfono del remitente
            $identifier = $data['conversation']['meta']['sender']['identifier'] ?? 
                         $data['sender']['identifier'] ?? 
                         $data['sender']['phone_number'] ?? null;
            
            if (!$identifier) {
                return;
            }
            
            // Limpiar el número de teléfono usando PhoneNormalizer (consistente con el resto del sistema)
            $phoneNumber = PhoneNormalizer::normalize($identifier);
            
            if (!$phoneNumber) {
                return;
            }
            
            // Obtener la unlock_keyword configurada para este inbox
            $unlockKeyword = $this->getUnlockKeywordForInbox($inboxId);
            $messageUpper = strtoupper(trim($content));
            
            // Si el mensaje es la palabra clave de desbloqueo
            if ($messageUpper === $unlockKeyword) {
                $redis = \Illuminate\Support\Facades\Redis::connection('n8n');
                
                // Verificar si hay un bloqueo activo
                $currentValue = $redis->get($phoneNumber);
                
                if ($currentValue) {
                    // Eliminar el bloqueo
                    $redis->del($phoneNumber);
                    Log::info('🔓 [HUMAN_TAKEOVER_WEBHOOK] Bot REACTIVADO por cliente', [
                        'phone' => $phoneNumber,
                        'keyword' => $unlockKeyword,
                        'previous_value' => $currentValue
                    ]);
                } else {
                    Log::debug('🔓 [HUMAN_TAKEOVER_WEBHOOK] Palabra clave recibida pero no hay bloqueo activo', [
                        'phone' => $phoneNumber,
                        'keyword' => $unlockKeyword
                    ]);
                }
            }
        } catch (\Throwable $e) {
            Log::warning('⚠️ [HUMAN_TAKEOVER_WEBHOOK] Error procesando unlock keyword', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Obtener la unlock_keyword configurada para un inbox específico
     */
    private function getUnlockKeywordForInbox(int $inboxId): string
    {
        // Cache para evitar llamadas HTTP a n8n en cada mensaje entrante
        return \Illuminate\Support\Facades\Cache::remember(
            "unlock_keyword_inbox:{$inboxId}",
            300, // 5 minutos
            function () use ($inboxId) {
                return $this->fetchUnlockKeywordFromN8n($inboxId);
            }
        );
    }

    /**
     * Fetch unlock keyword from n8n workflow (sin cache)
     */
    private function fetchUnlockKeywordFromN8n(int $inboxId): string
    {
        try {
            // Buscar la instancia de WhatsApp asociada al inbox
            $instance = \App\Models\WhatsAppInstance::where('chatwoot_inbox_id', $inboxId)
                ->whereNotNull('n8n_workflow_id')
                ->first();
            
            if (!$instance || !$instance->n8n_workflow_id) {
                return 'BOTA'; // Default
            }
            
            // Obtener workflow de n8n
            $n8nService = app(\App\Services\N8nService::class);
            $result = $n8nService->getWorkflow($instance->n8n_workflow_id);
            
            if (!$result['success'] || !isset($result['data']['nodes'])) {
                return 'BOTA'; // Default
            }
            
            // Buscar el nodo "Verifica Palabra Clave"
            foreach ($result['data']['nodes'] as $node) {
                if (in_array($node['name'], ['Verifica Palabra Clave', 'Verifica Palabra Clave Saliente'])) {
                    $keyword = $node['parameters']['conditions']['conditions'][0]['rightValue'] ?? null;
                    if ($keyword) return strtoupper($keyword);
                }
            }
            
            return 'BOTA'; // Default
        } catch (\Throwable $e) {
            Log::warning('⚠️ Error obteniendo unlock_keyword, usando default BOTA', [
                'inbox_id' => $inboxId,
                'error' => $e->getMessage()
            ]);
            return 'BOTA';
        }
    }
}
