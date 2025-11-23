<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Http;

class SetupUserChatwoot extends Command
{
    protected $signature = 'user:setup-chatwoot {id?}';
    protected $description = 'Configurar inbox y agente de Chatwoot para un usuario';

    public function handle()
    {
        $userId = $this->argument('id');
        $user = $userId ? User::find($userId) : User::first();

        if (!$user) {
            $this->error('Usuario no encontrado');
            return 1;
        }

        $this->info("Configurando Chatwoot para: {$user->email}");

        // Verificar si ya tiene configuración
        if ($user->chatwoot_inbox_id && $user->chatwoot_agent_id) {
            $this->warn('Usuario ya tiene inbox y agente configurados');
            return 0;
        }

        $token = env('CHATWOOT_PLATFORM_API_TOKEN');
        $baseUrl = env('CHATWOOT_API_BASE_URL', 'http://127.0.0.1:3000');
        $accountId = env('CHATWOOT_ACCOUNT_ID', '2');

        if (!$token) {
            $this->error('CHATWOOT_PLATFORM_API_TOKEN no configurado');
            return 1;
        }

        // 1. Crear agente
        $this->line('👤 Creando agente...');
        $response = Http::withHeaders([
            'api_access_token' => $token
        ])->post("{$baseUrl}/api/v1/accounts/{$accountId}/agents", [
            'name' => $user->full_name,
            'email' => $user->email,
            'role' => 'agent'
        ]);

        if ($response->successful()) {
            $agentData = $response->json();
            $user->chatwoot_agent_id = $agentData['id'];
            $user->chatwoot_agent_token = $agentData['access_token'] ?? null;
            // Role is already set in users.role field
            $this->info("✓ Agente creado: ID {$agentData['id']}");
        } else {
            $this->error("✗ Error al crear agente: " . $response->body());
            return 1;
        }

        // 2. Crear inbox
        $this->line('📥 Creando inbox...');
        $response = Http::withHeaders([
            'api_access_token' => $token
        ])->post("{$baseUrl}/api/v1/accounts/{$accountId}/inboxes", [
            'name' => $user->full_name . ' - Inbox',
            'channel' => [
                'type' => 'api',
                'webhook_url' => env('APP_URL') . '/api/chatwoot/webhook'
            ]
        ]);

        if ($response->successful()) {
            $inboxData = $response->json();
            $user->chatwoot_inbox_id = $inboxData['id'];
            $this->info("✓ Inbox creado: ID {$inboxData['id']}");
        } else {
            $this->error("✗ Error al crear inbox: " . $response->body());
            return 1;
        }

        // 3. Asignar agente al inbox
        $this->line('🔗 Asignando agente al inbox...');
        $response = Http::withHeaders([
            'api_access_token' => $token
        ])->post("{$baseUrl}/api/v1/accounts/{$accountId}/inbox_members", [
            'inbox_id' => $user->chatwoot_inbox_id,
            'user_ids' => [$user->chatwoot_agent_id]
        ]);

        if ($response->successful()) {
            $this->info("✓ Agente asignado al inbox");
        } else {
            $this->warn("⚠️  Warning al asignar agente: " . $response->body());
        }

        // 4. Guardar cambios
        $user->save();

        $this->info('');
        $this->info('🎉 ¡Configuración completada!');
        $this->line("   Usuario: {$user->email}");
        $this->line("   Agent ID: {$user->chatwoot_agent_id}");
        $this->line("   Inbox ID: {$user->chatwoot_inbox_id}");

        return 0;
    }
}
