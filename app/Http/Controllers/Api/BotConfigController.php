<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class BotConfigController extends Controller
{
    private string $n8nUrl;
    private string $n8nApiKey;
    private string $workflowId;

    public function __construct()
    {
        $this->n8nUrl = config('services.n8n.url', 'https://n8n-production-00dd.up.railway.app');
        $this->n8nApiKey = config('services.n8n.api_key', '');
        $this->workflowId = config('services.n8n.workflow_id', 'C1mhxAWt67pfg3BC');
    }

    /**
     * Obtener la configuración actual del bot
     */
    public function index()
    {
        try {
            $workflow = $this->getWorkflow();
            
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
            $workflow = $this->getWorkflow();
            
            if (!$workflow) {
                return response()->json([
                    'success' => false,
                    'error' => 'No se pudo obtener el workflow'
                ], 500);
            }

            // Actualizar nodos según los parámetros
            $updated = false;

            foreach ($workflow['nodes'] as &$node) {
                // Actualizar palabra clave de desbloqueo
                if ($node['name'] === 'Verifica Palabra Clave' && $request->has('unlock_keyword')) {
                    $node['parameters']['conditions']['conditions'][0]['rightValue'] = strtoupper($request->unlock_keyword);
                    $updated = true;
                }

                // Actualizar tiempo de bloqueo
                if ($node['name'] === 'Bloquea al Agente' && $request->has('block_duration')) {
                    $node['parameters']['ttl'] = (int) $request->block_duration;
                    $updated = true;
                }

                // Actualizar tiempo de buffer (Wait principal)
                if ($node['name'] === 'Wait' && $request->has('buffer_wait_time')) {
                    $node['parameters']['amount'] = (int) $request->buffer_wait_time;
                    $updated = true;
                }

                // Actualizar tiempo de humanización (Wait1 y Wait2)
                if (in_array($node['name'], ['Wait1', 'Wait2']) && $request->has('humanize_wait_time')) {
                    $node['parameters']['amount'] = (int) $request->humanize_wait_time;
                    $updated = true;
                }
            }

            if (!$updated) {
                return response()->json([
                    'success' => false,
                    'error' => 'No se encontraron nodos para actualizar'
                ], 400);
            }

            // Subir workflow actualizado
            $result = $this->updateWorkflow($workflow);

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
    private function getWorkflow(): ?array
    {
        $response = Http::withHeaders([
            'X-N8N-API-KEY' => $this->n8nApiKey,
        ])->get("{$this->n8nUrl}/api/v1/workflows/{$this->workflowId}");

        if ($response->successful()) {
            return $response->json();
        }

        Log::error('Error getting workflow from n8n: ' . $response->body());
        return null;
    }

    /**
     * Actualizar el workflow en n8n
     */
    private function updateWorkflow(array $workflow): bool
    {
        // Solo enviar los campos permitidos
        $cleanWorkflow = [
            'name' => $workflow['name'],
            'nodes' => $workflow['nodes'],
            'connections' => $workflow['connections'],
            'settings' => $workflow['settings'] ?? new \stdClass(),
        ];

        $response = Http::withHeaders([
            'X-N8N-API-KEY' => $this->n8nApiKey,
            'Content-Type' => 'application/json',
        ])->put("{$this->n8nUrl}/api/v1/workflows/{$this->workflowId}", $cleanWorkflow);

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
