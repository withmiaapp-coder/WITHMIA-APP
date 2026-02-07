<?php

namespace App\Jobs;

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
}
