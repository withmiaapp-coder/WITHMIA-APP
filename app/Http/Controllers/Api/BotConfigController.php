<?php
// Fix: parameters must be object - v3 force deploy

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsAppInstance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class BotConfigController extends Controller
{
    private string $n8nUrl;
    private string $n8nApiKey;

    public function __construct()
    {
        $this->n8nUrl = config('services.n8n.url', 'https://n8n-production-00dd.up.railway.app');
        $this->n8nApiKey = config('services.n8n.api_key', '');
    }

    /**
     * Obtener el workflow_id de la empresa del usuario autenticado
     */
    private function getCompanyWorkflowId(): ?string
    {
        // Intentar obtener usuario de múltiples formas
        $user = Auth::user() ?? request()->user() ?? auth('web')->user();
        
        Log::info('BotConfig - Getting workflow ID', [
            'user_id' => $user?->id,
            'company_id' => $user?->company_id,
            'has_user' => $user !== null,
            'auth_check' => Auth::check(),
            'session_id' => session()->getId(),
        ]);
        
        if (!$user || !$user->company_id) {
            Log::warning('BotConfig - No user or company_id', [
                'request_user' => request()->user()?->id,
                'auth_user' => Auth::user()?->id,
            ]);
            
            // Fallback: si no hay usuario, usar la primera instancia activa (temporal para debug)
            $instance = WhatsAppInstance::whereNotNull('n8n_workflow_id')
                ->where('is_active', true)
                ->first();
            
            if ($instance) {
                Log::info('BotConfig - Using fallback instance', [
                    'instance_id' => $instance->id,
                    'workflow_id' => $instance->n8n_workflow_id,
                ]);
                return $instance->n8n_workflow_id;
            }
            
            return null;
        }

        // Buscar la instancia de WhatsApp de la empresa
        $instance = WhatsAppInstance::where('company_id', $user->company_id)
            ->whereNotNull('n8n_workflow_id')
            ->first();
        
        Log::info('BotConfig - Instance found', [
            'instance_id' => $instance?->id,
            'instance_name' => $instance?->name,
            'workflow_id' => $instance?->n8n_workflow_id,
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
     */
    public function update(Request $request)
    {
        $request->validate([
            'unlock_keyword' => 'nullable|string|max:50',
            'block_duration' => 'nullable|integer|min:60|max:86400',
            'buffer_wait_time' => 'nullable|integer|min:1|max:60',
            'humanize_wait_time' => 'nullable|integer|min:1|max:30',
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
                
                // Actualizar palabra clave de desbloqueo
                if ($node['name'] === 'Verifica Palabra Clave' && $request->has('unlock_keyword')) {
                    $workflow['nodes'][$i]['parameters']['conditions']['conditions'][0]['rightValue'] = strtoupper($request->unlock_keyword);
                    $updated = true;
                    $updatedNodes[] = 'Verifica Palabra Clave';
                }

                // Actualizar tiempo de bloqueo
                if ($node['name'] === 'Bloquea al Agente' && $request->has('block_duration')) {
                    $workflow['nodes'][$i]['parameters']['ttl'] = (int) $request->block_duration;
                    $updated = true;
                    $updatedNodes[] = 'Bloquea al Agente';
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
            
            Log::info('Bot config update attempt', [
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
        $response = Http::withHeaders([
            'X-N8N-API-KEY' => $this->n8nApiKey,
        ])->get("{$this->n8nUrl}/api/v1/workflows/{$workflowId}");

        if ($response->successful()) {
            return $response->json();
        }

        Log::error('Error getting workflow from n8n: ' . $response->body());
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

        Log::info('Updating n8n workflow', [
            'workflow_id' => $workflowId,
            'url' => "{$this->n8nUrl}/api/v1/workflows/{$workflowId}",
            'api_key_present' => !empty($this->n8nApiKey),
            'api_key_length' => strlen($this->n8nApiKey),
            'nodes_count' => count($cleanNodes),
        ]);

        $response = Http::withHeaders([
            'X-N8N-API-KEY' => $this->n8nApiKey,
            'Content-Type' => 'application/json',
        ])->put("{$this->n8nUrl}/api/v1/workflows/{$workflowId}", $cleanWorkflow);

        Log::info('n8n response', [
            'status' => $response->status(),
            'successful' => $response->successful(),
            'body' => substr($response->body(), 0, 500),
        ]);

        if ($response->successful()) {
            return true;
        }

        Log::error('Error updating workflow in n8n: ' . $response->body());
        return false;
    }

    /**
     * Extraer configuración del workflow
     */
    private function extractConfig(array $workflow): array
    {
        $config = [
            'unlock_keyword' => 'BOT',
            'block_duration' => 600,
            'buffer_wait_time' => 7,
            'humanize_wait_time' => 2,
        ];

        foreach ($workflow['nodes'] as $node) {
            // Palabra clave de desbloqueo
            if ($node['name'] === 'Verifica Palabra Clave') {
                $config['unlock_keyword'] = $node['parameters']['conditions']['conditions'][0]['rightValue'] ?? 'BOT';
            }

            // Tiempo de bloqueo
            if ($node['name'] === 'Bloquea al Agente') {
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
