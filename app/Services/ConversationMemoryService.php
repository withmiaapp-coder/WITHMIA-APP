<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Http;
use App\Models\Company;

/**
 * Servicio para gestionar la memoria de conversación del bot (n8n).
 * 
 * El bot usa Redis Chat Memory (memoryRedisChat) para almacenar
 * el historial de conversación en Redis. Cuando datos sensibles
 * como el nombre del asistente cambian, este servicio se encarga de:
 * 
 * 1. Limpiar claves Redis del Redis Chat Memory (@langchain/redis)
 *    Las claves tienen formato: company_{slug}_{chat_id}
 * 2. Resetear el workflow de n8n (limpia cualquier caché in-process)
 * 3. Registrar todo en logs para auditoría
 */
class ConversationMemoryService
{
    /**
     * Flush completo de memoria de conversación para una empresa.
     * Llamar cuando cambia assistant_name u otros datos de identidad.
     *
     * @param Company $company
     * @param string|null $oldValue  Valor anterior (para logging)
     * @param string|null $newValue  Valor nuevo (para logging)
     * @param string $field          Campo que cambió (e.g., 'assistant_name')
     * @return array Resumen de lo que se limpió
     */
    public function flushOnIdentityChange(Company $company, ?string $oldValue, ?string $newValue, string $field = 'assistant_name'): array
    {
        $summary = [
            'company_slug' => $company->slug,
            'field' => $field,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'redis_keys_deleted' => 0,
            'workflow_reset' => false,
            'errors' => [],
        ];

        Log::info('🧹 ConversationMemoryService: Iniciando flush de memoria', [
            'company' => $company->slug,
            'field' => $field,
            'old' => $oldValue,
            'new' => $newValue,
        ]);

        // Paso 1: Limpiar claves Redis (memoria de sesión, bot-state, buffers)
        try {
            $redisDeleted = $this->flushRedisKeys($company);
            $summary['redis_keys_deleted'] = $redisDeleted;
        } catch (\Exception $e) {
            Log::error('ConversationMemoryService: Error limpiando Redis', [
                'error' => $e->getMessage(),
            ]);
            $summary['errors'][] = 'Redis: ' . $e->getMessage();
        }

        // Paso 2: Resetear workflow n8n (limpia memoria in-process del Window Buffer)
        try {
            $reset = $this->resetN8nWorkflow($company);
            $summary['workflow_reset'] = $reset;
        } catch (\Exception $e) {
            Log::error('ConversationMemoryService: Error reseteando workflow n8n', [
                'error' => $e->getMessage(),
            ]);
            $summary['errors'][] = 'n8n: ' . $e->getMessage();
        }

        Log::info('🧹 ConversationMemoryService: Flush completado', $summary);

        return $summary;
    }

    /**
     * Limpiar todas las claves Redis relacionadas con la empresa.
     * 
     * El nodo Redis Chat Memory (@langchain/redis RedisChatMessageHistory)
     * almacena mensajes como Redis lists con clave = sessionId.
     * Nuestro sessionKey es: company_{slug}_{chat_id}
     * 
     * Busca y elimina:
     * - company_{slug}_* (claves directas de Redis Chat Memory - @langchain/redis)
     * - message_store:company_{slug}_* (prefijo alternativo por si @langchain/community)
     * - n8n_memory_*{slug}* (formato legacy por si n8n usa otro formato interno)
     * - chat_history_company_{slug}_* (formato legacy de chat_history)
     */
    public function flushRedisKeys(Company $company): int
    {
        $redis = Redis::connection('n8n');
        $totalDeleted = 0;

        // Patrón 1: Claves directas de Redis Chat Memory (@langchain/redis)
        // Formato: company_{slug}_{chat_id} (sessionId usado como key de Redis list)
        $pattern = "company_{$company->slug}_*";
        $keys = $this->scanRedisKeys($redis, $pattern);
        
        if (!empty($keys)) {
            $deleted = $redis->del($keys);
            $totalDeleted += $deleted;
            Log::info("🗑️ Redis: Eliminadas {$deleted} claves de Redis Chat Memory", [
                'pattern' => $pattern,
                'keys' => array_slice($keys, 0, 20),
            ]);
        } else {
            Log::info("Redis: No se encontraron claves para patrón {$pattern}");
        }

        // Patrón 2: Claves con prefijo message_store: (@langchain/community usa este prefijo)
        $pattern2 = "message_store:company_{$company->slug}_*";
        $keys2 = $this->scanRedisKeys($redis, $pattern2);
        
        if (!empty($keys2)) {
            $deleted2 = $redis->del($keys2);
            $totalDeleted += $deleted2;
            Log::info("🗑️ Redis: Eliminadas {$deleted2} claves message_store", [
                'pattern' => $pattern2,
            ]);
        }

        // Patrón 3: Claves con prefijo n8n_memory (formato interno alternativo de n8n)
        $pattern3 = "n8n_memory_*{$company->slug}*";
        $keys3 = $this->scanRedisKeys($redis, $pattern3);
        
        if (!empty($keys3)) {
            $deleted3 = $redis->del($keys3);
            $totalDeleted += $deleted3;
            Log::info("🗑️ Redis: Eliminadas {$deleted3} claves n8n_memory", [
                'pattern' => $pattern3,
            ]);
        }

        // Patrón 4: Claves genéricas de historial de chat
        $pattern4 = "chat_history_company_{$company->slug}_*";
        $keys4 = $this->scanRedisKeys($redis, $pattern4);
        
        if (!empty($keys4)) {
            $deleted4 = $redis->del($keys4);
            $totalDeleted += $deleted4;
            Log::info("🗑️ Redis: Eliminadas {$deleted4} claves chat_history", [
                'pattern' => $pattern4,
            ]);
        }

        Log::info("🗑️ Redis: Total claves eliminadas: {$totalDeleted}");

        return $totalDeleted;
    }

    /**
     * Resetear el workflow de n8n desactivándolo y reactivándolo.
     * Con Redis Chat Memory, la memoria principal está en Redis (se limpia arriba),
     * pero el reset del workflow limpia cualquier caché in-process residual.
     */
    public function resetN8nWorkflow(Company $company): bool
    {
        $settings = $company->settings ?? [];
        $workflowId = $settings['bot_workflow_id'] ?? null;
        
        if (!$workflowId) {
            // Intentar obtener desde whatsapp_instances
            $instance = $company->whatsappInstances()->first();
            $workflowId = $instance?->n8n_workflow_id ?? null;
        }

        if (!$workflowId) {
            Log::warning('ConversationMemoryService: No se encontró workflow_id para resetear', [
                'company' => $company->slug,
            ]);
            return false;
        }

        $n8nService = app(N8nService::class);

        // Paso 1: Desactivar workflow
        Log::info("🔄 Desactivando workflow n8n {$workflowId}...");
        $deactivateResult = $n8nService->deactivateWorkflow($workflowId);
        
        if (!($deactivateResult['success'] ?? false)) {
            Log::warning("No se pudo desactivar workflow {$workflowId}", $deactivateResult);
            return false;
        }

        // Pequeña pausa para que n8n limpie la memoria
        usleep(500000); // 500ms

        // Paso 2: Reactivar workflow
        Log::info("🔄 Reactivando workflow n8n {$workflowId}...");
        $activateResult = $n8nService->activateWorkflow($workflowId);
        
        if (!($activateResult['success'] ?? false)) {
            Log::error("⚠️ CRÍTICO: Workflow {$workflowId} no se pudo reactivar. Reactivar manualmente.", $activateResult);
            return false;
        }

        Log::info("✅ Workflow n8n {$workflowId} reseteado exitosamente");
        return true;
    }

    /**
     * Obtener un resumen de claves Redis existentes para diagnóstico.
     */
    public function getDiagnostics(Company $company): array
    {
        $redis = Redis::connection('n8n');
        $diagnostics = [];

        // Buscar claves de memoria de sesión
        $sessionKeys = $this->scanRedisKeys($redis, "company_{$company->slug}_*");
        $diagnostics['session_memory_keys'] = [
            'count' => count($sessionKeys),
            'keys' => array_slice($sessionKeys, 0, 50),
        ];

        // Buscar claves de chat_history
        $chatKeys = $this->scanRedisKeys($redis, "chat_history_company_{$company->slug}_*");
        $diagnostics['chat_history_keys'] = [
            'count' => count($chatKeys),
            'keys' => array_slice($chatKeys, 0, 50),
        ];

        // Buscar todas las claves con el slug
        $allSlugKeys = $this->scanRedisKeys($redis, "*{$company->slug}*");
        $diagnostics['all_slug_keys'] = [
            'count' => count($allSlugKeys),
            'keys' => array_slice($allSlugKeys, 0, 50),
        ];

        // Scan all keys starting with "company_" to find any memory keys
        $allCompanyKeys = $this->scanRedisKeys($redis, "company_*");
        $diagnostics['all_company_prefix_keys'] = [
            'count' => count($allCompanyKeys),
            'sample' => array_slice($allCompanyKeys, 0, 30),
        ];

        // Info del workflow
        $settings = $company->settings ?? [];
        $diagnostics['workflow_id'] = $settings['bot_workflow_id'] ?? null;
        
        $instance = $company->whatsappInstances()->first();
        $diagnostics['instance_workflow_id'] = $instance?->n8n_workflow_id ?? null;

        return $diagnostics;
    }

    /**
     * Actualizar el system prompt del workflow de n8n para reforzar la identidad.
     * Agrega instrucciones explícitas para ignorar nombres antiguos en el historial.
     */
    public function strengthenSystemPrompt(Company $company): bool
    {
        $settings = $company->settings ?? [];
        $workflowId = $settings['bot_workflow_id'] ?? null;
        
        if (!$workflowId) {
            $instance = $company->whatsappInstances()->first();
            $workflowId = $instance?->n8n_workflow_id ?? null;
        }

        if (!$workflowId) {
            Log::warning('ConversationMemoryService: No workflow_id para actualizar prompt');
            return false;
        }

        $n8nService = app(N8nService::class);

        try {
            // Obtener workflow actual
            $workflowResult = $n8nService->getWorkflow($workflowId);
            if (!($workflowResult['success'] ?? false) || !isset($workflowResult['data']['nodes'])) {
                Log::error('No se pudo obtener workflow para actualizar prompt');
                return false;
            }

            $workflow = $workflowResult['data'];

            // Buscar el nodo AI Agent
            $updated = false;
            foreach ($workflow['nodes'] as &$node) {
                if (($node['type'] ?? '') === '@n8n/n8n-nodes-langchain.agent') {
                    $systemMessage = $node['parameters']['options']['systemMessage'] ?? '';
                    
                    // Verificar si ya tiene la instrucción de override
                    if (str_contains($systemMessage, 'REGLA ABSOLUTA DE IDENTIDAD')) {
                        Log::info('System prompt ya tiene instrucción de override');
                        return true;
                    }

                    // Agregar instrucción de override después de "TU IDENTIDAD:"
                    $identityOverride = "\n\nREGLA ABSOLUTA DE IDENTIDAD:\n- Tu nombre es SIEMPRE y ÚNICAMENTE {{ \$('Normalize Data').item.json.config.assistant_name }}\n- Si en mensajes anteriores del historial aparece un nombre diferente (como si antes te llamaras de otra forma), IGNÓRALO completamente\n- NUNCA digas que te llamas de una forma diferente a {{ \$('Normalize Data').item.json.config.assistant_name }}\n- El historial de conversación puede contener nombres desactualizados, tu nombre ACTUAL es {{ \$('Normalize Data').item.json.config.assistant_name }}";

                    // Insertar después de las PROHIBICIONES
                    if (str_contains($systemMessage, 'PROHIBICIONES:')) {
                        $systemMessage = str_replace(
                            'PROHIBICIONES:',
                            $identityOverride . "\n\nPROHIBICIONES:",
                            $systemMessage
                        );
                    } else {
                        // Fallback: agregar al final
                        $systemMessage .= $identityOverride;
                    }

                    $node['parameters']['options']['systemMessage'] = $systemMessage;
                    $updated = true;
                    break;
                }
            }

            if (!$updated) {
                Log::warning('No se encontró nodo AI Agent en el workflow');
                return false;
            }

            // Actualizar workflow en n8n - API requiere nodes + connections + name
            // Fix: PHP serializes empty arrays as [] instead of {} (object) — n8n requires objects
            $fixedNodes = array_map(function ($node) {
                if (empty($node['parameters']) || (is_array($node['parameters']) && array_keys($node['parameters']) === range(0, count($node['parameters']) - 1))) {
                    $node['parameters'] = (object)($node['parameters'] ?? []);
                }
                return $node;
            }, $workflow['nodes']);
            
            $updatePayload = [
                'nodes' => $fixedNodes,
                'connections' => $workflow['connections'] ?? (object)[],
                'name' => $workflow['name'] ?? 'Workflow',
                'settings' => $workflow['settings'] ?? (object)[],
            ];
            $result = $n8nService->updateWorkflow($workflowId, $updatePayload);
            
            if ($result['success'] ?? false) {
                Log::info('✅ System prompt actualizado con instrucción de override de identidad');
                return true;
            }

            Log::error('Error al actualizar workflow con nuevo prompt', $result);
            return false;

        } catch (\Exception $e) {
            Log::error('Error al actualizar system prompt', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Escanear Redis usando SCAN (no KEYS, que es blocking en producción).
     */
    private function scanRedisKeys($redis, string $pattern): array
    {
        $keys = [];
        $cursor = '0';
        
        do {
            $result = $redis->scan($cursor, ['match' => $pattern, 'count' => 100]);
            
            if ($result === false) {
                break;
            }

            // Predis returns [cursor, keys]
            if (is_array($result)) {
                $cursor = $result[0] ?? '0';
                $foundKeys = $result[1] ?? [];
                $keys = array_merge($keys, $foundKeys);
            } else {
                break;
            }
        } while ($cursor !== '0' && $cursor !== 0);

        return $keys;
    }
}
