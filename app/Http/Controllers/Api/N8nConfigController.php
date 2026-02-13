<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\WhatsAppInstance;
use App\Services\QdrantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class N8nConfigController extends Controller
{
    /**
     * Get company configuration by slug.
     */
    public function companyConfig(string $companySlug): JsonResponse
    {
        try {
            $company = Company::where('slug', $companySlug)->first();

            if (!$company) {
                return response()->json([
                    'success' => false,
                    'error' => 'Empresa no encontrada',
                    'assistant_name' => 'MIA',
                    'company_name' => $companySlug,
                ]);
            }

            return response()->json([
                'success' => true,
                'assistant_name' => $company->assistant_name ?? 'MIA',
                'company_name' => $company->name ?? $companySlug,
                'company_slug' => $company->slug,
                'openai_api_key' => $company->settings['openai_api_key'] ?? config('services.openai.api_key'),
                'qdrant_host' => config('qdrant.url'),
                'collection_name' => 'company_' . $company->slug . '_knowledge',
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * Get company configuration by inbox name (resolves instance → company).
     */
    public function companyConfigByInbox(string $inboxName): JsonResponse
    {
        try {
            $instanceName = preg_replace('/^WhatsApp\s+/i', '', $inboxName);

            $whatsappInstance = WhatsAppInstance::where('instance_name', $instanceName)->first();

            if (!$whatsappInstance) {
                $whatsappInstance = WhatsAppInstance::where('instance_name', 'like', '%' . $instanceName . '%')->first();
            }

            $company = $whatsappInstance ? $whatsappInstance->company : null;

            if (!$company) {
                $company = Company::where('slug', $instanceName)->first();
            }

            if (!$company) {
                Log::warning('Company not found for inbox', ['inbox' => $inboxName, 'instance' => $instanceName]);

                return response()->json([
                    'success' => false,
                    'error' => 'Empresa no encontrada para inbox: ' . $inboxName,
                ], 404);
            }

            if (!$whatsappInstance) {
                $whatsappInstance = WhatsAppInstance::where('company_id', $company->id)
                    ->where('is_active', true)
                    ->first();
            }

            $evolutionApiUrl = $whatsappInstance?->instance_url
                ?? $company->settings['evolution_api_url']
                ?? config('evolution.api_url');

            $evolutionApiKey = $whatsappInstance?->api_key
                ?? $company->settings['evolution_api_key']
                ?? null;

            $evolutionInstanceName = $whatsappInstance?->instance_name ?? $instanceName;

            if (!$evolutionApiUrl) {
                Log::warning('Company missing Evolution config', ['company' => $company->slug]);

                return response()->json([
                    'success' => false,
                    'error' => 'Empresa ' . $company->slug . ' no tiene Evolution API configurado',
                ], 400);
            }

            return response()->json([
                'success' => true,
                'company_slug' => $company->slug,
                'company_name' => $company->name,
                'assistant_name' => $company->assistant_name ?? 'MIA',
                'ai_prompt' => $company->settings['ai_prompt'] ?? null,
                'collection_name' => 'company_' . $company->slug . '_knowledge',
                'evolution_instance_name' => $evolutionInstanceName,
                'evolution_server_url' => $evolutionApiUrl,
                'evolution_api_key' => $evolutionApiKey ?? config('evolution.api_key'),
                'chatwoot_api_token' => $company->chatwoot_api_key
                    ?? $company->settings['chatwoot_api_token']
                    ?? config('chatwoot.api_key'),
                'chatwoot_account_id' => $company->chatwoot_account_id
                    ?? $company->settings['chatwoot_account_id']
                    ?? 1,
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting company config by inbox: ' . $e->getMessage(), ['inbox' => $inboxName]);

            return $this->errorResponse($e);
        }
    }

    /**
     * Notify via WebSocket that n8n has produced a response.
     */
    public function notifyResponse(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'company_slug' => 'required|string|max:100',
                'conversation_id' => 'nullable|integer',
                'message' => 'nullable|string',
                'phone' => 'nullable|string|max:50',
                'inbox_id' => 'nullable|integer',
                'account_id' => 'nullable|integer',
            ]);

            $companySlug = $validated['company_slug'] ?? '';
            $conversationId = (int) ($validated['conversation_id'] ?? 0);
            $message = $validated['message'] ?? '';
            $phone = $validated['phone'] ?? '';
            $inboxId = (int) ($validated['inbox_id'] ?? 0);
            $accountId = (int) ($validated['account_id'] ?? 0);

            $company = null;

            if ($companySlug) {
                $company = Company::where('slug', $companySlug)->first();
            }

            if (!$company && $companySlug) {
                $instance = WhatsAppInstance::where('company_slug', $companySlug)
                    ->where('is_active', true)
                    ->with('company')
                    ->first();

                $company = $instance?->company;
            }

            if (!$inboxId && $company) {
                $inboxId = (int) ($company->chatwoot_inbox_id ?? 0);
            }

            if (!$accountId && $company) {
                $accountId = (int) ($company->chatwoot_account_id ?? 0);
            }

            if ($conversationId > 0 && $inboxId > 0 && $accountId > 0) {
                broadcast(new \App\Events\NewMessageReceived(
                    [
                        'content' => $message,
                        'message_type' => 'outgoing',
                        'sender' => ['name' => 'MIA', 'type' => 'agent_bot'],
                        'created_at' => now()->toIso8601String(),
                    ],
                    $conversationId,
                    $inboxId,
                    $accountId
                ));

                Log::debug('Notificacion WebSocket enviada', [
                    'company_slug' => $companySlug,
                    'conversation_id' => $conversationId,
                    'inbox_id' => $inboxId,
                    'account_id' => $accountId,
                    'message_preview' => substr($message, 0, 50),
                ]);
            } else {
                Log::warning('No se pudo enviar notificacion WebSocket - datos incompletos', [
                    'company_slug' => $companySlug,
                    'conversation_id' => $conversationId,
                    'inbox_id' => $inboxId,
                    'account_id' => $accountId,
                ]);
            }

            return response()->json([
                'success' => true,
                'broadcast_sent' => ($conversationId > 0 && $inboxId > 0 && $accountId > 0),
                'channel' => "inbox.{$inboxId}",
                'account_id' => $accountId,
            ]);
        } catch (\Exception $e) {
            Log::error('Error notifying response: ' . $e->getMessage(), ['data' => $request->all()]);

            return $this->errorResponse($e);
        }
    }

    /**
     * Semantic search endpoint for n8n — replaces broken Qdrant Vector Store tool.
     * n8n sends the query text; we generate the embedding and search Qdrant server-side.
     */
    public function qdrantSearch(Request $request): JsonResponse
    {
        try {
            $query = $request->input('query') ?? $request->input('input') ?? '';
            $collection = $request->input('collection', '');
            $topK = (int) $request->input('top_k', 10);

            if (empty($query) || empty($collection)) {
                return response()->json([
                    'results' => [],
                    'error' => 'Missing query or collection parameter',
                ], 400);
            }

            $qdrantService = app(QdrantService::class);
            $searchResult = $qdrantService->semanticSearch($collection, $query, $topK);

            if ($searchResult['success']) {
                // Return as plain text blocks that the AI Agent can read
                $texts = array_map(fn($r) => $r['text'], $searchResult['results']);
                return response()->json([
                    'results' => $searchResult['results'],
                    'context' => implode("\n\n---\n\n", $texts),
                    'count' => count($searchResult['results']),
                ]);
            }

            Log::warning('Qdrant search failed', ['error' => $searchResult['error'] ?? 'Unknown']);
            return response()->json([
                'results' => [],
                'context' => '',
                'count' => 0,
                'error' => $searchResult['error'] ?? 'Search failed',
            ]);

        } catch (\Exception $e) {
            Log::error('Qdrant search endpoint error: ' . $e->getMessage());
            return response()->json([
                'results' => [],
                'context' => '',
                'count' => 0,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
