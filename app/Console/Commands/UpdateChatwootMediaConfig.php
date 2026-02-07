<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Services\EvolutionApiService;

class UpdateChatwootMediaConfig extends Command
{
    protected $signature = 'chatwoot:update-media-config {instance?}';
    protected $description = 'Actualiza la configuración de Chatwoot para habilitar envío de archivos multimedia (audios)';

    private EvolutionApiService $evolutionApi;

    public function __construct(EvolutionApiService $evolutionApi)
    {
        parent::__construct();
        $this->evolutionApi = $evolutionApi;
    }

    public function handle(): int
    {
        $instanceName = $this->argument('instance');

        // Si se especifica una instancia, solo actualizar esa
        if ($instanceName) {
            $instances = DB::table('whatsapp_instances')
                ->where('instance_name', $instanceName)
                ->where('is_active', 1)
                ->get();
            
            if ($instances->isEmpty()) {
                $this->error("❌ Instancia '{$instanceName}' no encontrada o inactiva.");
                return 1;
            }
        } else {
            // Actualizar todas las instancias activas
            $instances = DB::table('whatsapp_instances')
                ->where('is_active', 1)
                ->get();
        }

        if ($instances->isEmpty()) {
            $this->info('No hay instancias activas para actualizar.');
            return 0;
        }

        $this->info("🔧 Actualizando {$instances->count()} instancia(s)...\n");

        foreach ($instances as $instance) {
            $this->info("Procesando: {$instance->instance_name}");

            // Obtener configuración de Chatwoot de la empresa
            $company = DB::table('companies')
                ->where('id', $instance->company_id)
                ->first();

            if (!$company || !$company->chatwoot_account_id) {
                $this->warn("  ⚠️  Empresa sin chatwoot_account_id configurado - saltando");
                continue;
            }

            $chatwootToken = config('chatwoot.platform_token');
            $chatwootUrl = config('chatwoot.url');

            if (!$chatwootToken || !$chatwootUrl) {
                $this->warn("  ⚠️  Configuración de Chatwoot incompleta - saltando");
                continue;
            }

            // Actualizar configuración de Chatwoot en Evolution API
            $result = $this->evolutionApi->setChatwootIntegration(
                instanceName: $instance->instance_name,
                accountId: (string) $company->chatwoot_account_id,
                token: $chatwootToken,
                url: $chatwootUrl,
                signMsg: false,
                reopenConversation: true,
                conversationPending: false
            );

            if ($result['success']) {
                $this->info("  ✅ Configuración actualizada correctamente");
                if (isset($result['data'])) {
                    $this->line("     Datos: " . json_encode($result['data'], JSON_PRETTY_PRINT));
                }
            } else {
                $this->error("  ❌ Error: " . ($result['error'] ?? 'Unknown error'));
                $this->error("     Instancia: {$instance->instance_name}");
                $this->error("     Account ID: {$company->chatwoot_account_id}");
                $this->error("     Evolution URL: " . config('evolution.api_url'));
            }
        }

        $this->newLine();
        $this->info("✨ Proceso completado. Los audios ahora se deberían transmitir correctamente a Chatwoot.");
        $this->info("💡 Reinicia la aplicación si es necesario: php artisan optimize:clear");

        return 0;
    }
}
