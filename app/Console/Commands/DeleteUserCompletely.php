<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Company;

class DeleteUserCompletely extends Command
{
    protected $signature = 'user:reset {email}';
    protected $description = 'Resetear usuario a estado inicial (elimina empresa, reinicia onboarding)';

    public function handle()
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();
        
        if (!$user) {
            $this->error("Usuario no encontrado: {$email}");
            return 1;
        }
        
        if (!$this->confirm("¿Resetear usuario {$user->name} ({$user->email})? Esto eliminará su empresa y reiniciará el onboarding.")) {
            $this->info('Operación cancelada.');
            return 0;
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
        
        $this->info("✅ Usuario reseteado a estado inicial. Puede completar onboarding nuevamente.");

        return 0;
    }
}