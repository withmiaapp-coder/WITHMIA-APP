<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Company;
use App\Services\ChatwootProvisioningService;
use Illuminate\Support\Facades\Log;

class ProvisionChatwootForUser extends Command
{
    protected $signature = 'chatwoot:provision-user {user_id}';
    protected $description = 'Provision Chatwoot account for a specific user';

    public function handle()
    {
        $userId = $this->argument('user_id');
        $user = User::find($userId);

        if (!$user) {
            $this->error("Usuario con ID {$userId} no encontrado");
            return 1;
        }

        $this->info("Provisionando Chatwoot para usuario: {$user->name} ({$user->email})");

        // Buscar la empresa por user_id o slug
        $company = Company::where('user_id', $user->id)->first();
        if (!$company && $user->company_slug) {
            // Buscar por slug como fallback
            $company = Company::where('slug', $user->company_slug)->first();
        }

        if (!$company) {
            $this->error("No se encontró empresa para el usuario");
            return 1;
        }

        $this->info("Empresa encontrada: {$company->name}");

        // Verificar si ya tiene Chatwoot provisionado
        if ($company->chatwoot_account_id) {
            $this->warn("La empresa ya tiene Chatwoot provisionado (Account ID: {$company->chatwoot_account_id})");
            return 0;
        }

        // Ejecutar provisioning
        try {
            $provisioningService = new ChatwootProvisioningService();
            $result = $provisioningService->provisionCompanyAccount($company, $user);

            if ($result['success']) {
                $this->info("✅ Chatwoot provisionado exitosamente!");
                $this->info("Account ID: " . ($result['account']['id'] ?? 'N/A'));
                $this->info("Inbox ID: " . ($result['inbox']['id'] ?? 'N/A'));

                // Actualizar empresa
                if (isset($result['account']['id'])) {
                    $company->update([
                        'chatwoot_account_id' => $result['account']['id'],
                        'chatwoot_provisioned' => true,
                        'chatwoot_provisioned_at' => now()
                    ]);
                    $this->info("✅ Empresa actualizada con datos de Chatwoot");
                }
            } else {
                $this->error("❌ Error en provisioning: " . ($result['error'] ?? 'Error desconocido'));
                return 1;
            }

        } catch (\Exception $e) {
            $this->error("❌ Excepción durante provisioning: " . $e->getMessage());
            Log::error("Chatwoot provisioning error", [
                'user_id' => $userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 1;
        }

        return 0;
    }
}