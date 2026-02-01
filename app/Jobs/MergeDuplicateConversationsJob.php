<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use App\Services\ConversationDeduplicationService;

/**
 * Job para ejecutar fusión de conversaciones duplicadas en background
 * 
 * Este job se ejecuta periódicamente (via scheduler) o puede ser
 * disparado manualmente cuando se detectan posibles duplicados.
 * 
 * NOTA: NO ejecutar en cada request HTTP - esto degrada performance.
 */
class MergeDuplicateConversationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $inboxId;
    public ?int $accountId;

    /**
     * Número de intentos antes de fallar
     */
    public int $tries = 3;

    /**
     * Timeout en segundos
     */
    public int $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(int $inboxId, ?int $accountId = null)
    {
        $this->inboxId = $inboxId;
        $this->accountId = $accountId;
        
        // Ejecutar en cola específica para evitar bloquear otros jobs
        $this->onQueue('deduplication');
    }

    /**
     * Execute the job.
     */
    public function handle(ConversationDeduplicationService $deduplicationService): void
    {
        Log::info('🔄 MergeDuplicateConversationsJob: Iniciando fusión de duplicados', [
            'inbox_id' => $this->inboxId,
            'account_id' => $this->accountId
        ]);

        try {
            $result = $deduplicationService->autoMergeDuplicates(
                $this->inboxId, 
                $this->accountId
            );

            if ($result['success']) {
                if (isset($result['merged']) && $result['merged'] > 0) {
                    Log::info('✅ MergeDuplicateConversationsJob: Fusión completada', [
                        'inbox_id' => $this->inboxId,
                        'merged' => $result['merged'],
                        'groups_processed' => $result['groups_processed'] ?? 0,
                        'details' => $result['details'] ?? []
                    ]);
                } else {
                    Log::debug('✅ MergeDuplicateConversationsJob: Sin duplicados encontrados', [
                        'inbox_id' => $this->inboxId
                    ]);
                }
            } else {
                Log::error('❌ MergeDuplicateConversationsJob: Error en fusión', [
                    'inbox_id' => $this->inboxId,
                    'error' => $result['error'] ?? 'Unknown error'
                ]);
            }

        } catch (\Exception $e) {
            Log::error('💥 MergeDuplicateConversationsJob: Excepción', [
                'inbox_id' => $this->inboxId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw $e; // Re-throw para que el job se reintente
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('💀 MergeDuplicateConversationsJob: Job falló definitivamente', [
            'inbox_id' => $this->inboxId,
            'account_id' => $this->accountId,
            'error' => $exception->getMessage()
        ]);
    }
}
