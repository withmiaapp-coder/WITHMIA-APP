<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\CachedAttachment;

/**
 * Job para cachear proactivamente attachments de Chatwoot en PostgreSQL.
 * 
 * Se despacha inmediatamente cuando llega un mensaje con attachments
 * vía webhook de Chatwoot. Descarga el binario (imagen, audio, video, doc)
 * y lo guarda en la tabla cached_attachments (BYTEA) para que sobreviva
 * a redeploys de Railway (filesystem efímero de Chatwoot).
 * 
 * Sin esto, los medios se pierden cuando Chatwoot se redeploya porque
 * su Active Storage usa disco local sin volumen persistente.
 */
class CacheAttachmentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Cola dedicada para no competir con jobs críticos de mensajería.
     */
    public string $queue = 'attachments';

    /**
     * Reintentar hasta 5 veces (Chatwoot puede tener race condition
     * donde el attachment aún no está listo cuando se dispara el webhook).
     */
    public int $tries = 5;

    /**
     * Timeout generoso para archivos grandes (videos, PDFs).
     */
    public int $timeout = 60;

    /**
     * Backoff progresivo: 5s, 15s, 30s, 60s, 120s
     * Esto da tiempo a Chatwoot de procesar y guardar el archivo.
     */
    public array $backoff = [5, 15, 30, 60, 120];

    public function __construct(
        private int $attachmentId,
        private int $messageId,
        private ?int $conversationDisplayId,
        private ?string $dataUrl,
        private ?string $fileType,
        private ?int $accountId,
    ) {}

    /**
     * Maximum file size to cache (25 MB). Larger files are skipped.
     */
    private const MAX_CACHE_SIZE = 25 * 1024 * 1024;

    public function handle(): void
    {
        try {
            // Si attachmentId = 0, buscar attachments por message_id en DB Chatwoot
            if ($this->attachmentId === 0) {
                $this->handleLookupByMessageId();
                return;
            }

            // Skip si ya está cacheado
            $existing = CachedAttachment::where('attachment_id', $this->attachmentId)->first();
            if ($existing) {
                $binaryData = $existing->binary_data;
                if (is_resource($binaryData)) {
                    $binaryData = stream_get_contents($binaryData);
                }
                // Verificar que el cache no sea basura (HTML de error o archivo muy pequeño)
                if ($binaryData && strlen($binaryData) >= 100 && !str_contains($existing->content_type ?? '', 'text/html')) {
                    Log::debug('📦 [CacheAttachment] Already cached', [
                        'attachment_id' => $this->attachmentId,
                        'size' => strlen($binaryData),
                    ]);
                    return;
                }
                // Cache inválido, eliminar y re-descargar
                $existing->delete();
            }

            $chatwootUrl = rtrim(config('chatwoot.url', 'http://localhost:3000'), '/');
            $chatwootToken = config('chatwoot.platform_token');
            $accountId = $this->accountId ?? config('chatwoot.account_id', 1);

            $body = null;
            $contentType = null;

            // ─── Estrategia 1: Usar data_url del webhook (URL firmada fresca) ───
            if ($this->dataUrl) {
                $result = $this->downloadBinary($this->dataUrl);
                if ($result) {
                    $body = $result['body'];
                    $contentType = $result['content_type'];
                }
            }

            // ─── Estrategia 2: Pedir URL fresca via Chatwoot API ───
            if (!$body && $this->conversationDisplayId && $chatwootToken) {
                try {
                    $apiResponse = Http::timeout(15)->withHeaders([
                        'api_access_token' => $chatwootToken,
                        'Content-Type' => 'application/json',
                    ])->get("{$chatwootUrl}/api/v1/accounts/{$accountId}/conversations/{$this->conversationDisplayId}/messages", [
                        'before' => $this->messageId + 1,
                    ]);

                    if ($apiResponse->successful()) {
                        $messages = $apiResponse->json()['payload'] ?? [];
                        foreach ($messages as $msg) {
                            if ((int) ($msg['id'] ?? 0) === $this->messageId && !empty($msg['attachments'])) {
                                foreach ($msg['attachments'] as $att) {
                                    if ((int) ($att['id'] ?? 0) === $this->attachmentId) {
                                        $freshUrl = $att['data_url'] ?? $att['file_url'] ?? $att['thumb_url'] ?? null;
                                        if ($freshUrl) {
                                            $result = $this->downloadBinary($freshUrl);
                                            if ($result) {
                                                $body = $result['body'];
                                                $contentType = $result['content_type'];
                                            }
                                        }
                                        break 2;
                                    }
                                }
                            }
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('📦 [CacheAttachment] API lookup failed', [
                        'attachment_id' => $this->attachmentId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // ─── Estrategia 3: Buscar en la DB de Chatwoot (external_url + Active Storage) ───
            if (!$body) {
                try {
                    $chatwootDb = DB::connection('chatwoot');
                    $attachment = $chatwootDb->table('attachments')->where('id', $this->attachmentId)->first();

                    if ($attachment) {
                        // Intentar external_url
                        if (!empty($attachment->external_url)) {
                            $result = $this->downloadBinary($attachment->external_url);
                            if ($result) {
                                $body = $result['body'];
                                $contentType = $result['content_type'];
                            }
                        }

                        // Intentar Active Storage blob con admin token
                        if (!$body) {
                            $blob = $chatwootDb->table('active_storage_attachments as asa')
                                ->join('active_storage_blobs as asb', 'asa.blob_id', '=', 'asb.id')
                                ->where('asa.record_type', 'Attachment')
                                ->where('asa.record_id', $this->attachmentId)
                                ->select('asb.key', 'asb.content_type', 'asb.service_name')
                                ->first();

                            if ($blob) {
                                // Intentar con admin user_access_token para URLs más frescas
                                $adminUser = $chatwootDb->table('account_users')
                                    ->where('account_id', $accountId)
                                    ->where('role', 'administrator')
                                    ->first();

                                if ($adminUser) {
                                    $userToken = $chatwootDb->table('access_tokens')
                                        ->where('owner_type', 'User')
                                        ->where('owner_id', $adminUser->user_id)
                                        ->orderByDesc('id')
                                        ->value('token');

                                    if ($userToken && $this->conversationDisplayId) {
                                        $retryResponse = Http::timeout(15)->withHeaders([
                                            'api_access_token' => $userToken,
                                        ])->get("{$chatwootUrl}/api/v1/accounts/{$accountId}/conversations/{$this->conversationDisplayId}/messages", [
                                            'before' => $this->messageId + 1,
                                        ]);

                                        if ($retryResponse->successful()) {
                                            foreach ($retryResponse->json()['payload'] ?? [] as $retryMsg) {
                                                if ((int) ($retryMsg['id'] ?? 0) === $this->messageId && !empty($retryMsg['attachments'])) {
                                                    foreach ($retryMsg['attachments'] as $retryAtt) {
                                                        if ((int) ($retryAtt['id'] ?? 0) === $this->attachmentId) {
                                                            $freshUrl = $retryAtt['data_url'] ?? $retryAtt['file_url'] ?? null;
                                                            if ($freshUrl) {
                                                                $result = $this->downloadBinary($freshUrl);
                                                                if ($result) {
                                                                    $body = $result['body'];
                                                                    $contentType = $result['content_type'];
                                                                }
                                                            }
                                                            break 2;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                if (!$body) {
                                    $contentType = $blob->content_type;
                                }
                            }
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('📦 [CacheAttachment] DB lookup failed', [
                        'attachment_id' => $this->attachmentId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // ─── Resultado ───
            if ($body && strlen($body) >= 100) {
                // Reject files exceeding max cache size
                if (strlen($body) > self::MAX_CACHE_SIZE) {
                    Log::warning('📦 [CacheAttachment] File too large, skipping cache', [
                        'attachment_id' => $this->attachmentId,
                        'size_mb' => round(strlen($body) / 1024 / 1024, 2),
                        'max_mb' => self::MAX_CACHE_SIZE / 1024 / 1024,
                    ]);
                    return;
                }

                CachedAttachment::updateOrCreate(
                    ['attachment_id' => $this->attachmentId],
                    [
                        'content_type' => $contentType ?: 'application/octet-stream',
                        'file_size' => strlen($body),
                        'binary_data' => $body,
                        'original_url' => $this->dataUrl ? substr($this->dataUrl, 0, 1000) : null,
                        'message_id' => $this->messageId,
                    ]
                );

                Log::info('📦 [CacheAttachment] ✅ Cached successfully', [
                    'attachment_id' => $this->attachmentId,
                    'message_id' => $this->messageId,
                    'content_type' => $contentType,
                    'size_bytes' => strlen($body),
                    'attempt' => $this->attempts(),
                ]);
            } else {
                // Si no pudimos descargar y aún nos quedan intentos, fallar para reintentar
                if ($this->attempts() < $this->tries) {
                    Log::warning('📦 [CacheAttachment] Download failed, will retry', [
                        'attachment_id' => $this->attachmentId,
                        'attempt' => $this->attempts(),
                        'max_tries' => $this->tries,
                    ]);
                    $this->fail(new \RuntimeException("Failed to download attachment {$this->attachmentId} on attempt {$this->attempts()}"));
                    return;
                }

                Log::error('📦 [CacheAttachment] ❌ All attempts exhausted', [
                    'attachment_id' => $this->attachmentId,
                    'message_id' => $this->messageId,
                ]);
            }

        } catch (\Throwable $e) {
            Log::error('📦 [CacheAttachment] ❌ Job error', [
                'attachment_id' => $this->attachmentId,
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
            ]);
            throw $e; // Re-throw para que el sistema de colas reintente
        }
    }

    /**
     * Descargar binario de una URL. Valida que no sea HTML de error.
     */
    private function downloadBinary(string $url): ?array
    {
        try {
            $response = Http::timeout(30)->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept' => '*/*',
            ])->get($url);

            if ($response->failed() || empty($response->body())) {
                return null;
            }

            $body = $response->body();
            $contentType = $response->header('Content-Type') ?: 'application/octet-stream';

            // Rechazar HTML de error
            if (str_contains($contentType, 'text/html') && strlen($body) < 5000) {
                return null;
            }

            return ['body' => $body, 'content_type' => $contentType];
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Buscar attachments por message_id en Chatwoot DB y despachar
     * un CacheAttachmentJob por cada uno encontrado.
     * Se usa cuando el webhook llegó sin attachments (race condition).
     */
    private function handleLookupByMessageId(): void
    {
        try {
            $chatwootDb = DB::connection('chatwoot');
            $attachments = $chatwootDb->table('attachments')
                ->where('message_id', $this->messageId)
                ->get();

            if ($attachments->isEmpty()) {
                if ($this->attempts() < $this->tries) {
                    Log::debug('📦 [CacheAttachment] No attachments found for message_id, will retry', [
                        'message_id' => $this->messageId,
                        'attempt' => $this->attempts(),
                    ]);
                    throw new \RuntimeException("No attachments found for message {$this->messageId}");
                }
                Log::info('📦 [CacheAttachment] No attachments for message (was text-only)', [
                    'message_id' => $this->messageId,
                ]);
                return;
            }

            $accountId = $this->accountId ?? config('chatwoot.account_id', 1);

            foreach ($attachments as $att) {
                // Dispatch individual jobs for each found attachment
                if (!CachedAttachment::where('attachment_id', $att->id)->exists()) {
                    self::dispatch(
                        (int) $att->id,
                        $this->messageId,
                        $this->conversationDisplayId,
                        $att->external_url,
                        $att->file_type ?? null,
                        $accountId,
                    );
                }
            }

            Log::info('📦 [CacheAttachment] Found and dispatched from message lookup', [
                'message_id' => $this->messageId,
                'attachments_found' => $attachments->count(),
            ]);
        } catch (\RuntimeException $e) {
            throw $e; // Re-throw for retry
        } catch (\Throwable $e) {
            Log::warning('📦 [CacheAttachment] Message lookup failed', [
                'message_id' => $this->messageId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('📦 [CacheAttachment] Job failed permanently', [
            'attachment_id' => $this->attachmentId,
            'message_id' => $this->messageId,
            'conversation_id' => $this->conversationDisplayId,
            'error' => $exception->getMessage(),
        ]);
    }
}
