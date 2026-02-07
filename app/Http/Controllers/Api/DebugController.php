<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class DebugController extends Controller
{
    public function getBotState(string $phone): JsonResponse
    {
        try {
            $redis = Redis::connection('n8n');
            $value = $redis->get($phone);
            $ttl = $redis->ttl($phone);

            return response()->json([
                'success' => true,
                'data' => [
                    'phone' => $phone,
                    'value' => $value,
                    'ttl_seconds' => $ttl,
                    'ttl_human' => $ttl > 0 ? gmdate('H:i:s', $ttl) : 'expired/not-set',
                ],
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function deleteBotState(string $phone): JsonResponse
    {
        try {
            $redis = Redis::connection('n8n');
            $deleted = $redis->del($phone);

            return response()->json([
                'success' => true,
                'data' => [
                    'phone' => $phone,
                    'deleted' => $deleted > 0,
                    'message' => $deleted > 0 ? 'Bot reactivado - key eliminada' : 'Key no existía',
                ],
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function setBotState(string $phone, Request $request): JsonResponse
    {
        try {
            $redis = Redis::connection('n8n');
            $ttl = $request->input('ttl', 60);
            $redis->setex($phone, $ttl, 'human-takeover');

            return response()->json([
                'success' => true,
                'data' => [
                    'phone' => $phone,
                    'set' => true,
                    'ttl_seconds' => $ttl,
                    'message' => "Bot pausado por {$ttl} segundos",
                ],
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function getBotConfig(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $company = $user->company;

            if (!$company) {
                return response()->json(['success' => false, 'error' => 'Usuario sin empresa'], 400);
            }

            $n8nService = app(\App\Services\N8nService::class);
            $workflowId = $company->settings['n8n_workflow_id'] ?? null;

            if (!$workflowId) {
                return response()->json(['success' => false, 'error' => 'Sin workflow ID'], 400);
            }

            $result = $n8nService->getWorkflow($workflowId);

            if (!$result['success']) {
                return response()->json(['success' => false, 'error' => 'No se pudo obtener workflow'], 500);
            }

            $workflow = $result['data'];
            $config = [
                'workflow_id' => $workflowId,
                'workflow_name' => $workflow['name'] ?? 'Unknown',
                'unlock_keyword' => null,
                'block_duration' => null,
            ];

            foreach ($workflow['nodes'] ?? [] as $node) {
                $nodeName = $node['name'] ?? '';
                $params = $node['parameters'] ?? [];

                if (str_contains($nodeName, 'Palabra Clave') || str_contains($nodeName, 'Verifica Palabra')) {
                    $config['unlock_keyword'] = $params['value1'] ?? $params['conditions']['options'][0]['leftValue'] ?? null;
                    $config['unlock_node_name'] = $nodeName;
                }

                if (str_contains($nodeName, 'Bloquea') && str_contains($nodeName, 'Agente')) {
                    $config['block_duration'] = $params['value'] ?? $params['ttl'] ?? null;
                    $config['block_node_name'] = $nodeName;
                }
            }

            return response()->json(['success' => true, 'data' => $config]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }
}
