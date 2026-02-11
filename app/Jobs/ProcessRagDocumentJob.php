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
 * Job to send extracted document text to n8n RAG webhook.
 * 
 * Runs in the queue worker (not the Octane HTTP worker) so it doesn't
 * hit Octane's max_execution_time limit. n8n can take 60-120s to process
 * document chunking + embedding + Qdrant storage.
 */
class ProcessRagDocumentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 180; // 3 minutes max
    public int $backoff = 10;

    public function __construct(
        private string $webhookUrl,
        private array $payload,
        private string $filename,
    ) {}

    public function handle(): void
    {
        Log::info("ProcessRagDocumentJob: Sending '{$this->filename}' to n8n", [
            'webhook_url' => $this->webhookUrl,
            'text_length' => strlen($this->payload['text'] ?? ''),
            'company_slug' => $this->payload['company_slug'] ?? 'unknown',
        ]);

        try {
            $response = Http::timeout(120)->post($this->webhookUrl, $this->payload);

            if ($response->successful()) {
                Log::info("ProcessRagDocumentJob: n8n responded successfully for '{$this->filename}'", [
                    'status' => $response->status(),
                ]);
            } else {
                Log::error("ProcessRagDocumentJob: n8n webhook failed for '{$this->filename}'", [
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 500),
                ]);

                // Retry on 5xx errors
                if ($response->serverError()) {
                    $this->release(30); // retry in 30 seconds
                }
            }
        } catch (\Exception $e) {
            Log::error("ProcessRagDocumentJob: Exception for '{$this->filename}': " . $e->getMessage());
            throw $e; // Let Laravel retry the job
        }
    }
}
