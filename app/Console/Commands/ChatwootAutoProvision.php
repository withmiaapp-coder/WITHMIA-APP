<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Company;
use App\Models\User;
use App\Services\ChatwootProvisioningService;
use Illuminate\Support\Facades\Log;

class ChatwootAutoProvision extends Command
{
    protected $signature = 'chatwoot:auto-provision 
                            {--dry-run : Solo mostrar qué se haría sin ejecutar}
                            {--force : Forzar la creación incluso si ya existe}
                            {--user= : Solo procesar un usuario específico por email}';
    
    protected $description = 'Provisiona automáticamente cuentas Chatwoot para empresas sin provisionar';

    private $provisioningService;

    public function __construct(ChatwootProvisioningService $provisioningService)
    {
        parent::__construct();
        $this->provisioningService = $provisioningService;
    }

    public function handle()
    {
        $this->info('🚀 Iniciando auto-provisión de Chatwoot...');
        
        $dryRun = $this->option('dry-run');
        $force = $this->option('force');
        $userEmail = $this->option('user');
        
        if ($dryRun) {
            $this->warn('⚠️  MODO DRY-RUN: Solo se mostrarán las acciones, no se ejecutarán');
        }

        // Obtener empresas sin provisionar
        $query = Company::with('user')
            ->where(function($q) use ($force) {
                if (!$force) {
                    $q->where('chatwoot_provisioned', false)
                      ->orWhereNull('chatwoot_provisioned');
                }
            });

        if ($userEmail) {
            $query->whereHas('user', function($q) use ($userEmail) {
                $q->where('email', $userEmail);
            });
        }

        $companies = $query->get();

        if ($companies->isEmpty()) {
            $this->info('✅ No se encontraron empresas para provisionar');
            return;
        }

        $this->info("📋 Encontradas {$companies->count()} empresas para procesar:");

        foreach ($companies as $company) {
            $user = $company->user;
            
            $this->line("📢 Procesando: {$company->name} (Usuario: {$user->email})");
            
            if ($dryRun) {
                $this->warn("   [DRY-RUN] Se crearía cuenta Chatwoot para {$user->email}");
                continue;
            }

            try {
                $result = $this->provisioningService->provisionCompanyAccount($company, $user);
                
                // Actualizar empresa
                $company->update([
                    'chatwoot_account_id' => $result['account']['id'],
                    'chatwoot_provisioned' => true,
                    'chatwoot_provisioned_at' => now(),
                    'chatwoot_data' => $result
                ]);
                
                $this->info("   ✅ Cuenta Chatwoot creada exitosamente");
                $this->line("      - Account ID: {$result['account']['id']}");
                $this->line("      - Inbox ID: {$result['inbox']['id']}");
                
            } catch (\Exception $e) {
                $this->error("   ❌ Error: {$e->getMessage()}");
                Log::error("Error auto-provisioning Chatwoot for company {$company->id}: " . $e->getMessage());
            }
        }

        $this->info('🎉 Auto-provisión completada');
    }
}