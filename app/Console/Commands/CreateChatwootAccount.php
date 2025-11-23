<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Company;
use App\Models\User;
use App\Services\ChatwootProvisioningService;
use Illuminate\Support\Facades\Log;

class CreateChatwootAccount extends Command
{
    protected $signature = 'chatwoot:create-account {email}';
    protected $description = 'Crear cuenta Chatwoot para un usuario específico';

    private $provisioningService;

    public function __construct(ChatwootProvisioningService $provisioningService)
    {
        parent::__construct();
        $this->provisioningService = $provisioningService;
    }

    public function handle()
    {
        $email = $this->argument('email');
        
        $user = User::where('email', $email)->first();
        if (!$user) {
            $this->error("Usuario no encontrado: {$email}");
            return;
        }
        
        $company = Company::where('user_id', $user->id)->first();
        if (!$company) {
            $this->error("Empresa no encontrada para el usuario: {$email}");
            return;
        }

        try {
            $this->info("🚀 Creando cuenta Chatwoot para: {$user->name} ({$email})");
            
            $result = $this->provisioningService->provisionCompanyAccount($company, $user);
            
            $this->info("✅ Cuenta Chatwoot creada exitosamente!");
            $this->line("   - Account ID: {$result['account']['id']}");
            $this->line("   - Inbox ID: {$result['inbox']['id']}");
            $this->line("   - Admin: {$result['admin']['name']}");
            
        } catch (\Exception $e) {
            $this->error("❌ Error: {$e->getMessage()}");
            Log::error("Error creating Chatwoot account for {$email}: " . $e->getMessage());
        }
    }
}