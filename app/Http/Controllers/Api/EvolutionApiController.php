<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\WhatsAppInstance;
use App\Services\EvolutionApiService;
use App\Services\N8nService;
use App\Services\ChatwootService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use App\Events\ConversationUpdated;
use App\Events\WhatsAppStatusChanged;
use App\Helpers\SystemMessagePatterns;
use App\Traits\ResolvesChatwootConfig;

class EvolutionApiController extends Controller
{
    use ResolvesChatwootConfig;
    
    private EvolutionApiService $evolutionApi;
    private N8nService $n8nService;
    private ChatwootService $chatwootService;

    public function __construct(EvolutionApiService $evolutionApi, N8nService $n8nService, ChatwootService $chatwootService)
    {
        $this->evolutionApi = $evolutionApi;
        $this->n8nService = $n8nService;
        $this->chatwootService = $chatwootService;
    }

    /**
     * Obtener el nombre de instancia basado en el usuario/empresa actual
     * SIEMPRE usa el company_slug del usuario autenticado para consistencia
     */
    private function getInstanceName(Request $request): string
    {
        $user = $request->user();

        // Prioridad: company_slug del usuario (coincide con URL del perfil)
        if ($user && $user->company_slug) {
            return $user->company_slug;
        }

        // Fallback: company->id si no hay slug
        if ($user && $user->company?->id) {
            return "company_{$user->company->id}";
        }

        // Último recurso: user_id
        return "user_{$user->id}";
    }

    /**
     * Crear una nueva instancia de WhatsApp
     */
    public function createInstance(Request $request): JsonResponse
    {
        $instanceName = $this->getInstanceName($request);
        $webhookUrl = config('evolution.webhook_url');

        if ($request->has('webhook_url')) {
            $webhookUrl = $request->input('webhook_url');
        }

        // Obtener configuración de Chatwoot de la empresa del usuario
        $chatwootConfig = $this->getChatwootConfigForUser($request->user());

        $result = $this->evolutionApi->createInstance($instanceName, $webhookUrl, $chatwootConfig);

        // Si la instancia se creó exitosamente, registrarla en whatsapp_instances
        if ($result['success']) {
            $user = $request->user();
            // FIX: Obtener company_id desde la relación company() usando company_slug
            $company = $user ? $user->company : null;
            $companyId = $company ? $company->id : null;
            
            // Si no hay company por relación, buscar por el instanceName (que es el slug)
            if (!$companyId) {
                $companyBySlug = Company::findBySlugCached($instanceName);
                $companyId = $companyBySlug ? $companyBySlug->id : null;
            }
            
            if ($companyId) {
                WhatsAppInstance::updateOrCreate(
                    ['instance_name' => $instanceName],
                    [
                        'company_id' => $companyId,
                        'instance_url' => config('evolution.api_url', 'http://evolution_api:8080'),
                        'is_active' => 1,
                    ]
                );
                Log::debug("WhatsApp instance registered", [
                    'instance_name' => $instanceName,
                    'company_id' => $companyId
                ]);
            } else {
                Log::warning("No se pudo determinar company_id para instancia", [
                    'instance_name' => $instanceName,
                    'user_id' => $user ? $user->id : null,
                    'user_company_slug' => $user ? $user->company_slug : null
                ]);
            }
        }

        return response()->json($result, $result['success'] ? 201 : 400);
    }

    /**
     * Obtener configuración de Chatwoot específica para el usuario/empresa
     * 🚀 REFACTORIZADO: Ahora usa el Trait ResolvesChatwootConfig
     */
    private function getChatwootConfigForUser($user): array|bool
    {
        return $this->getChatwootConfigForEvolution($user);
    }
    
    /**
     * Obtener Channel Token existente o crear inbox y obtenerlo
     */
    private function getOrCreateChannelToken(string $accountId, string $inboxName, string $platformToken, string $chatwootUrl): ?string
    {
        try {
            // 1. Buscar en la base de datos de Chatwoot si ya existe el inbox
            $chatwootDb = DB::connection('chatwoot');
            
            // Buscar inbox por nombre
            $inbox = $chatwootDb->table('inboxes')
                ->where('account_id', $accountId)
                ->where('name', $inboxName)
                ->first();
            
            if ($inbox) {
                // Obtener el Channel Token del channel_api
                $channelApi = $chatwootDb->table('channel_api')
                    ->where('id', $inbox->channel_id)
                    ->first();
                
                if ($channelApi && $channelApi->identifier) {
                    Log::debug('✅ Channel Token encontrado en DB', [
                        'inbox_id' => $inbox->id,
                        'inbox_name' => $inboxName
                    ]);
                    return $channelApi->identifier;
                }
            }
            
            // 2. No existe inbox, crear uno via API de Chatwoot
            Log::debug('📦 Creando inbox en Chatwoot...', ['inbox_name' => $inboxName]);
            
            $webhookUrl = config('evolution.api_url') . '/chatwoot/webhook/' . str_replace('WhatsApp ', 'withmia-', strtolower($inboxName));
            $result = $this->chatwootService->createApiInbox((int) $accountId, $platformToken, $inboxName, $webhookUrl);
            
            if ($result['success']) {
                $inboxData = $result['data'] ?? [];
                $newInboxId = $inboxData['id'] ?? null;
                
                if ($newInboxId) {
                    // Obtener Channel Token del inbox recién creado
                    $channelApi = $chatwootDb->table('channel_api')
                        ->join('inboxes', 'channel_api.id', '=', 'inboxes.channel_id')
                        ->where('inboxes.id', $newInboxId)
                        ->select('channel_api.identifier')
                        ->first();
                    
                    if ($channelApi && $channelApi->identifier) {
                        Log::debug('✅ Inbox creado y Channel Token obtenido', [
                            'inbox_id' => $newInboxId,
                            'inbox_name' => $inboxName
                        ]);
                        return $channelApi->identifier;
                    }
                }
            } else {
                Log::warning('No se pudo crear inbox en Chatwoot', [
                    'status' => $result['status'] ?? 'N/A',
                    'error' => $result['error'] ?? 'Unknown'
                ]);
            }
            
            return null;
            
        } catch (\Exception $e) {
            Log::error('Error obteniendo Channel Token', [
                'error' => $e->getMessage(),
                'inbox_name' => $inboxName
            ]);
            return null;
        }
    }

    /**
     * Conectar instancia y obtener QR code
     */
    public function connect(Request $request, ?string $instanceName = null): JsonResponse
    {
        $instanceName = $instanceName ?? $this->getInstanceName($request);

        Log::debug('🔗 Connect request received', ['instance' => $instanceName]);

        // 🧹 LIMPIEZA PREVIA: Verificar si la instancia existe y no está conectada
        // Si existe pero no está conectada, eliminarla primero para generar QR limpio
        $this->cleanupIfNotConnected($instanceName);

        // Obtener configuración de Chatwoot de la empresa del usuario
        $chatwootConfig = $this->getChatwootConfigForUser($request->user());

        // Paso 1: Crear la instancia (con Chatwoot específico de la empresa)
        $createResult = $this->evolutionApi->createInstance($instanceName, null, $chatwootConfig);

        Log::debug('📦 Create instance result', [
            'instance' => $instanceName,
            'success' => $createResult['success'] ?? false,
            'error' => $createResult['error'] ?? null,
            'details' => $createResult['details'] ?? null
        ]);

        // Si la creación falló y NO es porque ya existe, devolver error
        $alreadyExists = str_contains($createResult['error'] ?? '', 'already in use') || 
                         str_contains($createResult['error'] ?? '', 'already exists');
        
        if (!$createResult['success'] && !$alreadyExists) {
            Log::error('Failed to create instance', ['instance' => $instanceName, 'error' => $createResult]);
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to create Evolution instance: ' . ($createResult['error'] ?? 'Unknown error'),
                'details' => $createResult['details'] ?? null,
                'debug' => [
                    'instance_name' => $instanceName,
                    'evolution_url' => config('evolution.api_url'),
                    'create_result' => $createResult,
                    'timestamp' => now()->toIso8601String()
                ]
            ], 400);
        }

        // Pequeña pausa para asegurar que la instancia está lista
        if ($createResult['success']) {
            usleep(500000); // 0.5 segundos
        }

        // Paso 2: Conectar y obtener QR
        $result = $this->evolutionApi->connect($instanceName);

        Log::debug('🔌 Connect result', [
            'instance' => $instanceName,
            'success' => $result['success'] ?? false,
            'has_qr' => isset($result['qr']),
            'error' => $result['error'] ?? null,
            'details' => $result['details'] ?? null
        ]);

        // Devolver 200 si tenemos QR, aunque success sea false
        $hasQr = isset($result['qr']) && !empty($result['qr']);
        $statusCode = ($result['success'] || $hasQr) ? 200 : 400;

        // Incluir más información en caso de error
        if ($statusCode === 400) {
            $result['debug'] = [
                'instance_name' => $instanceName,
                'evolution_url' => config('evolution.api_url'),
                'create_success' => $createResult['success'] ?? false,
                'timestamp' => now()->toIso8601String()
            ];
        }

        return response()->json($result, $statusCode);
    }

    /**
     * 🧹 Limpiar instancia si existe pero no está conectada
     * Esto soluciona el problema de QR que no se genera después de tiempo
     */
    private function cleanupIfNotConnected(string $instanceName): void
    {
        try {
            // Verificar estado actual de la instancia usando el servicio
            $statusResult = $this->evolutionApi->getStatus($instanceName);

            if (!$statusResult['success']) {
                // La instancia no existe, perfecto - se creará nueva
                Log::debug('🧹 Instancia no existe, se creará nueva', ['instance' => $instanceName]);
                return;
            }

            $data = $statusResult['data'] ?? [];
            $state = $data['instance']['state'] ?? $data['state'] ?? 'close';

            Log::debug('🔍 Estado actual de instancia', [
                'instance' => $instanceName,
                'state' => $state
            ]);

            // Si está conectada (open), verificar si necesita workflow de n8n
            if ($state === 'open') {
                Log::debug('✅ Instancia ya conectada, no se elimina', ['instance' => $instanceName]);
                
                // 🚀 CREAR WORKFLOW si no existe
                $this->ensureN8nWorkflowExists($instanceName);
                
                return;
            }

            // Si NO está conectada (close, connecting, etc), eliminarla para QR limpio
            Log::warning('🗑️ Eliminando instancia no conectada para generar QR nuevo', [
                'instance' => $instanceName,
                'state' => $state
            ]);

            $this->evolutionApi->deleteInstance($instanceName);

            Log::debug('✅ Instancia eliminada, se generará QR nuevo', ['instance' => $instanceName]);

            // Pausa más larga para asegurar que Evolution API procesó la eliminación
            sleep(2); // 2 segundos

        } catch (\Exception $e) {
            Log::warning('🧹 Error en cleanup (no crítico)', [
                'instance' => $instanceName,
                'error' => $e->getMessage()
            ]);
            // No lanzar excepción, continuar con el flujo normal
        }
    }

    /**
     * Obtener estado de conexión
     */
    public function getStatus(Request $request, ?string $instanceName = null): JsonResponse
    {
        $instanceName = $instanceName ?? $this->getInstanceName($request);
        Log::debug('WhatsApp Status Check', ['instanceName' => $instanceName]);
        $result = $this->evolutionApi->getStatus($instanceName);
        Log::debug('WhatsApp Status Result', ['result' => $result]);

        // Broadcast status change to all connected clients (CON RATE LIMITING)
        if ($result['success'] ?? false) {
            try {
                $user = $request->user();
                $state = $result['state'] ?? 'unknown';
                
                if ($user && $user->company_slug) {
                    // 🔒 RATE LIMITING: Solo broadcast si el estado cambió
                    $cacheKey = "status_broadcast_{$instanceName}";
                    $lastBroadcastState = Cache::get($cacheKey);
                    
                    if ($lastBroadcastState !== $state) {
                        Cache::put($cacheKey, $state, 30); // Cache por 30 segundos
                        
                        broadcast(new WhatsAppStatusChanged(
                            $user->company_slug,
                            $instanceName,
                            $state,
                            $result['qrCode'] ?? null,
                            $result['profileInfo'] ?? null
                        ));
                        
                        Log::debug('📡 WhatsAppStatusChanged broadcast (estado cambió)', [
                            'instance' => $instanceName,
                            'state' => $state,
                            'previous' => $lastBroadcastState
                        ]);
                    }
                }
                
                // 🔄 AUTO-SYNC: Cuando la conexión está activa, sincronizar el inbox_id de Chatwoot
                // Esto es CRÍTICO para que la app lea del inbox correcto después de reconectar
                if ($user && $state === 'open') {
                    $this->syncChatwootInboxIfNeeded($instanceName, $user);
                    
                    // 🚀 AUTO-CREAR WORKFLOW: Cuando la instancia está conectada, asegurar que existe workflow
                    $this->ensureN8nWorkflowExists($instanceName);
                }
            } catch (\Exception $e) {
                Log::error('Error broadcasting status check', ['error' => $e->getMessage()]);
            }
        }

        return response()->json($result);
    }

    /**
     * 🔄 Sincronizar inbox_id de Chatwoot si es necesario
     * Se ejecuta cuando WhatsApp está conectado para asegurar que
     * la app siempre lee del inbox correcto (incluso después de reconectar)
     */
    private function syncChatwootInboxIfNeeded(string $instanceName, $user): void
    {
        try {
            // Verificar si ya sincronizamos recientemente (evitar llamadas excesivas)
            $cacheKey = "inbox_sync_{$instanceName}";
            if (\Cache::has($cacheKey)) {
                return; // Ya sincronizado recientemente
            }

            // Sincronizar inbox_id
            $syncResult = $this->evolutionApi->syncChatwootInboxId($instanceName, $user);
            
            if ($syncResult['success']) {
                // Marcar como sincronizado por 1 hora
                \Cache::put($cacheKey, true, 3600);
                
                Log::debug('✅ Chatwoot inbox_id synchronized automatically', [
                    'instance' => $instanceName,
                    'user_id' => $user->id,
                    'inbox_id' => $syncResult['inbox_id']
                ]);
            } else {
                Log::warning('⚠️ Could not sync Chatwoot inbox_id', [
                    'instance' => $instanceName,
                    'error' => $syncResult['error']
                ]);
                
                // 🔧 FIX: Si el inbox no existe en Chatwoot, limpiar el inbox_id guardado
                // Esto forzará auto_create=true en la próxima reconexión
                if (str_contains($syncResult['error'] ?? '', 'not found')) {
                    $company = $user->company;
                    if ($company && $company->chatwoot_inbox_id) {
                        Log::warning('🗑️ Clearing stale chatwoot_inbox_id - inbox does not exist in Chatwoot', [
                            'instance' => $instanceName,
                            'old_inbox_id' => $company->chatwoot_inbox_id
                        ]);
                        $company->chatwoot_inbox_id = null;
                        $company->save();
                        
                        // También limpiar del usuario
                        if ($user->chatwoot_inbox_id) {
                            $user->chatwoot_inbox_id = null;
                            $user->save();
                        }
                        
                        // Limpiar cache para forzar recreación
                        \Cache::forget("inbox_sync_{$instanceName}");
                        \Cache::forget("whatsapp_status_{$instanceName}");
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('Exception syncing Chatwoot inbox_id', [
                'instance' => $instanceName,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Desconectar instancia (logout)
     */
    public function disconnect(Request $request, ?string $instanceName = null): JsonResponse
    {
        $instanceName = $instanceName ?? $this->getInstanceName($request);
        
        // 🔄 Invalidar cache de sincronización de inbox para forzar re-sync al reconectar
        \Cache::forget("inbox_sync_{$instanceName}");
        
        // 🗑️ ELIMINAR WORKFLOW DE N8N al desconectar WhatsApp
        $this->deleteN8nWorkflowForInstance($instanceName);
        
        $result = $this->evolutionApi->disconnect($instanceName);

        return response()->json($result, $result['success'] ? 200 : 400);
    }
    
    /**
     * Eliminar workflow de n8n asociado a una instancia de WhatsApp
     */
    private function deleteN8nWorkflowForInstance(string $instanceName): void
    {
        try {
            $instance = WhatsAppInstance::where('instance_name', $instanceName)->first();
            
            if (!$instance || empty($instance->n8n_workflow_id)) {
                Log::debug('🔍 No hay workflow de n8n para eliminar', [
                    'instance' => $instanceName
                ]);
                return;
            }
            
            Log::debug('🗑️ Eliminando workflow de n8n al desconectar WhatsApp', [
                'instance' => $instanceName,
                'workflow_id' => $instance->n8n_workflow_id
            ]);
            
            // Eliminar workflow de n8n
            try {
                $this->n8nService->deleteWorkflow($instance->n8n_workflow_id);
                Log::debug('✅ Workflow eliminado de n8n exitosamente', [
                    'workflow_id' => $instance->n8n_workflow_id
                ]);
            } catch (\Exception $e) {
                Log::warning('⚠️ Error eliminando workflow de n8n (puede que ya no exista)', [
                    'workflow_id' => $instance->n8n_workflow_id,
                    'error' => $e->getMessage()
                ]);
            }
            
            // Limpiar referencias en la base de datos
            WhatsAppInstance::where('instance_name', $instanceName)
                ->update([
                    'n8n_workflow_id' => null,
                    'n8n_webhook_url' => null,
                ]);
            
            Log::debug('✅ Referencias de workflow limpiadas en base de datos', [
                'instance' => $instanceName
            ]);
            
        } catch (\Exception $e) {
            Log::error('❌ Error eliminando workflow de n8n', [
                'instance' => $instanceName,
                'error' => $e->getMessage()
            ]);
            // No lanzar excepción para no interrumpir el proceso de desconexión
        }
    }

    /**
     * Eliminar instancia completamente
     */
    public function deleteInstance(Request $request, ?string $instanceName = null): JsonResponse
    {
        $instanceName = $instanceName ?? $this->getInstanceName($request);
        
        // 🔄 Invalidar cache de sincronización de inbox
        \Cache::forget("inbox_sync_{$instanceName}");
        
        $result = $this->evolutionApi->deleteInstance($instanceName);

        return response()->json($result, $result['success'] ? 200 : 400);
    }

    /**
     * 🔄 Sincronizar inbox_id de Chatwoot manualmente
     * Busca el inbox en Chatwoot y actualiza el usuario/empresa
     */
    public function syncChatwootInbox(Request $request, ?string $instanceName = null): JsonResponse
    {
        $instanceName = $instanceName ?? $this->getInstanceName($request);
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'User not authenticated'
            ], 401);
        }

        // Invalidar cache para forzar re-sync
        \Cache::forget("inbox_sync_{$instanceName}");
        
        // Ejecutar sincronización
        $result = $this->evolutionApi->syncChatwootInboxId($instanceName, $user);
        
        if ($result['success']) {
            return response()->json([
                'success' => true,
                'message' => 'Inbox synchronized successfully',
                'inbox_id' => $result['inbox_id'],
                'user_id' => $user->id,
                'company_id' => $user->company?->id
            ]);
        }

        return response()->json([
            'success' => false,
            'error' => $result['error'] ?? 'Failed to sync inbox'
        ], 400);
    }

    /**
     * Obtener configuraciones de la instancia (settings)
     */
    public function getSettings(Request $request, ?string $instanceName = null): JsonResponse
    {
        $instanceName = $instanceName ?? $this->getInstanceName($request);
        
        try {
            $result = $this->evolutionApi->getInstanceSettings($instanceName);

            // If instance doesn't exist, return cached or default settings
            if (!$result['success']) {
                Log::debug('Instance not found, returning cached or default settings', ['instance' => $instanceName]);
                
                // Check if we have cached pending settings
                $cachedSettings = \Cache::get("whatsapp_pending_settings_{$instanceName}");
                
                if ($cachedSettings) {
                    return response()->json([
                        'success' => true,
                        'settings' => $cachedSettings,
                        'instanceExists' => false,
                        'fromCache' => true
                    ]);
                }
                
                return response()->json([
                    'success' => true,
                    'settings' => [
                        'rejectCall' => false,
                        'groupsIgnore' => false,
                        'alwaysOnline' => false,
                        'readMessages' => true,
                        'syncFullHistory' => false,
                        'readStatus' => true,
                        'daysLimitImportMessages' => 7
                    ],
                    'instanceExists' => false
                ]);
            }

            $data = $result['data'] ?? [];
            
            return response()->json([
                'success' => true,
                'settings' => [
                    'rejectCall' => $data['rejectCall'] ?? false,
                    'groupsIgnore' => $data['groupsIgnore'] ?? false,
                    'alwaysOnline' => $data['alwaysOnline'] ?? false,
                    'readMessages' => $data['readMessages'] ?? true,
                    'syncFullHistory' => $data['syncFullHistory'] ?? false,  // Default false
                    'readStatus' => $data['readStatus'] ?? true,
                    'daysLimitImportMessages' => $data['daysLimitImportMessages'] ?? 7  // Default 7 days
                ],
                'instanceExists' => true
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting WhatsApp settings', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Actualizar configuraciones de la instancia (settings)
     */
    public function updateSettings(Request $request, ?string $instanceName = null): JsonResponse
    {
        $instanceName = $instanceName ?? $this->getInstanceName($request);
        
        Log::debug('updateSettings called', ['instanceName' => $instanceName, 'input' => $request->all()]);

        try {
            $settings = [
                'rejectCall' => (bool) $request->input('rejectCall', false),
                'msgCall' => $request->input('msgCall', ''),
                'groupsIgnore' => (bool) $request->input('groupsIgnore', false),
                'alwaysOnline' => (bool) $request->input('alwaysOnline', false),
                'readMessages' => (bool) $request->input('readMessages', true),
                'syncFullHistory' => (bool) $request->input('syncFullHistory', false),
                'readStatus' => (bool) $request->input('readStatus', true),
                'daysLimitImportMessages' => (int) $request->input('daysLimitImportMessages', 7)
            ];

            // Always save to cache first (for when instance doesn't exist or is created later)
            \Cache::put("whatsapp_pending_settings_{$instanceName}", $settings, now()->addHours(24));
            
            Log::debug('Settings saved to cache', ['instance' => $instanceName, 'settings' => $settings]);

            // Try to update on Evolution API if instance exists
            $result = $this->evolutionApi->updateInstanceSettings($instanceName, $settings);

            if ($result['success']) {
                Log::debug('WhatsApp settings updated on Evolution API', ['instance' => $instanceName]);
                return response()->json([
                    'success' => true,
                    'message' => 'Settings updated successfully',
                    'settings' => $settings,
                    'instanceExists' => true
                ]);
            }

            // If we get here, instance doesn't exist but settings are cached
            return response()->json([
                'success' => true,
                'message' => 'Settings saved for when WhatsApp is connected',
                'settings' => $settings,
                'instanceExists' => false
            ]);

        } catch (\Exception $e) {
            Log::error('Error updating WhatsApp settings', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Enviar mensaje de texto
     */
    public function sendMessage(Request $request, ?string $instanceName = null): JsonResponse
    {
        $request->validate([
            'number' => 'required|string',
            'message' => 'required|string'
        ]);

        $instanceName = $instanceName ?? $this->getInstanceName($request);

        $result = $this->evolutionApi->sendTextMessage(
            $instanceName,
            $request->input('number'),
            $request->input('message')
        );

        return response()->json($result, $result['success'] ? 200 : 400);
    }

    /**
     * Listar todas las instancias
     */
    public function listInstances(): JsonResponse
    {
        $result = $this->evolutionApi->listInstances();

        return response()->json($result);
    }

    /**
     * Configurar integraci??n con Chatwoot
     */
    public function setChatwoot(Request $request, ?string $instanceName = null): JsonResponse
    {
        $request->validate([
            'account_id' => 'required|string',
            'token' => 'required|string',
            'url' => 'nullable|url'
        ]);

        $instanceName = $instanceName ?? $this->getInstanceName($request);

        $result = $this->evolutionApi->setChatwootIntegration(
            $instanceName,
            $request->input('account_id'),
            $request->input('token'),
            $request->input('url', config('evolution.chatwoot.url')),
            $request->input('sign_msg', true),
            $request->input('reopen_conversation', true),
            $request->input('conversation_pending', false)
        );

        return response()->json($result, $result['success'] ? 200 : 400);
    }

    /**
     * Webhook receiver para eventos de Evolution API
     * 
     * Evolution API ya maneja la creaci??n de contactos y conversaciones en Chatwoot.
     * Este webhook solo registra los eventos y los transmite via Reverb para actualizaci??n en tiempo real.
     */
    public function webhook(Request $request): JsonResponse
    {
        $event = $request->input('event');
        $instanceName = $request->input('instance');
        $data = $request->input('data');

        // 🚀 FAST REJECT: Ignorar eventos no críticos inmediatamente
        // Esto evita procesamiento innecesario de eventos spam
        $ignoredEvents = [
            'presence.update',
            'PRESENCE_UPDATE',
            'chats.set',
            'CHATS_SET',
            'contacts.set',
            'CONTACTS_SET',
            'labels.edit',
            'LABELS_EDIT',
            'messages.edited',
            'MESSAGES_EDITED',
            'groups.update',
            'GROUPS_UPDATE',
        ];
        
        if (in_array($event, $ignoredEvents)) {
            return response()->json(['status' => 'ignored']);
        }

        // 🔒 RATE LIMIT GLOBAL: Máximo 1 webhook por instancia cada 2 segundos
        // Esto previene que el servidor se sature con webhooks repetidos
        $rateLimitKey = "webhook_rate_{$instanceName}_{$event}";
        if (Cache::has($rateLimitKey)) {
            return response()->json(['status' => 'rate_limited']);
        }
        Cache::put($rateLimitKey, true, 2); // 2 segundos

        Log::debug('Evolution API Webhook received', [
            'event' => $event,
            'instance' => $instanceName
        ]);

        // REENVIO A N8N (usando red interna de Railway)
        try {
            $instance = WhatsAppInstance::where('instance_name', $instanceName)->active()->first();
            
            // Si la instancia no existe en BD, crearla automáticamente
            if (!$instance) {
                Log::debug('📝 Instancia no encontrada en BD, creándola automáticamente...', [
                    'instance' => $instanceName,
                    'event' => $event
                ]);
                
                // 🔧 FIX: Buscar company_id por el slug del instanceName
                // El instanceName ES el slug de la empresa (ej: salud-y-belleza-ehppbu)
                $company = Company::findBySlugCached($instanceName);
                $companyId = $company ? $company->id : null;
                
                if (!$companyId) {
                    Log::error('❌ No se encontró empresa para instancia - NO SE CREARÁ', [
                        'instance' => $instanceName,
                        'searched_slug' => $instanceName
                    ]);
                    // NO crear instancia sin company_id válido para evitar problemas de enrutamiento
                    return response()->json(['status' => 'error', 'message' => 'Company not found for instance']);
                }
                
                WhatsAppInstance::create([
                    'instance_name' => $instanceName,
                    'company_id' => $companyId,
                    'instance_url' => config('evolution.base_url'),
                    'is_active' => 1,
                ]);
                
                Log::debug('✅ Instancia creada en BD con company correcta', [
                    'instance' => $instanceName, 
                    'company_id' => $companyId,
                    'company_name' => $company->name
                ]);
                
                // Recargar instancia
                $instance = WhatsAppInstance::where('instance_name', $instanceName)->active()->first();
            }
            
            // 🚀 AUTO-CREAR WORKFLOW solo cuando WhatsApp se conecta (connection.update con estado open)
            // NO crear en cualquier evento para evitar recrear el workflow después de desconectar
            $shouldCreateWorkflow = false;
            if ($event === 'connection.update' || $event === 'CONNECTION_UPDATE') {
                $state = $data['state'] ?? ($data['status'] ?? null);
                if ($state === 'open' || $state === 'connected') {
                    $shouldCreateWorkflow = true;
                }
            }
            
            if ($shouldCreateWorkflow && $instance && empty($instance->n8n_workflow_id)) {
                Log::debug('🤖 WhatsApp conectado, creando workflow automáticamente...', [
                    'instance' => $instanceName,
                    'event' => $event
                ]);
                $this->createN8nWorkflowForInstance($instance);
                // Recargar instancia para obtener el nuevo workflow_id
                $instance = WhatsAppInstance::where('instance_name', $instanceName)->active()->first();
            }
            
            // 📨 NO reenviar a n8n directamente desde aquí
            // El flujo correcto es: Evolution → Chatwoot (integración nativa) → n8n (webhook de Chatwoot)
            // Esto evita duplicados y asegura que n8n reciba el formato correcto de Chatwoot
            $eventsToForward = ['messages.upsert', 'MESSAGES_UPSERT'];
            
            if (in_array($event, $eventsToForward)) {
                // Solo log para debug, NO reenviamos a n8n
                Log::debug('📨 Mensaje recibido de Evolution (Chatwoot lo reenviará a n8n)', [
                    'instance' => $instanceName,
                    'event' => $event,
                    'fromMe' => $data['key']['fromMe'] ?? false
                ]);
            } else {
                Log::debug('🔇 Evento ignorado', ['event' => $event]);
            }
        } catch (\Exception $e) { 
            Log::warning('Error n8n (non-blocking)', ['e' => $e->getMessage()]); 
        }


        try {
            switch ($event) {
                case 'messages.upsert':
                case 'MESSAGES_UPSERT':
                    $this->handleMessageUpsert($data, $instanceName);
                    break;

                case 'messages.update':
                case 'MESSAGES_UPDATE':
                    $this->handleMessageUpdate($data, $instanceName);
                    break;

                case 'connection.update':
                case 'CONNECTION_UPDATE':
                    $this->handleConnectionUpdate($data, $instanceName);
                    break;

                default:
                    Log::debug('Unhandled webhook event', ['event' => $event]);
                    break;
            }
        } catch (\Exception $e) {
            Log::error('Error processing webhook', [
                'event' => $event,
                'error' => $e->getMessage()
            ]);
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Verificar si es un mensaje de sistema que debe ser ignorado
     * 🚀 REFACTORIZADO: Usa helper centralizado SystemMessagePatterns
     */
    private function isSystemMessage(string $messageText, array $data): bool
    {
        // Usar helper centralizado
        if (SystemMessagePatterns::isSystemMessage($messageText)) {
            return true;
        }
        
        // Mensajes de protocolo de WhatsApp (no son mensajes reales)
        if (isset($data['message']['protocolMessage'])) {
            return true;
        }
        
        // Mensajes de status@broadcast (actualizaciones de estado)
        $remoteJid = $data['key']['remoteJid'] ?? null;
        if (SystemMessagePatterns::isSystemSender($remoteJid)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Verificar si un mensaje ya fue procesado (deduplicación)
     */
    private function isMessageAlreadyProcessed(array $data): bool
    {
        // Usar el messageId único de WhatsApp para deduplicación
        $messageId = $data['key']['id'] ?? null;
        if (!$messageId) {
            return false; // Sin ID, no podemos deduplicar
        }
        
        $cacheKey = 'processed_msg_' . $messageId;
        
        // Si ya está en caché, fue procesado
        if (Cache::has($cacheKey)) {
            Log::debug('🔄 Mensaje ya procesado (deduplicado)', ['message_id' => $messageId]);
            return true;
        }
        
        // Marcar como procesado por 60 segundos (suficiente para evitar duplicados)
        Cache::put($cacheKey, true, 60);
        return false;
    }
    
    /**
     * Manejar evento de nuevo mensaje
     */
    /**
     * Manejar mensaje entrante de Evolution API
     * 
     * ARQUITECTURA SIMPLIFICADA (v2):
     * - Evolution API crea contactos/conversaciones en Chatwoot (integración nativa)
     * - Este webhook SOLO notifica al frontend vía Reverb
     * - NO duplicamos la creación de contactos/conversaciones
     */
    private function handleMessageUpsert(array $data, string $instanceName): void
    {
        $phoneNumber = $data['key']['remoteJid'] ?? null;
        $fromMe = $data['key']['fromMe'] ?? false;
        $messageId = $data['key']['id'] ?? null;
        $messageText = $data['message']['conversation'] 
            ?? $data['message']['extendedTextMessage']['text'] 
            ?? $data['message']['imageMessage']['caption'] 
            ?? '';

        if (!$phoneNumber) {
            Log::warning('Mensaje sin número de teléfono', ['data' => $data]);
            return;
        }

        // Limpiar el número de teléfono (quitar @s.whatsapp.net)
        $cleanPhone = str_replace('@s.whatsapp.net', '', $phoneNumber);

        // 🔄 DEDUPLICACIÓN: Verificar si ya procesamos este mensaje
        if ($this->isMessageAlreadyProcessed($data)) {
            Log::debug('⏭️ Mensaje duplicado ignorado', [
                'message_id' => $messageId,
                'phone' => $cleanPhone
            ]);
            return;
        }
        
        // 🚫 FILTRO DE MENSAJES DE SISTEMA
        if ($this->isSystemMessage($messageText, $data)) {
            Log::debug('🔇 Mensaje de sistema ignorado', [
                'message' => substr($messageText, 0, 50),
                'phone' => $cleanPhone
            ]);
            return;
        }

        Log::debug('📨 Nuevo mensaje recibido', [
            'phone' => $phoneNumber,
            'clean_phone' => $cleanPhone,
            'from_me' => $fromMe,
            'message' => $messageText,
            'message_id' => $messageId,
            'instance' => $instanceName
        ]);

        // 🛑 NO notificar si el mensaje es de nosotros (fromMe: true)
        if ($fromMe) {
            Log::debug('⏭️ Mensaje enviado por nosotros, no se notifica', [
                'phone' => $cleanPhone,
                'from_me' => true
            ]);
            return;
        }

        // 🏢 OBTENER COMPANY Y CHATWOOT ACCOUNT_ID DESDE LA INSTANCIA
        // Esto asegura que cada empresa reciba sus propios mensajes
        // ⚠️ CRÍTICO: NO usar fallback a account_id=1, debe venir de la instancia
        $accountId = null;
        $inboxId = null;
        $companyId = null;
        
        try {
            // Buscar la instancia en nuestra BD
            $instance = WhatsAppInstance::where('instance_name', $instanceName)
                ->active()
                ->first();
            
            if ($instance) {
                $companyId = $instance->company_id;
                $inboxId = $instance->chatwoot_inbox_id ?? null;
                
                // Obtener el chatwoot_account_id de la empresa
                $company = Company::find($companyId);
                
                if ($company && $company->chatwoot_account_id) {
                    $accountId = $company->chatwoot_account_id;
                    Log::debug('🏢 Account ID obtenido de company', [
                        'instance' => $instanceName,
                        'company_id' => $companyId,
                        'company_name' => $company->name,
                        'chatwoot_account_id' => $accountId
                    ]);
                } else {
                    Log::error('❌ CRÍTICO: Empresa sin chatwoot_account_id configurado', [
                        'instance' => $instanceName,
                        'company_id' => $companyId,
                        'company_name' => $company->name ?? 'N/A'
                    ]);
                    return; // No procesar mensaje sin account_id válido
                }
            } else {
                Log::error('❌ CRÍTICO: Instancia no encontrada en BD - mensaje no será procesado', [
                    'instance' => $instanceName,
                    'message_id' => $messageId
                ]);
                return; // No procesar mensaje de instancia desconocida
            }
        } catch (\Exception $e) {
            Log::error('Error obteniendo company/account_id', ['error' => $e->getMessage()]);
            return; // No procesar en caso de error
        }

        // 📡 BROADCAST DESHABILITADO
        // El webhook de Chatwoot ya maneja el broadcast de mensajes entrantes.
        // Evolution API envía el mensaje a Chatwoot (integración nativa),
        // y luego Chatwoot dispara su webhook que hace el broadcast.
        // Si hacemos broadcast aquí, el mensaje aparece DUPLICADO en el frontend.
        
        Log::debug('📡 Mensaje recibido de Evolution - Chatwoot webhook hará el broadcast', [
            'account_id' => $accountId,
            'inbox_id' => $inboxId,
            'phone' => $cleanPhone,
            'message_preview' => substr($messageText, 0, 50)
        ]);
    }

    /**
     * Manejar actualización de mensaje (leído, entregado, etc)
     */
    private function handleMessageUpdate(array $data, string $instanceName): void
    {
        $fromMe = $data['fromMe'] ?? false;

        Log::debug('📝 Actualización de mensaje', [
            'data' => $data,
            'instance' => $instanceName,
            'from_me' => $fromMe
        ]);

        // 🛑 NO notificar si el mensaje es de nosotros (fromMe: true)
        if ($fromMe) {
            Log::debug('⏭️ Actualización de mensaje propio, no se notifica', [
                'from_me' => true
            ]);
            return;
        }

        // 🏢 OBTENER ACCOUNT_ID CORRECTO DESDE LA INSTANCIA
        // ⚠️ CRÍTICO: NO usar fallback a account_id=1
        $accountId = null;
        $inboxId = null;
        
        try {
            $instance = WhatsAppInstance::where('instance_name', $instanceName)
                ->active()
                ->first();
            
            if ($instance) {
                $inboxId = $instance->chatwoot_inbox_id ?? null;
                
                $company = Company::find($instance->company_id);
                
                if ($company && $company->chatwoot_account_id) {
                    $accountId = $company->chatwoot_account_id;
                } else {
                    Log::warning('⚠️ Empresa sin chatwoot_account_id para update', [
                        'instance' => $instanceName,
                        'company_id' => $instance->company_id
                    ]);
                    return; // No procesar sin account_id válido
                }
            } else {
                Log::warning('⚠️ Instancia no encontrada para update', ['instance' => $instanceName]);
                return; // No procesar instancia desconocida
            }
        } catch (\Exception $e) {
            Log::error('Error obteniendo account_id para update', ['error' => $e->getMessage()]);
            return;
        }

        try {
            broadcast(new ConversationUpdated(
                $data,
                $inboxId,
                $accountId
            ))->toOthers();

            Log::debug('✅ Evento ConversationUpdated broadcasted', [
                'account_id' => $accountId,
                'inbox_id' => $inboxId
            ]);
        } catch (\Exception $e) {
            Log::error('Error broadcasting update event', [
                'error' => $e->getMessage(),
                'line' => $e->getLine()
            ]);
        }
    }

    /**
     * Manejar cambio de estado de conexión
     * Con rate limiting para evitar spam de eventos
     */
    private function handleConnectionUpdate(array $data, string $instanceName): void
    {
        $state = $data['state'] ?? 'unknown';

        // 🔒 RATE LIMITING: Solo procesar si el estado cambió o han pasado 30 segundos
        $cacheKey = "connection_state_{$instanceName}";
        $lastState = Cache::get($cacheKey);
        
        // Si el estado no cambió y fue procesado recientemente, ignorar
        if ($lastState === $state) {
            Log::debug('⏭️ Connection update ignorado (rate limited)', [
                'instance' => $instanceName,
                'state' => $state
            ]);
            return;
        }
        
        // Guardar estado por 30 segundos
        Cache::put($cacheKey, $state, 30);

        Log::debug('📡 Cambio de conexión', [
            'instance' => $instanceName,
            'state' => $state,
            'previous_state' => $lastState,
            'data' => $data
        ]);

        try {
            // Obtener company_slug y account_id desde la instancia
            $instance = WhatsAppInstance::where('instance_name', $instanceName)
                ->active()
                ->first();

            if ($instance) {
                $companySlug = $instance->company_slug ?? $instance->company_id;
                
                // Obtener account_id de la empresa (NO hardcodeado)
                $company = Company::find($instance->company_id);
                $accountId = $company->chatwoot_account_id ?? null;
                $inboxId = $instance->chatwoot_inbox_id ?? null;
                
                // 🚀 CREAR WORKFLOW EN N8N cuando se conecta WhatsApp por primera vez
                if (($state === 'open' || $state === 'connected') && empty($instance->n8n_workflow_id)) {
                    $this->createN8nWorkflowForInstance($instance);
                }
                
                // 🔧 FIX: Actualizar Evolution con el Channel Token correcto
                // La instancia se crea con Platform Token (para crear inbox), pero Evolution
                // necesita el Channel Token (identifier) para enviar mensajes a Chatwoot
                if ($state === 'open' || $state === 'connected') {
                    $this->ensureCorrectChatwootToken($instanceName);
                }
                
                // Disparar evento de WhatsApp con el company_slug correcto
                broadcast(new WhatsAppStatusChanged(
                    $companySlug,
                    $instanceName,
                    $state,
                    $data['qrcode'] ?? null,
                    $data['profileInfo'] ?? null
                ));

                Log::debug('✅ WhatsAppStatusChanged event broadcasted', [
                    'company' => $companySlug,
                    'instance' => $instanceName,
                    'state' => $state
                ]);
                
                // Broadcast de conexión con account_id correcto de la empresa
                if ($accountId) {
                    broadcast(new ConversationUpdated(
                        ['state' => $state, 'instance' => $instanceName],
                        $inboxId,
                        $accountId
                    ))->toOthers();
                    
                    Log::debug('✅ Evento de conexión broadcasted', [
                        'account_id' => $accountId,
                        'inbox_id' => $inboxId
                    ]);
                }
            } else {
                Log::warning('⚠️ Instancia no encontrada en BD para connection update', [
                    'instance' => $instanceName
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error broadcasting connection event', [
                'error' => $e->getMessage(),
                'line' => $e->getLine()
            ]);
        }
    }

    /**
     * Crear workflow de n8n para una instancia de WhatsApp
     */
    private function createN8nWorkflowForInstance($instance): void
    {
        try {
            $company = Company::find($instance->company_id);

            if (!$company) {
                Log::warning('Company no encontrada para instancia', [
                    'instance' => $instance->instance_name,
                    'company_id' => $instance->company_id
                ]);
                return;
            }

            $result = $this->n8nService->createBotWorkflow($company, $instance->instance_name);

            if ($result['success']) {
                // Guardar referencia en la base de datos
                WhatsAppInstance::where('id', $instance->id)
                    ->update([
                        'n8n_workflow_id' => $result['workflow_id'],
                        'n8n_webhook_url' => $result['webhook_url'],
                    ]);

                Log::debug('Workflow de n8n creado para instancia', [
                    'workflow_id' => $result['workflow_id'],
                    'instance' => $instance->instance_name
                ]);

                // Configurar webhook de Chatwoot
                $this->configureChatwootWebhook($instance, $result['webhook_url']);
            } else {
                Log::warning('No se pudo crear workflow en n8n', [
                    'error' => $result['error'] ?? 'Unknown',
                    'instance' => $instance->instance_name
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error creando workflow de n8n', [
                'error' => $e->getMessage(),
                'instance' => $instance->instance_name
            ]);
        }
    }

    /**
     * Asegurar que existe un workflow de n8n para la instancia
     */
    private function ensureN8nWorkflowExists(string $instanceName): void
    {
        try {
            $instance = WhatsAppInstance::where('instance_name', $instanceName)
                ->active()
                ->first();

            if (!$instance) {
                Log::debug('No se encontró instancia en DB para crear workflow', ['instance' => $instanceName]);
                return;
            }

            // Si ya tiene workflow Y webhook_url, no hacer nada
            if (!empty($instance->n8n_workflow_id) && !empty($instance->n8n_webhook_url)) {
                Log::debug('Instancia ya tiene workflow de n8n completo', [
                    'instance' => $instanceName,
                    'workflow_id' => $instance->n8n_workflow_id,
                    'webhook_url' => $instance->n8n_webhook_url
                ]);
                return;
            }

            // Si tiene workflow_id pero no webhook_url, regenerar el webhook_url
            if (!empty($instance->n8n_workflow_id) && empty($instance->n8n_webhook_url)) {
                $webhookUrl = $this->n8nService->getWebhookUrl($instanceName);
                WhatsAppInstance::where('id', $instance->id)
                    ->update([
                        'n8n_webhook_url' => $webhookUrl,
                    ]);
                Log::debug('🔧 Webhook URL regenerado para instancia existente', [
                    'instance' => $instanceName,
                    'workflow_id' => $instance->n8n_workflow_id,
                    'webhook_url' => $webhookUrl
                ]);
                return;
            }

            Log::debug('🤖 Creando workflow de n8n para instancia conectada', [
                'instance' => $instanceName,
                'company_id' => $instance->company_id
            ]);

            // Crear workflow
            $this->createN8nWorkflowForInstance($instance);

        } catch (\Exception $e) {
            Log::error('Error en ensureN8nWorkflowExists', [
                'instance' => $instanceName,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * 🎯 Configurar webhook de Chatwoot para apuntar al workflow de n8n
     * Esto se llama automáticamente después de crear el workflow
     */
    private function configureChatwootWebhook($instance, string $webhookUrl): void
    {
        try {
            // Obtener información de la empresa
            $company = Company::find($instance->company_id);
            
            if (!$company) {
                Log::warning('No se encontró empresa para configurar webhook Chatwoot', [
                    'instance' => $instance->instance_name,
                    'company_id' => $instance->company_id
                ]);
                return;
            }

            // Obtener inbox_id de la instancia
            $inboxId = $instance->chatwoot_inbox_id ?? null;
            
            if (!$inboxId) {
                Log::debug('📞 Buscando inbox de Chatwoot por nombre de instancia', [
                    'instance' => $instance->instance_name
                ]);
                
                // Buscar inbox por nombre
                $inbox = $this->chatwootService->findInboxByName($instance->instance_name);
                
                if ($inbox) {
                    $inboxId = $inbox['id'];
                    
                    // Guardar inbox_id en la instancia para futuras referencias
                    WhatsAppInstance::where('id', $instance->id)
                        ->update([
                            'chatwoot_inbox_id' => $inboxId,
                        ]);
                }
            }

            if (!$inboxId) {
                Log::warning('No se encontró inbox de Chatwoot para la instancia', [
                    'instance' => $instance->instance_name,
                    'company' => $company->slug
                ]);
                return;
            }

            // Configurar webhook en Chatwoot
            $result = $this->chatwootService->configureInboxWebhook($inboxId, $webhookUrl);

            if ($result['success']) {
                Log::debug('✅ Webhook de Chatwoot configurado exitosamente', [
                    'instance' => $instance->instance_name,
                    'inbox_id' => $inboxId,
                    'webhook_url' => $webhookUrl,
                    'webhook_id' => $result['webhook']['id'] ?? null
                ]);
            } else {
                Log::warning('⚠️ No se pudo configurar webhook de Chatwoot', [
                    'instance' => $instance->instance_name,
                    'inbox_id' => $inboxId,
                    'error' => $result['error'] ?? 'Unknown'
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error configurando webhook de Chatwoot', [
                'instance' => $instance->instance_name,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
    /**
     * Asegurar que Evolution tenga el Channel Token correcto de Chatwoot
     * 
     * Cuando se crea la instancia, se usa Platform Token (admin) para crear el inbox.
     * Pero para enviar mensajes, Evolution necesita el Channel Token (identifier del inbox).
     * Esta función verifica y corrige el token si es necesario.
     */
    private function ensureCorrectChatwootToken(string $instanceName): void
    {
        try {
            Log::debug('🔧 Verificando token de Chatwoot para Evolution', ['instance' => $instanceName]);
            
            // 1. Obtener la configuración actual de Evolution usando el servicio
            $configResult = $this->evolutionApi->getChatwootConfig($instanceName);
            
            if (!$configResult['success']) {
                Log::warning('No se pudo obtener config de Chatwoot de Evolution', [
                    'instance' => $instanceName,
                    'error' => $configResult['error'] ?? 'Unknown'
                ]);
                return;
            }
            
            $config = $configResult['data'] ?? [];
            $currentToken = $config['token'] ?? null;
            
            // Obtener accountId correcto de nuestra BD (NO usar fallback hardcodeado)
            $instance = WhatsAppInstance::where('instance_name', $instanceName)
                ->active()
                ->first();
            
            if (!$instance) {
                Log::warning('No se encontró instancia en BD para actualizar token', [
                    'instance' => $instanceName
                ]);
                return;
            }
            
            $company = Company::find($instance->company_id);
            
            if (!$company || !$company->chatwoot_account_id) {
                Log::warning('Empresa sin chatwoot_account_id para actualizar token', [
                    'instance' => $instanceName,
                    'company_id' => $instance->company_id
                ]);
                return;
            }
            
            $accountId = $company->chatwoot_account_id;
            
            // 2. Obtener el Channel Token desde Chatwoot DB
            $chatwootDb = DB::connection('chatwoot');
            $channelApi = $chatwootDb->table('channel_api')
                ->where('account_id', $accountId)
                ->first();
            
            if (!$channelApi) {
                Log::warning('No se encontró channel_api en Chatwoot para actualizar token', [
                    'instance' => $instanceName,
                    'account_id' => $accountId
                ]);
                return;
            }
            
            $channelToken = $channelApi->identifier;
            
            // 3. Verificar si necesita actualización
            if ($currentToken === $channelToken) {
                Log::debug('✅ Evolution ya tiene el Channel Token correcto', [
                    'instance' => $instanceName,
                    'token' => substr($channelToken, 0, 10) . '...'
                ]);
                return;
            }
            
            // 4. Actualizar Evolution con el Channel Token correcto usando el servicio
            Log::debug('🔄 Actualizando Evolution con Channel Token correcto', [
                'instance' => $instanceName,
                'old_token' => substr($currentToken ?? '', 0, 10) . '...',
                'new_token' => substr($channelToken, 0, 10) . '...'
            ]);
            
            $updateResult = $this->evolutionApi->setChatwootIntegration(
                $instanceName,
                $accountId,
                $channelToken,
                "WhatsApp {$instanceName}"
            );
            
            if ($updateResult['success']) {
                Log::debug('✅ Evolution actualizado con Channel Token correcto', [
                    'instance' => $instanceName
                ]);
            } else {
                Log::error('❌ Error actualizando token de Evolution', [
                    'instance' => $instanceName,
                    'error' => $updateResult['error'] ?? 'Unknown'
                ]);
            }
            
        } catch (\Exception $e) {
            Log::error('Error en ensureCorrectChatwootToken', [
                'instance' => $instanceName,
                'error' => $e->getMessage()
            ]);
        }
    }
}
