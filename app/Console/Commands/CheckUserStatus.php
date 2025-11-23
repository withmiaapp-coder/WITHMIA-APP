<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Company;

class CheckUserStatus extends Command
{
    protected $signature = 'user:check-status {email}';
    protected $description = 'Verificar estado completo del usuario';

    public function handle()
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();
        
        if (!$user) {
            $this->error("Usuario no encontrado: {$email}");
            return;
        }
        
        $this->info("=== ESTADO DEL USUARIO ===");
        $this->line("ID: {$user->id}");
        $this->line("Nombre: {$user->name}");
        $this->line("Email: {$user->email}");
        $this->line("Company Slug: " . ($user->company_slug ?? 'NULL'));
        $this->line("Onboarding Step: " . ($user->onboarding_step ?? 'NULL'));
        
        // Verificar empresa relacionada
        $company = Company::where('user_id', $user->id)->first();
        $this->info("=== EMPRESA RELACIONADA ===");
        if ($company) {
            $this->line("Empresa ID: {$company->id}");
            $this->line("Nombre: {$company->name}");
            $this->line("Chatwoot Account ID: " . ($company->chatwoot_account_id ?? 'NULL'));
        } else {
            $this->line("No tiene empresa asociada");
        }
        
        // Contar registros totales
        $totalUsers = User::count();
        $totalCompanies = Company::count();
        $this->info("=== TOTALES ===");
        $this->line("Total usuarios: {$totalUsers}");
        $this->line("Total empresas: {$totalCompanies}");
    }
}