<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Job asíncrono para reenviar mensajes de texto de Evolution API a n8n.
 * 
 * Reemplaza el envío síncrono con usleep(2.5s) que bloqueaba el webhook.
 * Este job espera que Chatwoot procese el mensaje, busca la conversación,
 * y reenvía a n8n con un payload compatible.
 * 
 * Flujo: Evolution Webhook → dispatch(this) → sleep(3s) → Chatwoot lookup → n8n
 */
class ForwardTextMessageToN8nJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 60;
    public array $backoff = [3, 5, 10];

    public function __construct(
        private string $cleanPhone,
        private string $msgContent,
        private string $instanceName,
        private int $chatwootAccountId,
        private ?int $chatwootInboxId,
        private ?string $whatsappMsgId,
        private ?string $pushName,
        private string $chatwootToken,
        private string $chatwootUrl,
    ) {}

    public function handle(): void
    {
        // Dedup: si otro path (Chatwoot webhook) ya envió esto a n8n, skip
        $normalizedMsgId = $this->whatsappMsgId ? str_replace('WAID:', '', $this->whatsappMsgId) : null;
        $dedupKey = "n8n_fwd_{$normalizedMsgId}";
        
        if ($normalizedMsgId && Cache::has($dedupKey)) {
            Log::debug('⏭️ [ForwardTextJob] n8n forward already sent (dedup)', [
                'msg_id' => $this->whatsappMsgId,
            ]);
            return;
        }
        
        if ($normalizedMsgId) {
            Cache::put($dedupKey, true, 120);
        }

        // Esperar a que Chatwoot procese el mensaje (Evolution → Chatwoot tiene ~1-3s delay)
        sleep(3);

        // Buscar contacto y conversación en Chatwoot
        $conversationData = null;
        $senderData = null;
        
        try {
            $searchResp = Http::withHeaders(['api_access_token' => $this->chatwootToken])
                ->timeout(8)
                ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->chatwootAccountId}/contacts/search", [
                    'q' => $this->cleanPhone,
                ]);
            
            if ($searchResp->successful()) {
                $contacts = $searchResp->json('payload', []);
                $contactId = null;
                
                foreach ($contacts as $contact) {
                    $cp = str_replace(['+', ' ', '-'], '', $contact['phone_number'] ?? '');
                    $sp = str_replace(['+', ' ', '-'], '', $this->cleanPhone);
                    if ($cp === $sp || str_ends_with($cp, $sp) || str_ends_with($sp, $cp)) {
                        $contactId = $contact['id'];
                        $senderData = $contact;
                        break;
                    }
                }
                
                if ($contactId) {
                    $convResp = Http::withHeaders(['api_access_token' => $this->chatwootToken])
                        ->timeout(8)
                        ->get("{$this->chatwootUrl}/api/v1/accounts/{$this->chatwootAccountId}/contacts/{$contactId}/conversations");
                    
                    if ($convResp->successful()) {
                        $convs = $convResp->json('payload', []);
                        
                        // Preferir conversación abierta en nuestro inbox
                        $conversationData = collect($convs)
                            ->filter(fn($c) => ($c['inbox_id'] ?? null) == $this->chatwootInboxId && ($c['status'] ?? '') !== 'resolved')
                            ->sortByDesc('id')
                            ->first();
                        
                        if (!$conversationData) {
                            $conversationData = collect($convs)
                                ->filter(fn($c) => ($c['inbox_id'] ?? null) == $this->chatwootInboxId)
                                ->sortByDesc('id')
                                ->first();
                        }
                        if (!$conversationData) {
                            $conversationData = collect($convs)->sortByDesc('id')->first();
                        }
                    }
                }
            }
        } catch (\Throwable $lookupErr) {
            Log::warning('⚠️ [ForwardTextJob] Chatwoot lookup failed', [
                'error' => $lookupErr->getMessage(),
                'phone' => $this->cleanPhone,
            ]);
        }
        
        $conversationId = $conversationData['id'] ?? null;
        
        // Build Chatwoot-compatible payload for n8n
        $n8nPayload = [
            'event' => 'message_created',
            'message_type' => 'incoming',
            'content' => $this->msgContent,
            'content_type' => 'text',
            'private' => false,
            'source_id' => $this->whatsappMsgId,
            'conversation' => $conversationData ?? [
                'id' => $conversationId,
                'inbox_id' => $this->chatwootInboxId,
                'account_id' => $this->chatwootAccountId,
                'status' => 'open',
            ],
            'inbox' => [
                'id' => $this->chatwootInboxId ?? 1,
                'name' => 'WhatsApp ' . $this->instanceName,
            ],
            'account' => ['id' => $this->chatwootAccountId],
            'sender' => $senderData ? [
                'id' => $senderData['id'] ?? null,
                'identifier' => $senderData['identifier'] ?? ($this->cleanPhone . '@s.whatsapp.net'),
                'name' => $senderData['name'] ?? ($this->pushName ?? $this->cleanPhone),
                'phone_number' => $senderData['phone_number'] ?? ('+' . ltrim($this->cleanPhone, '+')),
                'email' => $senderData['email'] ?? null,
            ] : [
                'identifier' => $this->cleanPhone . '@s.whatsapp.net',
                'name' => $this->pushName ?? $this->cleanPhone,
                'phone_number' => '+' . ltrim($this->cleanPhone, '+'),
            ],
        ];
        
        // Enviar a n8n
        $n8nUrl = rtrim(config('n8n.url', ''), '/') . '/webhook/' . $this->instanceName;
        
        Log::info('📨 [ForwardTextJob] Enviando mensaje a n8n', [
            'url' => $n8nUrl,
            'phone' => $this->cleanPhone,
            'conversation_id' => $conversationId,
            'content_preview' => substr($this->msgContent, 0, 50),
        ]);
        
        try {
            $n8nResponse = Http::timeout(15)->post($n8nUrl, $n8nPayload);
            
            Log::info('✅ [ForwardTextJob] n8n forward completado', [
                'status' => $n8nResponse->status(),
                'instance' => $this->instanceName,
                'conversation_id' => $conversationId,
            ]);
        } catch (\Throwable $n8nErr) {
            Log::error('❌ [ForwardTextJob] n8n forward falló', [
                'url' => $n8nUrl,
                'error' => $n8nErr->getMessage(),
            ]);
            
            // Reintentar si falla
            if ($this->attempts() < $this->tries) {
                throw $n8nErr;
            }
        }
    }

    /**
     * Tag for queue monitoring
     */
    public function tags(): array
    {
        return ['n8n-forward', 'instance:' . $this->instanceName, 'phone:' . $this->cleanPhone];
    }
}
