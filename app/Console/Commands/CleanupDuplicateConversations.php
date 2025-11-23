<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class CleanupDuplicateConversations extends Command
{
    protected $signature = 'chatwoot:cleanup-duplicates';
    protected $description = 'Limpia conversaciones duplicadas del mismo contacto';

    public function handle()
    {
        $chatwootBaseUrl = config('services.chatwoot.url', 'http://localhost:3000');
        $chatwootToken = config('services.chatwoot.token');
        $accountId = 1;
        $inboxId = 1;

        $this->info('🔍 Buscando conversaciones duplicadas...');

        // Obtener todas las conversaciones
        $response = Http::withHeaders([
            'api_access_token' => $chatwootToken
        ])->get("$chatwootBaseUrl/api/v1/accounts/$accountId/conversations", [
            'inbox_id' => $inboxId,
            'status' => 'open'
        ]);

        if (!$response->successful()) {
            $this->error('❌ Error obteniendo conversaciones');
            return 1;
        }

        $conversations = $response->json()['payload'] ?? [];
        $this->info("📊 Total conversaciones abiertas: " . count($conversations));

        // Agrupar por teléfono
        $phoneMap = [];
        foreach ($conversations as $conv) {
            $identifier = $conv['meta']['sender']['identifier'] ?? '';
            $phone = preg_replace('/[^0-9]/', '', $identifier);
            
            if (empty($phone)) continue;
            
            if (!isset($phoneMap[$phone])) {
                $phoneMap[$phone] = [];
            }
            
            $phoneMap[$phone][] = [
                'id' => $conv['id'],
                'identifier' => $identifier,
                'created_at' => $conv['created_at'] ?? '',
                'unread_count' => $conv['unread_count'] ?? 0
            ];
        }

        // Encontrar y eliminar duplicados
        $deleted = 0;
        foreach ($phoneMap as $phone => $convs) {
            if (count($convs) > 1) {
                $this->warn("\n⚠️ Duplicados encontrados para teléfono: $phone");
                
                // Ordenar: mantener la más antigua y con más mensajes
                usort($convs, function($a, $b) {
                    if ($a['unread_count'] != $b['unread_count']) {
                        return $b['unread_count'] - $a['unread_count'];
                    }
                    return strtotime($a['created_at']) - strtotime($b['created_at']);
                });
                
                // Mantener la primera, eliminar las demás
                $toKeep = array_shift($convs);
                $this->line("  ✅ Manteniendo: {$toKeep['id']} ({$toKeep['identifier']})");
                
                foreach ($convs as $conv) {
                    $this->line("  🗑️ Archivando: {$conv['id']} ({$conv['identifier']})");
                    
                    $deleteResponse = Http::withHeaders([
                        'api_access_token' => $chatwootToken
                    ])->post("$chatwootBaseUrl/api/v1/accounts/$accountId/conversations/{$conv['id']}/toggle_status");
                    
                    if ($deleteResponse->successful()) {
                        $this->line("    ✓ Archivada");
                        $deleted++;
                    } else {
                        $this->error("    ✗ Error: " . $deleteResponse->status());
                    }
                    
                    sleep(1);
                }
            }
        }

        $this->info("\n✅ Limpieza completada. Conversaciones archivadas: $deleted");
        return 0;
    }
}
