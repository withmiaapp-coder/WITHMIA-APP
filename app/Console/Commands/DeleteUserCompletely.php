<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Company;

class DeleteUserCompletely extends Command
{
    protected $signature = 'user:delete-completely {email}';
    protected $description = 'Eliminar completamente usuario y datos relacionados';

    public function handle()
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();
        
        if (!$user) {
            $this->error("Usuario no encontrado: {$email}");
            return;
        }
        
        $this->info("Usuario encontrado: {$user->name} ({$user->email})");
        $this->info("Company slug: " . ($user->company_slug ?? 'NULL'));
        
        // Buscar y eliminar company relacionada
        $company = Company::where('user_id', $user->id)->first();
        if ($company) {
            $this->info("Eliminando empresa: {$company->name}");
            $company->delete();
        }
        
        // Resetear campos del usuario para simular usuario nuevo
        $user->update([
            'company_slug' => null,
            'onboarding_step' => 1
        ]);
        
        $this->info("✅ Datos eliminados. Usuario reseteado a estado inicial.");
        $this->info("Ahora puede completar onboarding nuevamente con automatización Chatwoot.");
    }
}