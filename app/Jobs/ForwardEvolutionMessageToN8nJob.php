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
 * Job para reenviar mensajes de Evolution API a n8n.
 * 
 * Bypass de Chatwoot webhooks: dado que los webhooks de Chatwoot no disparan
 * consistentemente para mensajes creados por la integración de Evolution API,
 * este Job busca la conversación en Chatwoot y reenvía directamente a n8n con
 * un payload compatible con el formato de Chatwoot.
 * 
 * Flujo: Evolution Webhook → This Job (queued) → Chatwoot API lookup → n8n
 */
class ForwardEvolutionMessageToN8nJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 45;
    public int $backoff = 5;

    public function __construct(
        private string $phone,
        private string $content,
        private string $instanceName,
        private int $accountId,
        private ?int $inboxId,
        private ?string $pushName,
        private ?string $whatsappMessageId,
        private array $rawData = [],
    ) {}

    public function handle(): void
    {
        // Dedup: prevent double-forwarding if Chatwoot webhook ALSO works
        $dedupKey = "n8n_evo_fwd_{$this->whatsappMessageId}";
        if ($this->whatsappMessageId && Cache::has($dedupKey)) {
            Log::debug('⏭️ n8n forward already sent for this message', [
                'message_id' => $this->whatsappMessageId,
            ]);
            return;
        }
        if ($this->whatsappMessageId) {
            Cache::put($dedupKey, true, 120);
        }

        // Wait for Chatwoot to process the message (Evolution → Chatwoot integration has ~1-3s delay)
        sleep(3);

        $chatwootUrl = rtrim(config('chatwoot.url', ''), '/');
        $token = config('chatwoot.super_admin_token') ?? config('chatwoot.platform_token');

        if (!$token || !$chatwootUrl) {
            Log::error('❌ [EvolutionN8nJob] Missing Chatwoot URL or token');
            return;
        }

        // --- Step 1: Find contact by phone in Chatwoot ---
        $searchPhone = ltrim($this->phone, '+');
        $contactId = null;
        $contactData = null;

        try {
            $response = Http::withHeaders(['api_access_token' => $token])
                ->timeout(10)
                ->get("{$chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts/search", [
                    'q' => $searchPhone,
                    'page' => 1,
                ]);

            if ($response->successful()) {
                $contacts = $response->json('payload', []);
                
                foreach ($contacts as $contact) {
                    $contactPhone = str_replace(['+', ' ', '-'], '', $contact['phone_number'] ?? '');
                    $normalizedSearch = str_replace(['+', ' ', '-'], '', $searchPhone);
                    
                    if ($contactPhone === $normalizedSearch || str_ends_with($contactPhone, $normalizedSearch) || str_ends_with($normalizedSearch, $contactPhone)) {
                        $contactId = $contact['id'];
                        $contactData = $contact;
                        break;
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::warning('⚠️ [EvolutionN8nJob] Contact search failed', ['error' => $e->getMessage()]);
        }

        if (!$contactId) {
            Log::warning('⚠️ [EvolutionN8nJob] Contact not found in Chatwoot, trying direct conversation search', [
                'phone' => $this->phone,
            ]);
            
            // Fallback: try to list recent conversations in inbox
            $conversation = $this->findConversationByInbox($chatwootUrl, $token);
            if ($conversation) {
                $this->forwardToN8n($conversation);
                return;
            }
            
            Log::error('❌ [EvolutionN8nJob] Could not find conversation for n8n forward', [
                'phone' => $this->phone,
                'instance' => $this->instanceName,
            ]);
            return;
        }

        // --- Step 2: Get conversations for this contact ---
        $conversation = null;

        try {
            $convResponse = Http::withHeaders(['api_access_token' => $token])
                ->timeout(10)
                ->get("{$chatwootUrl}/api/v1/accounts/{$this->accountId}/contacts/{$contactId}/conversations");

            if ($convResponse->successful()) {
                $conversations = $convResponse->json('payload', []);
                
                // Find the open conversation for our inbox (prefer open, then any)
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

                if (!$conversation) {
                    // Any conversation for this contact
                    $conversation = collect($conversations)->sortByDesc('id')->first();
                }
            }
        } catch (\Throwable $e) {
            Log::warning('⚠️ [EvolutionN8nJob] Conversations lookup failed', ['error' => $e->getMessage()]);
        }

        if (!$conversation) {
            Log::warning('⚠️ [EvolutionN8nJob] No conversation found for contact', [
                'contact_id' => $contactId,
                'phone' => $this->phone,
            ]);
            return;
        }

        $this->forwardToN8n($conversation, $contactData);
    }

    /**
     * Fallback: find conversation by listing inbox conversations
     */
    private function findConversationByInbox(string $chatwootUrl, string $token): ?array
    {
        if (!$this->inboxId) return null;

        try {
            $response = Http::withHeaders(['api_access_token' => $token])
                ->timeout(10)
                ->get("{$chatwootUrl}/api/v1/accounts/{$this->accountId}/conversations", [
                    'inbox_id' => $this->inboxId,
                    'status' => 'open',
                    'page' => 1,
                ]);

            if ($response->successful()) {
                $conversations = $response->json('data.payload', []);
                $searchPhone = str_replace(['+', ' ', '-'], '', $this->phone);
                
                foreach ($conversations as $conv) {
                    $identifier = $conv['meta']['sender']['identifier'] ?? '';
                    $senderPhone = str_replace(['@s.whatsapp.net', '@lid', '+', ' ', '-'], '', $identifier);
                    
                    if ($senderPhone === $searchPhone || str_ends_with($senderPhone, $searchPhone) || str_ends_with($searchPhone, $senderPhone)) {
                        return $conv;
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::warning('⚠️ [EvolutionN8nJob] Inbox conversation search failed', ['error' => $e->getMessage()]);
        }

        return null;
    }

    /**
     * Construct Chatwoot-compatible payload and forward to n8n
     */
    private function forwardToN8n(array $conversation, ?array $contactData = null): void
    {
        // Construct payload in Chatwoot webhook format (n8n workflow expects this)
        $payload = [
            'event' => 'message_created',
            'message_type' => 'incoming',
            'content' => $this->content,
            'content_type' => $this->detectContentType(),
            'private' => false,
            'source_id' => $this->whatsappMessageId,
            'conversation' => $conversation,
            'inbox' => [
                'id' => $this->inboxId ?? ($conversation['inbox_id'] ?? 1),
                'name' => 'WhatsApp ' . $this->instanceName,
            ],
            'account' => ['id' => $this->accountId],
            'sender' => [
                'identifier' => $this->phone . '@s.whatsapp.net',
                'name' => $this->pushName ?? $contactData['name'] ?? $this->phone,
                'phone_number' => '+' . ltrim($this->phone, '+'),
            ],
        ];

        // Add attachments from raw data if present
        $attachments = $this->extractAttachments();
        if (!empty($attachments)) {
            $payload['attachments'] = $attachments;
        }

        // Forward to n8n
        $n8nUrl = rtrim(config('n8n.url', ''), '/') . '/webhook/' . $this->instanceName;

        try {
            $n8nResponse = Http::timeout(15)->post($n8nUrl, $payload);

            Log::info('✅ [EvolutionN8nJob] Forward to n8n completed', [
                'status' => $n8nResponse->status(),
                'conversation_id' => $conversation['id'] ?? null,
                'instance' => $this->instanceName,
                'content_preview' => substr($this->content, 0, 50),
            ]);
        } catch (\Throwable $e) {
            Log::error('❌ [EvolutionN8nJob] n8n POST failed', [
                'url' => $n8nUrl,
                'error' => $e->getMessage(),
            ]);
            throw $e; // Re-throw for retry
        }
    }

    /**
     * Detect content type from raw Evolution data
     */
    private function detectContentType(): string
    {
        $message = $this->rawData['message'] ?? [];
        
        if (isset($message['imageMessage'])) return 'image';
        if (isset($message['audioMessage'])) return 'audio';
        if (isset($message['videoMessage'])) return 'video';
        if (isset($message['documentMessage'])) return 'file';
        if (isset($message['stickerMessage'])) return 'sticker';
        if (isset($message['locationMessage'])) return 'location';
        if (isset($message['contactMessage'])) return 'contact';
        
        return 'text';
    }

    /**
     * Extract attachment info from raw Evolution data (URLs if available)
     */
    private function extractAttachments(): array
    {
        $message = $this->rawData['message'] ?? [];
        $attachments = [];

        $mediaTypes = ['imageMessage', 'audioMessage', 'videoMessage', 'documentMessage'];
        foreach ($mediaTypes as $type) {
            if (isset($message[$type])) {
                $media = $message[$type];
                $attachments[] = [
                    'file_type' => str_replace('Message', '', $type),
                    'data_url' => $media['url'] ?? $this->rawData['base64'] ?? null,
                    'file_name' => $media['fileName'] ?? $media['title'] ?? null,
                    'content_type' => $media['mimetype'] ?? null,
                ];
                break;
            }
        }

        return $attachments;
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('💀 [EvolutionN8nJob] Job failed definitively', [
            'phone' => $this->phone,
            'instance' => $this->instanceName,
            'message_id' => $this->whatsappMessageId,
            'error' => $exception->getMessage(),
        ]);
    }
}
