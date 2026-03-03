<?php

namespace App\Jobs;

use App\Models\AiUsage;
use App\Models\Company;
use App\Services\AiUsageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Job para enriquecer mensajes de Chatwoot con attachments y reenviar a n8n.
 * 
 * Antes esto se hacía de forma síncrona en el webhook controller, 
 * bloqueando un worker de Octane hasta 14 segundos con usleep().
 * Ahora se ejecuta en la cola sin bloquear workers.
 * 
 * Incluye AI usage tracking y enforcement de límites por plan.
 */
class ForwardToN8nWithEnrichmentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds the job can run before timing out.
     */
    public int $timeout = 30;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public int $backoff = 5;

    public function __construct(
        private array $data,
        private ?int $inboxId,
        private ?int $accountId,
        private string $instanceSlug,
    ) {}

    public function handle(): void
    {
        try {
            $content = $this->data['content'] ?? '';
            $attachments = $this->data['attachments'] ?? [];
            $messageId = $this->data['id'] ?? null;
            $conversationId = $this->data['conversation']['id'] ?? null;

            // 🔧 FIX: Si conversation.id es null, buscar en Chatwoot API usando sender + inbox
            if (!$conversationId && $this->inboxId) {
                $conversationId = $this->resolveConversationId();
                if ($conversationId) {
                    $this->data['conversation']['id'] = $conversationId;
                    $this->data['conversation']['inbox_id'] = $this->inboxId;
                    Log::info('🔧 [Job] conversation.id resuelto desde Chatwoot API', [
                        'conversation_id' => $conversationId,
                        'inbox_id' => $this->inboxId,
                    ]);
                } else {
                    Log::warning('⚠️ [Job] No se pudo resolver conversation.id desde Chatwoot API', [
                        'inbox_id' => $this->inboxId,
                        'sender' => $this->data['sender']['phone_number'] ?? $this->data['sender']['identifier'] ?? 'unknown',
                    ]);
                }
            }

            // Si ya vienen attachments, asegurar que content_type esté seteado
            if (!empty($attachments)) {
                $fileType = $attachments[0]['file_type'] ?? null;
                if ($fileType && !isset($this->data['content_type'])) {
                    $this->data['content_type'] = $fileType;
                }
            }

            // Si el mensaje NO tiene contenido NI attachments, esperar y reintentar con la API
            if (empty($content) && empty($attachments) && $messageId && $conversationId) {
                Log::info('🔄 [Job] Mensaje sin contenido ni attachments - buscando con retry...', [
                    'message_id' => $messageId,
                ]);

                $chatwootUrl = rtrim(config('chatwoot.url', ''), '/');
                $apiToken = config('chatwoot.super_admin_token') ?? config('chatwoot.platform_token');

                // Retry loop con sleep (seguro en un Job, NO bloquea Octane)
                $maxRetries = 4;
                $attachmentsFound = false;

                for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
                    $waitSeconds = $attempt + 1; // 2s, 3s, 4s, 5s
                    sleep($waitSeconds);

                    try {
                        $response = Http::withHeaders([
                            'api_access_token' => $apiToken,
                        ])->timeout(10)->get("{$chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations/{$conversationId}/messages");

                        if ($response->successful()) {
                            $messages = $response->json('payload', []);
                            $targetMsg = collect($messages)->firstWhere('id', $messageId);

                            if ($targetMsg && !empty($targetMsg['attachments'])) {
                                $this->data['attachments'] = $targetMsg['attachments'];
                                $fileType = $targetMsg['attachments'][0]['file_type'] ?? null;

                                if ($fileType) {
                                    $this->data['content_type'] = $fileType;
                                }

                                Log::info("✅ [Job] Attachments enriquecidos en intento #{$attempt}", [
                                    'message_id' => $messageId,
                                    'attachment_count' => count($this->data['attachments']),
                                    'file_type' => $fileType,
                                ]);
                                $attachmentsFound = true;
                                break;
                            }
                        }
                    } catch (\Exception $retryException) {
                        Log::warning("⚠️ [Job] Error en retry #{$attempt}", [
                            'message_id' => $messageId,
                            'error' => $retryException->getMessage(),
                        ]);
                    }
                }

                if (!$attachmentsFound) {
                    Log::warning('⚠️ [Job] No se encontraron attachments después de todos los reintentos', [
                        'message_id' => $messageId,
                        'total_retries' => $maxRetries,
                    ]);
                }
            }

            // ══════════════════════════════════════════════
            // AI USAGE TRACKING + LIMIT ENFORCEMENT
            // ══════════════════════════════════════════════
            $company = Company::where('slug', $this->instanceSlug)->first();
            if ($company) {
                $aiUsageService = app(AiUsageService::class);

                // Check if company has reached AI message limit
                if (!$aiUsageService->canSendMessage($company->id)) {
                    Log::warning('🚫 AI limit reached — skipping n8n forward', [
                        'company_id' => $company->id,
                        'instance' => $this->instanceSlug,
                    ]);
                    // Don't forward to n8n — bot won't respond
                    // The message still exists in Chatwoot for human agents
                    return;
                }

                // Record the AI message (pre-count — n8n will process it)
                $aiUsageService->recordMessage($company->id);

                // Inject AI usage info + model config into the n8n payload
                $usageStats = $aiUsageService->getUsageStats($company->id);
                $modelConfig = $aiUsageService->getRecommendedModel($company->id);

                $this->data['_withmia'] = [
                    'ai_usage' => $usageStats,
                    'model' => $modelConfig,
                    'company_id' => $company->id,
                ];
            }

            // Reenviar a n8n
            $n8nBaseUrl = rtrim(config('n8n.url', ''), '/');
            $n8nWebhookUrl = "{$n8nBaseUrl}/webhook/{$this->instanceSlug}";

            Log::info('📤 [Job] Reenviando a n8n', [
                'url' => $n8nWebhookUrl,
                'has_attachments' => !empty($this->data['attachments']),
                'file_type' => $this->data['attachments'][0]['file_type'] ?? 'none',
            ]);

            $n8nResponse = Http::timeout(15)->post($n8nWebhookUrl, $this->data);

            Log::info('✅ [Job] n8n forward completado', [
                'status' => $n8nResponse->status(),
                'instance' => $this->instanceSlug,
            ]);
        } catch (\Exception $e) {
            Log::error('❌ [Job] Error en ForwardToN8nWithEnrichmentJob', [
                'error' => $e->getMessage(),
                'instance' => $this->instanceSlug,
            ]);
            throw $e; // Re-throw para que el job se reintente
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('💀 [Job] ForwardToN8nWithEnrichmentJob falló definitivamente', [
            'instance' => $this->instanceSlug,
            'message_id' => $this->data['id'] ?? null,
            'error' => $exception->getMessage(),
        ]);
    }

    /**
     * Resolver conversation.id desde Chatwoot API cuando el webhook lo envía como null.
     * Busca el contacto por teléfono y luego encuentra la conversación abierta en el inbox.
     */
    private function resolveConversationId(): ?int
    {
        $chatwootUrl = rtrim(config('chatwoot.url', ''), '/');
        $token = config('chatwoot.api_key')
            ?? config('chatwoot.super_admin_token')
            ?? config('chatwoot.platform_token');

        if (!$token || !$chatwootUrl) {
            return null;
        }

        // Extraer teléfono del sender
        $phone = $this->data['sender']['phone_number']
            ?? $this->data['sender']['identifier']
            ?? null;

        if (!$phone) {
            return null;
        }

        $searchPhone = str_replace(['+', ' ', '-', '@s.whatsapp.net'], '', $phone);

        try {
            // 1. Buscar contacto
            $response = Http::withHeaders(['api_access_token' => $token])
                ->timeout(10)
                ->get("{$chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts/search", [
                    'q' => $searchPhone,
                    'page' => 1,
                ]);

            if (!$response->successful()) {
                return null;
            }

            $contacts = $response->json('payload', []);
            $contactId = null;

            foreach ($contacts as $contact) {
                $contactPhone = str_replace(['+', ' ', '-'], '', $contact['phone_number'] ?? '');
                if ($contactPhone === $searchPhone || str_ends_with($contactPhone, $searchPhone) || str_ends_with($searchPhone, $contactPhone)) {
                    $contactId = $contact['id'];
                    break;
                }
            }

            if (!$contactId) {
                return null;
            }

            // 2. Buscar conversaciones del contacto
            $convResponse = Http::withHeaders(['api_access_token' => $token])
                ->timeout(10)
                ->get("{$chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts/{$contactId}/conversations");

            if (!$convResponse->successful()) {
                return null;
            }

            $conversations = $convResponse->json('payload', []);

            // Preferir conversación abierta en el inbox correcto
            $conversation = collect($conversations)
                ->filter(fn($c) => ($c['inbox_id'] ?? null) == $this->inboxId && ($c['status'] ?? '') !== 'resolved')
                ->sortByDesc('id')
                ->first();

            if (!$conversation) {
                $conversation = collect($conversations)
                    ->filter(fn($c) => ($c['inbox_id'] ?? null) == $this->inboxId)
                    ->sortByDesc('id')
                    ->first();
            }

            return $conversation['id'] ?? null;
        } catch (\Throwable $e) {
            Log::warning('⚠️ [Job] Error resolviendo conversation.id', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }
}
