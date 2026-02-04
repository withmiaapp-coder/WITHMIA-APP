<?php
// Fix: parameters must be object - v3 force deploy

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsAppInstance;
use App\Services\N8nService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class BotConfigController extends Controller
{
    private N8nService $n8nService;

    public function __construct(N8nService $n8nService)
    {
        $this->n8nService = $n8nService;
    }

    /**
     * Obtener el workflow_id de la empresa del usuario autenticado
     */
    private function getCompanyWorkflowId(): ?string
    {
        // Intentar obtener usuario de múltiples formas
        $user = Auth::user() ?? request()->user() ?? auth('web')->user();
        
        // El usuario puede tener company_slug (no company_id)
        $companySlug = $user?->company_slug;
        $companyId = $user?->company_id;
        
        Log::debug('BotConfig - Getting workflow ID', [
            'user_id' => $user?->id,
            'company_id' => $companyId,
            'company_slug' => $companySlug,
            'has_user' => $user !== null,
            'auth_check' => Auth::check(),
        ]);
        
        // Si no hay usuario, intentar obtener el company_slug desde la referer URL
        if (!$companySlug && !$companyId) {
            $referer = request()->header('Referer', '');
            if (preg_match('/\/dashboard\/([a-z0-9\-]+)/', $referer, $matches)) {
                $companySlug = $matches[1];
                Log::debug('BotConfig - Got company_slug from referer', ['slug' => $companySlug]);
            }
        }
        
        // Si tenemos company_slug pero no company_id, buscar el company_id en la tabla companies
        if ($companySlug && !$companyId) {
            $company = \App\Models\Company::where('slug', $companySlug)->first();
            if ($company) {
                $companyId = $company->id;
                Log::debug('BotConfig - Got company_id from companies table', [
                    'slug' => $companySlug,
                    'company_id' => $companyId
                ]);
            }
        }
        
        if (!$companySlug && !$companyId) {
            Log::warning('BotConfig - No company identifier found - BLOCKED');
            return null;
        }

        // Buscar la instancia de WhatsApp de la empresa del usuario
        // Intentar múltiples estrategias de búsqueda
        $instance = null;
        
        // PRIMERO: Buscar por company_id (más confiable)
        if ($companyId) {
            $instance = WhatsAppInstance::whereNotNull('n8n_workflow_id')
                ->where('company_id', $companyId)
                ->first();
            
            Log::debug('BotConfig - Search by company_id', [
                'company_id' => $companyId,
                'found' => $instance !== null
            ]);
        }
        
        // Si no encontró por company_id, buscar por company_slug o name
        if (!$instance && $companySlug) {
            // Primero por company_slug exacto
            $instance = WhatsAppInstance::whereNotNull('n8n_workflow_id')
                ->where('company_slug', $companySlug)
                ->first();
            
            // Luego por name exacto
            if (!$instance) {
                $instance = WhatsAppInstance::whereNotNull('n8n_workflow_id')
                    ->where('name', $companySlug)
                    ->first();
            }
            
            // Luego por name LIKE
            if (!$instance) {
                $instance = WhatsAppInstance::whereNotNull('n8n_workflow_id')
                    ->where('name', 'like', "%{$companySlug}%")
                    ->first();
            }
        }
        
        // Si aún no encontró, buscar cualquier instancia activa (fallback temporal para debug)
        if (!$instance) {
            Log::warning('BotConfig - No instance found with any strategy, trying fallback');
            $instance = WhatsAppInstance::whereNotNull('n8n_workflow_id')
                ->where('is_active', true)
                ->first();
        }
        
        Log::debug('BotConfig - Instance search result', [
            'instance_id' => $instance?->id,
            'instance_name' => $instance?->name,
            'workflow_id' => $instance?->n8n_workflow_id,
            'searched_by' => $companyId ? 'company_id' : 'company_slug',
            'search_value' => $companyId ?: $companySlug,
        ]);

        return $instance?->n8n_workflow_id;
    }

    /**
     * Obtener la configuración actual del bot
     */
    public function index()
    {
        try {
            $workflowId = $this->getCompanyWorkflowId();
            
            if (!$workflowId) {
                return response()->json([
                    'success' => false,
                    'error' => 'No tienes un workflow configurado. Conecta tu WhatsApp primero.'
                ], 404);
            }

            $workflow = $this->getWorkflow($workflowId);
            
            if (!$workflow) {
                return response()->json([
                    'success' => false,
                    'error' => 'No se pudo obtener la configuración del workflow'
                ], 500);
            }

            $config = $this->extractConfig($workflow);

            return response()->json([
                'success' => true,
                'data' => $config
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting bot config: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener la configuración'
            ], 500);
        }
    }

    /**
     * Actualizar la configuración del bot
     * 
     * Escenarios de bloqueo/desbloqueo:
     * #1: Cliente Empresa escribe palabra clave (unlock_keyword) → DESBLOQUEA bot inmediatamente
     * #2: Cliente Final pide humano (human_keyword) → BLOQUEA bot por human_block_duration
     * #3: Cliente Empresa responde (cualquier canal) → BLOQUEA bot por block_duration
     */
    public function update(Request $request)
    {
        $request->validate([
            'unlock_keyword' => 'nullable|string|max:50',           // #1: Palabra para desbloquear (empresa)
            'human_keyword' => 'nullable|string|max:50',            // #2: Palabra para pedir humano (cliente final)
            'human_block_duration' => 'nullable|integer|min:60|max:86400', // #2: Tiempo bloqueo humano
            'block_duration' => 'nullable|integer|min:60|max:86400', // #3: Tiempo bloqueo cuando empresa responde
            'buffer_wait_time' => 'nullable|integer|min:1|max:60',
            'humanize_wait_time' => 'nullable|integer|min:1|max:30',
        ], [
            // Mensajes de error personalizados en español
            'unlock_keyword.max' => 'La palabra secreta no puede tener más de 50 caracteres',
            'human_keyword.max' => 'La palabra de ayuda no puede tener más de 50 caracteres',
            'human_block_duration.min' => 'El tiempo mínimo de espera es 60 segundos (1 minuto)',
            'human_block_duration.max' => 'El tiempo máximo de espera es 86400 segundos (24 horas)',
            'block_duration.min' => 'El tiempo mínimo de pausa es 60 segundos (1 minuto)',
            'block_duration.max' => 'El tiempo máximo de pausa es 86400 segundos (24 horas)',
            'buffer_wait_time.min' => 'El tiempo mínimo de espera al cliente es 1 segundo',
            'buffer_wait_time.max' => 'El tiempo máximo de espera al cliente es 60 segundos',
            'humanize_wait_time.min' => 'El tiempo mínimo de simulación es 1 segundo',
            'humanize_wait_time.max' => 'El tiempo máximo de simulación es 30 segundos',
        ]);

        try {
            $workflowId = $this->getCompanyWorkflowId();
            
            if (!$workflowId) {
                return response()->json([
                    'success' => false,
                    'error' => 'No tienes un workflow configurado. Conecta tu WhatsApp primero.'
                ], 404);
            }

            $workflow = $this->getWorkflow($workflowId);
            
            if (!$workflow) {
                return response()->json([
                    'success' => false,
                    'error' => 'No se pudo obtener el workflow'
                ], 500);
            }

            // Actualizar nodos según los parámetros
            $updated = false;
            $updatedNodes = [];

            for ($i = 0; $i < count($workflow['nodes']); $i++) {
                $node = &$workflow['nodes'][$i];
                
                // #1: Actualizar palabra clave de desbloqueo (empresa escribe para reactivar bot)
                if ($node['name'] === 'Verifica Palabra Clave' && $request->has('unlock_keyword')) {
                    $workflow['nodes'][$i]['parameters']['conditions']['conditions'][0]['rightValue'] = strtoupper($request->unlock_keyword);
                    $updated = true;
                    $updatedNodes[] = 'Verifica Palabra Clave';
                }

                // #2: Actualizar palabra clave para pedir humano (cliente final)
                if ($node['name'] === 'Bloqueo a Humano' && $request->has('human_keyword')) {
                    $keyword = strtoupper($request->human_keyword);
                    $workflow['nodes'][$i]['parameters']['toolDescription'] = 
                        "Cuando el cliente escriba la palabra \"{$keyword}\" ejecuta esta tool";
                    $updated = true;
                    $updatedNodes[] = 'Bloqueo a Humano (keyword)';
                }

                // #2: Actualizar tiempo de bloqueo cuando cliente pide humano
                if ($node['name'] === 'Bloqueo a Humano' && $request->has('human_block_duration')) {
                    $workflow['nodes'][$i]['parameters']['ttl'] = (int) $request->human_block_duration;
                    $updated = true;
                    $updatedNodes[] = 'Bloqueo a Humano (ttl)';
                }

                // #3: Actualizar tiempo de bloqueo cuando empresa responde (Block Agent on Outgoing)
                if ($node['name'] === 'Block Agent on Outgoing' && $request->has('block_duration')) {
                    $workflow['nodes'][$i]['parameters']['ttl'] = (int) $request->block_duration;
                    $updated = true;
                    $updatedNodes[] = 'Block Agent on Outgoing';
                }

                // Actualizar tiempo de buffer (Wait principal)
                if ($node['name'] === 'Wait' && $request->has('buffer_wait_time')) {
                    $workflow['nodes'][$i]['parameters']['amount'] = (int) $request->buffer_wait_time;
                    $updated = true;
                    $updatedNodes[] = 'Wait';
                }

                // Actualizar tiempo de humanización (Wait1 y Wait2)
                if (in_array($node['name'], ['Wait1', 'Wait2']) && $request->has('humanize_wait_time')) {
                    $workflow['nodes'][$i]['parameters']['amount'] = (int) $request->humanize_wait_time;
                    $updated = true;
                    $updatedNodes[] = $node['name'];
                }
            }
            
            Log::debug('Bot config update attempt', [
                'workflow_id' => $workflowId,
                'updated' => $updated,
                'updated_nodes' => $updatedNodes,
                'request_data' => $request->all()
            ]);

            if (!$updated) {
                return response()->json([
                    'success' => false,
                    'error' => 'No se encontraron nodos para actualizar'
                ], 400);
            }

            // Subir workflow actualizado
            $result = $this->updateWorkflow($workflow, $workflowId);

            if (!$result) {
                return response()->json([
                    'success' => false,
                    'error' => 'Error al actualizar el workflow en n8n'
                ], 500);
            }

            // Obtener config actualizada
            $newConfig = $this->extractConfig($workflow);

            return response()->json([
                'success' => true,
                'message' => 'Configuración actualizada correctamente',
                'data' => $newConfig
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating bot config: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar la configuración: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener el workflow de n8n
     */
    private function getWorkflow(string $workflowId): ?array
    {
        $result = $this->n8nService->getWorkflow($workflowId);

        if ($result['success']) {
            return $result['data'];
        }

        Log::error('Error getting workflow from n8n: ' . ($result['error'] ?? 'Unknown error'));
        return null;
    }

    /**
     * Actualizar el workflow en n8n
     */
    private function updateWorkflow(array $workflow, string $workflowId): bool
    {
        // Limpiar nodos - asegurar que parameters sea siempre un objeto JSON (no array vacío)
        $cleanNodes = [];
        foreach ($workflow['nodes'] as $index => $node) {
            // Si parameters es null, no existe, es array vacío, o no es array asociativo
            // convertirlo a objeto vacío para que JSON lo serialice como {}
            if (!isset($node['parameters']) || 
                $node['parameters'] === null || 
                (is_array($node['parameters']) && empty($node['parameters']))) {
                $node['parameters'] = new \stdClass();
            } elseif (is_array($node['parameters']) && array_keys($node['parameters']) === range(0, count($node['parameters']) - 1)) {
                // Es un array indexado (como []), convertir a objeto vacío
                $node['parameters'] = new \stdClass();
            }
            $cleanNodes[] = $node;
        }
        
        // Solo enviar los campos permitidos
        $cleanWorkflow = [
            'name' => $workflow['name'],
            'nodes' => $cleanNodes,
            'connections' => $workflow['connections'],
            'settings' => $workflow['settings'] ?? new \stdClass(),
        ];

        Log::debug('Updating n8n workflow', [
            'workflow_id' => $workflowId,
            'nodes_count' => count($cleanNodes),
        ]);

        $result = $this->n8nService->updateWorkflow($workflowId, $cleanWorkflow);

        Log::debug('n8n response', [
            'successful' => $result['success'],
        ]);

        if ($result['success']) {
            return true;
        }

        Log::error('Error updating workflow in n8n: ' . ($result['error'] ?? 'Unknown error'));
        return false;
    }

    /**
     * Extraer configuración del workflow
     * 
     * #1: unlock_keyword - palabra para desbloquear (empresa)
     * #2: human_keyword + human_block_duration - cliente pide humano
     * #3: block_duration - tiempo bloqueo cuando empresa responde
     */
    private function extractConfig(array $workflow): array
    {
        $config = [
            'unlock_keyword' => 'BOT',
            'human_keyword' => 'HUMANO',
            'human_block_duration' => 600,
            'block_duration' => 600,
            'buffer_wait_time' => 7,
            'humanize_wait_time' => 2,
        ];

        foreach ($workflow['nodes'] as $node) {
            // #1: Palabra clave de desbloqueo (empresa)
            if ($node['name'] === 'Verifica Palabra Clave') {
                $config['unlock_keyword'] = $node['parameters']['conditions']['conditions'][0]['rightValue'] ?? 'BOT';
            }

            // #2: Palabra clave para pedir humano (cliente final)
            if ($node['name'] === 'Bloqueo a Humano') {
                // Extraer palabra del toolDescription: "Cuando el cliente escriba la palabra \"HUMANO\" ejecuta esta tool"
                $toolDesc = $node['parameters']['toolDescription'] ?? '';
                if (preg_match('/palabra\s+"([^"]+)"/', $toolDesc, $matches)) {
                    $config['human_keyword'] = $matches[1];
                }
                // Tiempo de bloqueo humano
                $config['human_block_duration'] = $node['parameters']['ttl'] ?? 600;
            }

            // #3: Tiempo de bloqueo cuando empresa responde
            if ($node['name'] === 'Block Agent on Outgoing') {
                $config['block_duration'] = $node['parameters']['ttl'] ?? 600;
            }

            // Tiempo de buffer
            if ($node['name'] === 'Wait') {
                $config['buffer_wait_time'] = $node['parameters']['amount'] ?? 7;
            }

            // Tiempo de humanización (tomamos Wait1)
            if ($node['name'] === 'Wait1') {
                $config['humanize_wait_time'] = $node['parameters']['amount'] ?? 2;
            }
        }

        return $config;
    }
}
