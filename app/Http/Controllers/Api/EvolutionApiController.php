<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EvolutionApiService;
use App\Services\N8nService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use App\Events\NewMessageReceived;
use App\Events\ConversationUpdated;
use App\Events\WhatsAppStatusChanged;

class EvolutionApiController extends Controller
{
    private EvolutionApiService $evolutionApi;
    private N8nService $n8nService;

    public function __construct(EvolutionApiService $evolutionApi, N8nService $n8nService)
    {
        $this->evolutionApi = $evolutionApi;
        $this->n8nService = $n8nService;
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

        // Fallback: company_id si no hay slug
        if ($user && $user->company_id) {
            return "company_{$user->company_id}";
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
            if ($user && $user->company_id) {
                DB::table('whatsapp_instances')->updateOrInsert(
                    ['instance_name' => $instanceName],
                    [
                        'company_id' => $user->company_id,
                        'instance_url' => 'http://evolution_api:8080',
                        'is_active' => 1,
                        'updated_at' => now()
                    ]
                );
                Log::info("WhatsApp instance registered", [
                    'instance_name' => $instanceName,
                    'company_id' => $user->company_id
                ]);
            }
        }

        return response()->json($result, $result['success'] ? 201 : 400);
    }

    /**
     * Obtener configuración de Chatwoot específica para el usuario/empresa
     * Multi-tenant: cada empresa tiene su propio account_id y token
     */
    private function getChatwootConfigForUser($user): array|bool
    {
        if (!$user) {
            return true; // Usar config global
        }

        // Cargar la empresa del usuario
        $company = $user->company;
        
        if ($company && $company->chatwoot_account_id) {
            // 🔧 FIX CRÍTICO: Para CREAR inboxes necesitamos el Platform Token (admin)
            // El chatwoot_agent_token del usuario es solo para agentes, NO puede crear inboxes
            // Usamos el CHATWOOT_PLATFORM_API_TOKEN que tiene permisos de admin
            $platformToken = config('chatwoot.platform_token') ?? config('chatwoot.token');
            
            // IMPORTANTE: Usar company_slug para el nombre del inbox
            // Esto asegura consistencia con el sync automático que busca "WhatsApp {instanceName}"
            // donde instanceName = company_slug
            $inboxName = $user->company_slug 
                ? "WhatsApp {$user->company_slug}" 
                : "WhatsApp {$company->name}";
            
            // 🔧 FIX: Siempre usar auto_create=true para asegurar que el inbox exista
            // Evolution API NO crea duplicados si el inbox ya existe con el mismo nombre
            // Esto soluciona el problema cuando el inbox fue eliminado pero chatwoot_inbox_id aún existe
            $autoCreate = true;
            
            Log::info('🔧 Chatwoot config for user', [
                'user_id' => $user->id,
                'account_id' => $company->chatwoot_account_id,
                'inbox_name' => $inboxName,
                'auto_create' => $autoCreate,
                'has_platform_token' => !empty($platformToken)
            ]);
            
            return [
                'account_id' => $company->chatwoot_account_id,
                'token' => $platformToken, // PLATFORM TOKEN para crear inboxes
                'url' => config('chatwoot.url'),
                'inbox_name' => $inboxName,
                'auto_create' => $autoCreate
            ];
        }

        // Fallback: usar config global
        return true;
    }

    /**
     * Conectar instancia y obtener QR code
     */
    public function connect(Request $request, ?string $instanceName = null): JsonResponse
    {
        $instanceName = $instanceName ?? $this->getInstanceName($request);

        Log::info('🔗 Connect request received', ['instance' => $instanceName]);

        // 🧹 LIMPIEZA PREVIA: Verificar si la instancia existe y no está conectada
        // Si existe pero no está conectada, eliminarla primero para generar QR limpio
        $this->cleanupIfNotConnected($instanceName);

        // Obtener configuración de Chatwoot de la empresa del usuario
        $chatwootConfig = $this->getChatwootConfigForUser($request->user());

        // Paso 1: Crear la instancia (con Chatwoot específico de la empresa)
        $createResult = $this->evolutionApi->createInstance($instanceName, null, $chatwootConfig);

        Log::info('📦 Create instance result', [
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

        Log::info('🔌 Connect result', [
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
            $baseUrl = config('evolution.api_url', 'http://localhost:8080');
            $apiKey = config('evolution.api_key', 'withmia_evolution_api_key_2025_secure_token');

            // Verificar estado actual de la instancia
            $response = Http::withHeaders([
                'apikey' => $apiKey
            ])->timeout(10)->get("{$baseUrl}/instance/connectionState/{$instanceName}");

            if (!$response->successful()) {
                // La instancia no existe, perfecto - se creará nueva
                Log::info('🧹 Instancia no existe, se creará nueva', ['instance' => $instanceName]);
                return;
            }

            $data = $response->json();
            $state = $data['instance']['state'] ?? $data['state'] ?? 'close';

            Log::info('🔍 Estado actual de instancia', [
                'instance' => $instanceName,
                'state' => $state
            ]);

            // Si está conectada (open), verificar si necesita workflow de n8n
            if ($state === 'open') {
                Log::info('✅ Instancia ya conectada, no se elimina', ['instance' => $instanceName]);
                
                // 🚀 CREAR WORKFLOW si no existe
                $this->ensureN8nWorkflowExists($instanceName);
                
                return;
            }

            // Si NO está conectada (close, connecting, etc), eliminarla para QR limpio
            Log::warning('🗑️ Eliminando instancia no conectada para generar QR nuevo', [
                'instance' => $instanceName,
                'state' => $state
            ]);

            Http::withHeaders([
                'apikey' => $apiKey
            ])->timeout(15)->delete("{$baseUrl}/instance/delete/{$instanceName}");

            Log::info('✅ Instancia eliminada, se generará QR nuevo', ['instance' => $instanceName]);

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
        Log::info('WhatsApp Status Check', ['instanceName' => $instanceName]);
        $result = $this->evolutionApi->getStatus($instanceName);
        Log::info('WhatsApp Status Result', ['result' => $result]);

        // Broadcast status change to all connected clients
        if ($result['success'] ?? false) {
            try {
                $user = $request->user();
                if ($user && $user->company_slug) {
                    broadcast(new WhatsAppStatusChanged(
                        $user->company_slug,
                        $instanceName,
                        $result['state'] ?? 'unknown',
                        $result['qrCode'] ?? null,
                        $result['profileInfo'] ?? null
                    ));
                }
                
                // 🔄 AUTO-SYNC: Cuando la conexión está activa, sincronizar el inbox_id de Chatwoot
                // Esto es CRÍTICO para que la app lea del inbox correcto después de reconectar
                $state = $result['state'] ?? 'unknown';
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
                
                Log::info('✅ Chatwoot inbox_id synchronized automatically', [
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
            $instance = DB::table('whatsapp_instances')
                ->where('instance_name', $instanceName)
                ->first();
            
            if (!$instance || empty($instance->n8n_workflow_id)) {
                Log::info('🔍 No hay workflow de n8n para eliminar', [
                    'instance' => $instanceName
                ]);
                return;
            }
            
            Log::info('🗑️ Eliminando workflow de n8n al desconectar WhatsApp', [
                'instance' => $instanceName,
                'workflow_id' => $instance->n8n_workflow_id
            ]);
            
            // Eliminar workflow de n8n
            try {
                $this->n8nService->deleteWorkflow($instance->n8n_workflow_id);
                Log::info('✅ Workflow eliminado de n8n exitosamente', [
                    'workflow_id' => $instance->n8n_workflow_id
                ]);
            } catch (\Exception $e) {
                Log::warning('⚠️ Error eliminando workflow de n8n (puede que ya no exista)', [
                    'workflow_id' => $instance->n8n_workflow_id,
                    'error' => $e->getMessage()
                ]);
            }
            
            // Limpiar referencias en la base de datos
            DB::table('whatsapp_instances')
                ->where('instance_name', $instanceName)
                ->update([
                    'n8n_workflow_id' => null,
                    'n8n_webhook_url' => null,
                    'updated_at' => now()
                ]);
            
            Log::info('✅ Referencias de workflow limpiadas en base de datos', [
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
                'company_id' => $user->company_id
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
            $baseUrl = config('evolution.api_url');
            $apiKey = config('evolution.api_key');

            $response = Http::withHeaders([
                'apikey' => $apiKey
            ])->timeout(10)->get("{$baseUrl}/settings/find/{$instanceName}");

            // If instance doesn't exist, return cached or default settings
            if (!$response->successful()) {
                Log::info('Instance not found, returning cached or default settings', ['instance' => $instanceName]);
                
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

            $data = $response->json();
            
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
        
        Log::info('updateSettings called', ['instanceName' => $instanceName, 'input' => $request->all()]);
        
        try {
            $baseUrl = config('evolution.api_url');
            $apiKey = config('evolution.api_key');

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
            
            Log::info('Settings saved to cache', ['instance' => $instanceName, 'settings' => $settings]);

            // Try to update on Evolution API if instance exists
            try {
                $response = Http::withHeaders([
                    'apikey' => $apiKey,
                    'Content-Type' => 'application/json'
                ])->timeout(10)->post("{$baseUrl}/settings/set/{$instanceName}", $settings);

                if ($response->successful()) {
                    Log::info('WhatsApp settings updated on Evolution API', ['instance' => $instanceName]);
                    return response()->json([
                        'success' => true,
                        'message' => 'Settings updated successfully',
                        'settings' => $settings,
                        'instanceExists' => true
                    ]);
                }
            } catch (\Exception $apiEx) {
                Log::info('Could not update Evolution API (instance may not exist)', ['error' => $apiEx->getMessage()]);
            }

            // If we get here, instance doesn't exist but settings are cached
            return response()->json([
                'success' => true,
                'message' => 'Settings saved for when WhatsApp is connected',
                'settings' => $settings,
                'instanceExists' => false
            ]);

        } catch (\Exception $e) {
            Log::error('Error updating WhatsApp settings', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
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

        Log::info('Evolution API Webhook received', [
            'event' => $event,
            'instance' => $instanceName
        ]);

        // REENVIO A N8N (usando red interna de Railway)
        try {
            $instance = DB::table('whatsapp_instances')->where('instance_name', $instanceName)->where('is_active', 1)->first();
            
            // 🚀 Si la instancia no existe en BD, crearla automáticamente
            if (!$instance) {
                Log::info('📝 Instancia no encontrada en BD, creándola automáticamente...', [
                    'instance' => $instanceName,
                    'event' => $event
                ]);
                
                // Intentar obtener company_id del nombre de instancia (formato: with-mia-XXXX)
                // Por defecto usamos company_id = 1 si no podemos determinarlo
                $companyId = 1;
                
                DB::table('whatsapp_instances')->insert([
                    'instance_name' => $instanceName,
                    'company_id' => $companyId,
                    'instance_url' => config('evolution.base_url', 'https://evolution-api-production-2adf.up.railway.app'),
                    'is_active' => 1,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                Log::info('✅ Instancia creada en BD', ['instance' => $instanceName, 'company_id' => $companyId]);
                
                // Recargar instancia
                $instance = DB::table('whatsapp_instances')->where('instance_name', $instanceName)->where('is_active', 1)->first();
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
                Log::info('🤖 WhatsApp conectado, creando workflow automáticamente...', [
                    'instance' => $instanceName,
                    'event' => $event
                ]);
                $this->createN8nWorkflowForInstance($instance);
                // Recargar instancia para obtener el nuevo workflow_id
                $instance = DB::table('whatsapp_instances')->where('instance_name', $instanceName)->where('is_active', 1)->first();
            }
            
            // 📨 SOLO reenviar a n8n mensajes NUEVOS del cliente
            // NO reenviar: messages.update (estados), send.message (mensajes propios), etc.
            $eventsToForward = ['messages.upsert', 'MESSAGES_UPSERT'];
            
            if (in_array($event, $eventsToForward)) {
                // 🔄 DEDUPLICACIÓN: NO reenviar si ya procesamos este mensaje
                if ($this->isMessageAlreadyProcessed($data)) {
                    Log::info('⏭️ Duplicado: NO reenviando a n8n', ['message_id' => $data['key']['id'] ?? 'unknown']);
                } elseif ($instance && !empty($instance->n8n_webhook_url)) {
                    $webhookPath = basename(parse_url($instance->n8n_webhook_url, PHP_URL_PATH));
                    
                    // Añadir collection_name al payload para Qdrant (usa instance_name que es el slug)
                    $webhookData = $request->all();
                    $webhookData['collection_name'] = "company_{$instance->instance_name}_knowledge";
                    
                    $result = $this->n8nService->sendToWebhook($webhookPath, $webhookData);
                    Log::info('📨 Reenviando mensaje a n8n', ['webhook' => $webhookPath, 'success' => $result['success'], 'collection' => $webhookData['collection_name']]);
                } elseif ($instance && empty($instance->n8n_workflow_id)) {
                    // Si no hay workflow, intentar crearlo ahora
                    Log::info('⚠️ No hay workflow n8n, intentando crear...', ['instance' => $instanceName]);
                    $this->createN8nWorkflowForInstance($instance);
                    $instance = DB::table('whatsapp_instances')->where('instance_name', $instanceName)->where('is_active', 1)->first();
                    
                    if (!empty($instance->n8n_webhook_url)) {
                        $webhookPath = basename(parse_url($instance->n8n_webhook_url, PHP_URL_PATH));
                        
                        // Añadir collection_name al payload para Qdrant (usa instance_name que es el slug)
                        $webhookData = $request->all();
                        $webhookData['collection_name'] = "company_{$instance->instance_name}_knowledge";
                        
                        $result = $this->n8nService->sendToWebhook($webhookPath, $webhookData);
                        Log::info('📨 Reenviando mensaje a n8n (workflow recién creado)', ['webhook' => $webhookPath, 'success' => $result['success'], 'collection' => $webhookData['collection_name']]);
                    }
                } else {
                    Log::warning('⚠️ Workflow existe pero sin webhook_url', ['instance' => $instanceName, 'workflow_id' => $instance->n8n_workflow_id ?? null]);
                }
            } else {
                Log::debug('🔇 Evento ignorado para n8n', ['event' => $event]);
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
                    Log::info('Unhandled webhook event', ['event' => $event]);
                    break;
            }
        } catch (\Exception $e) {
            Log::error('Error processing webhook', [
                'event' => $event,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Mensajes de sistema de WhatsApp que NO deben generar notificaciones
     * Estos son mensajes internos de la conexión, no mensajes reales de usuarios
     */
    private const SYSTEM_MESSAGE_PATTERNS = [
        '🚀 Connection successfully established!',
        'Connection successfully established',
        'QRCode generated',
        'Waiting for QR Code',
        'Connecting...',
        'Connected!',
        'Disconnected',
        'protocolomessage',
        'protocolMessage',
    ];
    
    /**
     * Verificar si es un mensaje de sistema que debe ser ignorado
     */
    private function isSystemMessage(string $messageText, array $data): bool
    {
        // Verificar patrones de mensajes de sistema
        foreach (self::SYSTEM_MESSAGE_PATTERNS as $pattern) {
            if (stripos($messageText, $pattern) !== false) {
                return true;
            }
        }
        
        // Mensajes de protocolo de WhatsApp (no son mensajes reales)
        if (isset($data['message']['protocolMessage'])) {
            return true;
        }
        
        // Mensajes de status@broadcast (actualizaciones de estado)
        if (isset($data['key']['remoteJid']) && str_contains($data['key']['remoteJid'], 'status@broadcast')) {
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
            Log::info('⏭️ Mensaje duplicado ignorado', [
                'message_id' => $messageId,
                'phone' => $cleanPhone
            ]);
            return;
        }
        
        // 🚫 FILTRO DE MENSAJES DE SISTEMA
        // Ignorar mensajes de conexión, protocolo, etc.
        if ($this->isSystemMessage($messageText, $data)) {
            Log::info('🔇 Mensaje de sistema ignorado', [
                'message' => substr($messageText, 0, 50),
                'phone' => $cleanPhone
            ]);
            return;
        }

        Log::info('📨 Nuevo mensaje recibido', [
            'phone' => $phoneNumber,
            'clean_phone' => $cleanPhone,
            'from_me' => $fromMe,
            'message' => $messageText,
            'message_id' => $messageId,
            'instance' => $instanceName
        ]);

        // 🛑 NO notificar si el mensaje es de nosotros (fromMe: true)
        // Esto evita la notificación falsa de "nuevo mensaje" cuando TÚ envías
        if ($fromMe) {
            Log::info('⏭️ Mensaje enviado por nosotros, no se notifica', [
                'phone' => $cleanPhone,
                'from_me' => true
            ]);
            return;
        }

        // 🔄 CREAR CONVERSACIÓN EN CHATWOOT
        $conversation = null; // Inicializar para que esté disponible en el broadcast
        $inboxId = 1; // Fallback por defecto
        try {
            $chatwootBaseUrl = env('CHATWOOT_URL', 'http://chatwoot-rails-1:3000');
            $chatwootToken = env('CHATWOOT_TOKEN', 'UV3DeqL7tSiQzRMQcAgHNGVR');
            // $instanceName ya está disponible como parámetro de la función
            
            // Buscar inbox en Chatwoot basado en el nombre de la instancia
            $foundInbox = false;
            if ($instanceName) {
                try {
                    $inboxesResponse = Http::withHeaders([
                        'api_access_token' => $chatwootToken
                    ])->get("$chatwootBaseUrl/api/v1/accounts/1/inboxes");
                    
                    if ($inboxesResponse->successful()) {
                        $inboxes = $inboxesResponse->json()['payload'] ?? [];
                        Log::info("📦 Inboxes disponibles", ['count' => count($inboxes), 'inboxes' => array_map(fn($i) => ['id' => $i['id'], 'name' => $i['name']], $inboxes)]);
                        
                        foreach ($inboxes as $inbox) {
                            if (str_contains($inbox['name'] ?? '', $instanceName)) {
                                $inboxId = $inbox['id'];
                                $foundInbox = true;
                                Log::info("✅ Inbox encontrado para $instanceName", ['inbox_id' => $inboxId]);
                                break;
                            }
                        }
                        
                        // Si no se encontró por nombre, usar el primer inbox disponible
                        if (!$foundInbox && count($inboxes) > 0) {
                            $inboxId = $inboxes[0]['id'];
                            $foundInbox = true;
                            Log::warning("⚠️ Inbox no encontrado por nombre, usando primer inbox disponible", ['inbox_id' => $inboxId, 'inbox_name' => $inboxes[0]['name']]);
                        }
                    }
                } catch (\Exception $e) {
                    Log::error("Error buscando inbox: " . $e->getMessage());
                }
                
                // Si aún no hay inbox, intentar obtener del usuario
                if (!$foundInbox) {
                    try {
                        $user = \App\Models\User::where('company_slug', $instanceName)->first();
                        if ($user && $user->chatwoot_inbox_id) {
                            $inboxId = $user->chatwoot_inbox_id;
                            $foundInbox = true;
                            Log::info("✅ Inbox obtenido del usuario", ['inbox_id' => $inboxId]);
                        }
                    } catch (\Exception $e) {
                        Log::error("Error obteniendo inbox del usuario: " . $e->getMessage());
                    }
                }
            }

            // Log del inbox_id final
            if (!$foundInbox) {
                Log::warning("⚠️ No se encontró inbox_id, usando valor por defecto: 1");
            }
            
            // 1. Buscar o crear contacto
            $contactResponse = Http::withHeaders([
                'api_access_token' => $chatwootToken,
                'Content-Type' => 'application/json'
            ])->post("$chatwootBaseUrl/api/v1/accounts/1/contacts", [
                'inbox_id' => $inboxId,
                'name' => $cleanPhone,
                'phone_number' => '+' . $cleanPhone
            ]);
            
            $contact = null;
            if ($contactResponse->successful()) {
                $contact = $contactResponse->json()['payload'] ?? $contactResponse->json();
                Log::info('??? Contacto creado en Chatwoot', ['contact_id' => $contact['id'] ?? null]);
            } else {
                // Intentar buscar el contacto
                $searchResponse = Http::withHeaders([
                    'api_access_token' => $chatwootToken
                ])->get("$chatwootBaseUrl/api/v1/accounts/1/contacts/search", [
                    'q' => $cleanPhone
                ]);
                
                if ($searchResponse->successful()) {
                    $contacts = $searchResponse->json()['payload'] ?? [];
                    $contact = $contacts[0] ?? null;
                    Log::info('??? Contacto encontrado', ['contact_id' => $contact['id'] ?? null]);
                }
            }
            
              if ($contact && isset($contact['id'])) {
                  $contactId = $contact['id'];
                  
                  // 2. ???? BUSCAR POR CONTACT_ID (FIX - mismo n??mero = mismo ID conversaci??n)
                  $conversation = null;
                  
                  $existingConvResponse = Http::withHeaders([
                      'api_access_token' => $chatwootToken
                  ])->get("$chatwootBaseUrl/api/v1/accounts/1/contacts/$contactId/conversations");

                  if ($existingConvResponse->successful()) {
                      $contactConversations = $existingConvResponse->json()['payload'] ?? [];
                      
                      foreach ($contactConversations as $conv) {
                          if (isset($conv['inbox_id']) && $conv['inbox_id'] == $inboxId && 
                              isset($conv['status']) && $conv['status'] === 'open') {
                              $conversation = $conv;
                              Log::info('??? MISMA CONVERSACI??N (mismo ID)', [
                                  'conv_id' => $conversation['id'],
                                  'contact_id' => $contactId
                              ]);
                              break;
                          }
                      }
                  }

                  if (!$conversation) {
                      $convResponse = Http::withHeaders([
                          'api_access_token' => $chatwootToken
                      ])->post("$chatwootBaseUrl/api/v1/accounts/1/conversations", [
                          'inbox_id' => $inboxId,
                          'contact_id' => $contactId,
                          'status' => 'open'
                      ]);

                      if ($convResponse->successful()) {
                          $conversation = $convResponse->json();
                          Log::info('??? Conversaci??n NUEVA creada', ['conv_id' => $conversation['id'] ?? null]);
                      }
                  }

                  if ($conversation && isset($conversation['id'])) {
                      Http::withHeaders([
                          'api_access_token' => $chatwootToken
                      ])->post("$chatwootBaseUrl/api/v1/accounts/1/conversations/{$conversation['id']}/messages", [
                          'content' => $messageText,
                          'message_type' => 'incoming'
                      ]);

                      Log::info('??? Mensaje creado en Chatwoot');
                  }
              }
        } catch (\Exception $e) {
            Log::error('??? Error con Chatwoot', ['error' => $e->getMessage()]);
        }
        
        // Broadcast: notificar nuevo mensaje entrante
        try {
            // Obtener el ID de conversación de Chatwoot si lo tenemos
            $conversationId = $conversation['id'] ?? null;
            
            // 🔊 Broadcast NewMessageReceived para que el frontend reciba el mensaje
            broadcast(new \App\Events\NewMessageReceived(
                [
                    'content' => $messageText,
                    'phone' => $cleanPhone,
                    'from_me' => $fromMe,
                    'instance' => $instanceName,
                    'timestamp' => now()->toIso8601String(),
                ],
                $conversationId,
                $inboxId,
                1   // accountId
            )); // Sin ->toOthers() - webhook no tiene socket asociado

            Log::info('📡 NewMessageReceived BROADCAST enviado', [
                'inbox_id' => $inboxId,
                'conversation_id' => $conversationId,
                'phone' => $cleanPhone,
                'message_preview' => substr($messageText, 0, 50)
            ]);
            
            // También enviar ConversationUpdated para actualizar la lista
            broadcast(new ConversationUpdated(
                [
                    'action' => 'new_message',
                    'phone' => $cleanPhone,
                    'message' => $messageText,
                    'from_me' => $fromMe,
                    'instance' => $instanceName,
                    'should_refresh' => true
                ],
                $inboxId,
                1
            )); // Sin ->toOthers()

            Log::info('📡 ConversationUpdated BROADCAST enviado', [
                'inbox_id' => $inboxId,
                'action' => 'new_message'
            ]);

            // 🗑️ INVALIDAR CACHÉ de conversaciones para forzar refresh
            $cacheKey = 'conversations_user_1_inbox_' . $inboxId;
            Cache::forget($cacheKey);
            Log::info('🗑️ Caché de conversaciones invalidado', ['cache_key' => $cacheKey]);

        } catch (\Exception $e) {
            Log::error('Error broadcasting message signal', [
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ]);
        }
    }

    /**
     * Manejar actualizaci??n de mensaje (le??do, entregado, etc)
     */
    private function handleMessageUpdate(array $data, string $instanceName): void
    {
        $fromMe = $data['fromMe'] ?? false;

        Log::info('???? Actualizaci??n de mensaje', [
            'data' => $data,
            'instance' => $instanceName,
            'from_me' => $fromMe
        ]);

        // ???? NO notificar si el mensaje es de nosotros (fromMe: true)
        if ($fromMe) {
            Log::info('?????? Actualizaci??n de mensaje propio, no se notifica', [
                'from_me' => true
            ]);
            return;
        }

        try {
            broadcast(new ConversationUpdated(
                $data,  // conversation data
                5,      // inboxId
                1       // accountId
            ))->toOthers();

            Log::info('??? Evento ConversationUpdated broadcasted');
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

        Log::info('📡 Cambio de conexión', [
            'instance' => $instanceName,
            'state' => $state,
            'previous_state' => $lastState,
            'data' => $data
        ]);

        try {
            // Obtener company_slug desde la instancia
            $instance = DB::table('whatsapp_instances')
                ->where('instance_name', $instanceName)
                ->where('is_active', 1)
                ->first();

            if ($instance) {
                $companySlug = $instance->company_slug ?? $instance->company_id;
                
                // 🚀 CREAR WORKFLOW EN N8N cuando se conecta WhatsApp por primera vez
                if (($state === 'open' || $state === 'connected') && empty($instance->n8n_workflow_id)) {
                    $this->createN8nWorkflowForInstance($instance);
                }
                
                // Disparar evento de WhatsApp con el company_slug correcto
                broadcast(new WhatsAppStatusChanged(
                    $companySlug,
                    $instanceName,
                    $state,
                    $data['qrcode'] ?? null,
                    $data['profileInfo'] ?? null
                ));

                Log::info('??? WhatsAppStatusChanged event broadcasted', [
                    'company' => $companySlug,
                    'instance' => $instanceName,
                    'state' => $state
                ]);
            }

            // Mantener el evento legacy para compatibilidad
            broadcast(new ConversationUpdated(
                ['state' => $state, 'instance' => $instanceName],  // conversation data
                5,      // inboxId
                1       // accountId
            ))->toOthers();

            Log::info('??? Evento de conexi??n broadcasted');
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
            // Usar el instance_name (slug) como identificador único del workflow
            $workflowName = $instance->instance_name;

            Log::info('🤖 Creando workflow de n8n para instancia', [
                'instance' => $instance->instance_name,
                'company_id' => $instance->company_id,
                'workflow_name' => $workflowName
            ]);

            // Intentar cargar template del archivo
            $templatePath = base_path('workflows/whatsapp-bot-template.json');
            $templateWorkflow = null;
            
            if (file_exists($templatePath)) {
                $content = file_get_contents($templatePath);
                // Limpiar BOM y caracteres invisibles
                $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
                $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8');
                
                $templateWorkflow = json_decode($content, true);
                
                if (!$templateWorkflow) {
                    Log::warning('Error parseando template de workflow desde archivo', [
                        'json_error' => json_last_error_msg(),
                        'file_size' => strlen($content)
                    ]);
                }
            } else {
                Log::warning('Template de workflow no encontrado en disco');
            }
            
            // Si falla el template del archivo, usar workflow minimalista embebido
            if (!$templateWorkflow) {
                Log::info('🔧 Usando workflow minimalista embebido');
                $templateWorkflow = $this->getMinimalWorkflowTemplate($workflowName, $instance->instance_name);
            }

            // Get company for settings
            $company = \App\Models\Company::find($instance->company_id);
            $companySlug = $company ? ($company->slug ?? 'company_' . $instance->company_id) : 'company_' . $instance->company_id;
            $companyName = $company ? ($company->name ?? $workflowName) : $workflowName;
            $assistantName = $company ? ($company->assistant_name ?? 'MIA') : 'MIA';
            $openaiApiKey = $company ? ($company->settings['openai_api_key'] ?? env('OPENAI_API_KEY')) : env('OPENAI_API_KEY');
            $appUrl = env('APP_URL', 'https://app.withmia.com');
            
            // Replace placeholders in the template
            $templateJson = json_encode($templateWorkflow);
            $replacements = [
                '{{COMPANY_SLUG}}' => $companySlug,
                '{{COMPANY_NAME}}' => $companyName,
                '{{ASSISTANT_NAME}}' => $assistantName,
                '{{OPENAI_API_KEY}}' => $openaiApiKey,
                '{{INSTANCE_NAME}}' => $instance->instance_name,
                '{{APP_URL}}' => $appUrl,
            ];
            foreach ($replacements as $placeholder => $value) {
                $templateJson = str_replace($placeholder, $value, $templateJson);
            }
            $templateWorkflow = json_decode($templateJson, true);

            // Limpiar y personalizar nodos
            $cleanNodes = [];
            $newWebhookId = \Illuminate\Support\Str::uuid()->toString();
            
            foreach ($templateWorkflow['nodes'] as $node) {
                // Asegurar que parameters sea un objeto (stdClass) no un array vacío
                $params = $node['parameters'] ?? [];
                if (empty($params) || (is_array($params) && count($params) === 0)) {
                    $params = new \stdClass(); // n8n requiere objeto vacío {}, no array []
                }
                
                // Limpiar nodo - solo propiedades esenciales
                $cleanNode = [
                    'parameters' => $params,
                    'type' => $node['type'],
                    'typeVersion' => $node['typeVersion'] ?? 1,
                    'position' => $node['position'],
                    'id' => $node['id'],
                    'name' => $node['name'],
                ];
                
                // Incluir credentials si existen (ya tienen IDs correctos en el template)
                if (isset($node['credentials'])) {
                    $cleanNode['credentials'] = $node['credentials'];
                }
                
                // Configurar webhook
                if ($node['type'] === 'n8n-nodes-base.webhook') {
                    $cleanNode['webhookId'] = $newWebhookId;
                    if (isset($cleanNode['parameters']['path'])) {
                        $cleanNode['parameters']['path'] = "whatsapp-{$instance->instance_name}";
                    }
                }
                
                // Simplificar prompt del AI Agent para evitar error 500
                if ($node['type'] === '@n8n/n8n-nodes-langchain.agent') {
                    $cleanNode['parameters']['text'] = "Responde como asistente de {$workflowName}";
                    $cleanNode['parameters']['options'] = [
                        'systemMessage' => "Eres MIA, asistente digital de {$workflowName}. Responde de forma profesional y amigable."
                    ];
                }
                
                // Configurar memoria por empresa
                if ($node['type'] === '@n8n/n8n-nodes-langchain.memoryBufferWindow') {
                    if (isset($cleanNode['parameters']['sessionKey'])) {
                        $cleanNode['parameters']['sessionKey'] = "company_{$instance->company_id}_" . '={{ $json.message.chat_id }}';
                    }
                }
                
                $cleanNodes[] = $cleanNode;
            }

            // Crear workflow limpio
            $cleanWorkflow = [
                'name' => "WhatsApp Bot - {$workflowName}",
                'nodes' => $cleanNodes,
                'connections' => $templateWorkflow['connections'] ?? new \stdClass(),
                'settings' => [
                    'executionOrder' => 'v1',
                    'timezone' => 'America/Santiago',
                    'callerPolicy' => 'workflowsFromSameOwner'
                ],
            ];

            // Crear en n8n via API
            $result = $this->n8nService->createWorkflow($cleanWorkflow);

            if ($result['success']) {
                $workflowId = $result['data']['id'] ?? null;
                $webhookUrl = $this->n8nService->getWebhookUrl($instance->instance_name);
                
                // Activar workflow
                if ($workflowId) {
                    $activateResult = $this->n8nService->activateWorkflow($workflowId);
                    if (!$activateResult['success']) {
                        Log::warning('⚠️ No se pudo activar el workflow', [
                            'workflow_id' => $workflowId,
                            'error' => $activateResult['error'] ?? 'Unknown'
                        ]);
                    } else {
                        Log::info('✅ Workflow activado correctamente', ['workflow_id' => $workflowId]);
                    }
                }
                
                // 🎯 NOTA: NO configuramos webhook directo de Evolution a N8N
                // El reenvío se hace desde el backend (EvolutionApiController::webhook)
                // para tener mejor control, logs, y evitar eventos duplicados
                // Si prefieres webhook directo, descomenta este bloque y comenta
                // el reenvío en el método webhook()
                /*
                $evolutionWebhookResult = $this->evolutionApi->setWebhook(
                    $instance->instance_name,
                    $webhookUrl,
                    ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE']
                );
                
                if ($evolutionWebhookResult['success']) {
                    Log::info('🔗 Webhook de Evolution configurado hacia n8n', [
                        'instance' => $instance->instance_name,
                        'n8n_webhook_url' => $webhookUrl
                    ]);
                }
                */
                
                // Guardar referencia en la base de datos
                DB::table('whatsapp_instances')
                    ->where('id', $instance->id)
                    ->update([
                        'n8n_workflow_id' => $workflowId,
                        'n8n_webhook_url' => $webhookUrl,
                        'updated_at' => now()
                    ]);

                Log::info('✅ Workflow de n8n creado y webhook configurado', [
                    'workflow_id' => $workflowId,
                    'webhook_url' => $webhookUrl,
                    'instance' => $instance->instance_name
                ]);
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
            $instance = DB::table('whatsapp_instances')
                ->where('instance_name', $instanceName)
                ->where('is_active', 1)
                ->first();

            if (!$instance) {
                Log::info('No se encontró instancia en DB para crear workflow', ['instance' => $instanceName]);
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
                DB::table('whatsapp_instances')
                    ->where('id', $instance->id)
                    ->update([
                        'n8n_webhook_url' => $webhookUrl,
                        'updated_at' => now()
                    ]);
                Log::info('🔧 Webhook URL regenerado para instancia existente', [
                    'instance' => $instanceName,
                    'workflow_id' => $instance->n8n_workflow_id,
                    'webhook_url' => $webhookUrl
                ]);
                return;
            }

            Log::info('🤖 Creando workflow de n8n para instancia conectada', [
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
     * Genera un workflow minimalista embebido cuando el template JSON falla
     */
    private function getMinimalWorkflowTemplate(string $workflowName, string $instanceName): array
    {
        $webhookPath = "whatsapp-{$instanceName}";
        
        return [
            'name' => "WhatsApp Bot - {$workflowName}",
            'nodes' => [
                [
                    'parameters' => [
                        'path' => $webhookPath,
                        'httpMethod' => 'POST',
                        'responseMode' => 'onReceived',
                        'responseData' => 'allEntries'
                    ],
                    'type' => 'n8n-nodes-base.webhook',
                    'typeVersion' => 2,
                    'position' => [0, 0],
                    'id' => \Illuminate\Support\Str::uuid()->toString(),
                    'name' => 'Webhook WhatsApp',
                    'webhookId' => \Illuminate\Support\Str::uuid()->toString()
                ],
                [
                    'parameters' => [
                        'promptType' => 'define',
                        'text' => "Responde como asistente de {$workflowName}",
                        'options' => [
                            'systemMessage' => "Eres MIA, asistente digital de {$workflowName}. Responde de forma profesional y amigable."
                        ]
                    ],
                    'type' => '@n8n/n8n-nodes-langchain.agent',
                    'typeVersion' => 2,
                    'position' => [300, 0],
                    'id' => \Illuminate\Support\Str::uuid()->toString(),
                    'name' => 'AI Agent'
                ],
                [
                    'parameters' => [
                        'model' => 'gpt-4o-mini',
                        'options' => new \stdClass()
                    ],
                    'type' => '@n8n/n8n-nodes-langchain.lmChatOpenAi',
                    'typeVersion' => 1.2,
                    'position' => [300, -200],
                    'id' => \Illuminate\Support\Str::uuid()->toString(),
                    'name' => 'OpenAI Chat Model'
                ],
                [
                    'parameters' => [
                        'sessionIdType' => 'customKey',
                        'sessionKey' => "company_{$instanceName}_" . '={{ $json.message.chat_id }}',
                        'contextWindowLength' => 10
                    ],
                    'type' => '@n8n/n8n-nodes-langchain.memoryBufferWindow',
                    'typeVersion' => 1.3,
                    'position' => [500, -200],
                    'id' => \Illuminate\Support\Str::uuid()->toString(),
                    'name' => 'Window Buffer Memory'
                ]
            ],
            'connections' => [
                'Webhook WhatsApp' => [
                    'main' => [[['node' => 'AI Agent', 'type' => 'main', 'index' => 0]]]
                ],
                'OpenAI Chat Model' => [
                    'ai_languageModel' => [[['node' => 'AI Agent', 'type' => 'ai_languageModel', 'index' => 0]]]
                ],
                'Window Buffer Memory' => [
                    'ai_memory' => [[['node' => 'AI Agent', 'type' => 'ai_memory', 'index' => 0]]]
                ]
            ],
            'settings' => [
                'executionOrder' => 'v1',
                'timezone' => 'America/Santiago',
                'callerPolicy' => 'workflowsFromSameOwner'
            ]
        ];
    }
}
