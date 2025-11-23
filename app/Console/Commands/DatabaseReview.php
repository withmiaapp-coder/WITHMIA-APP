<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Company;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\DB;

class DatabaseReview extends Command
{
    protected $signature = 'db:review';
    protected $description = 'Revisar estructura y datos de la base de datos';

    public function handle()
    {
        $this->info('📊 REVISIÓN COMPLETA DE LA BASE DE DATOS WITHMIA');
        $this->line('═══════════════════════════════════════════════════════');
        $this->newLine();

        // 1. USUARIOS
        $this->info('👥 TABLA USUARIOS:');
        $users = User::with('roles')->get();
        $this->line("   Total usuarios: " . $users->count());
        
        foreach ($users as $user) {
            $role = $user->roles->first();
            $this->line("   - {$user->name} ({$user->email})");
            $this->line("     📧 Email verificado: " . ($user->email_verified_at ? 'Sí' : 'No'));
            $this->line("     🏢 Empresa: " . ($user->company_name ?? 'No especificada'));
            $this->line("     📱 Teléfono: " . ($user->phone ?? 'No especificado'));
            $this->line("     🎭 Rol Spatie: " . ($role ? $role->name : 'Sin rol'));
            $this->line("     🔖 Rol columna: " . ($user->role ?? 'Sin rol'));
            $this->line("     📈 Paso onboarding: " . ($user->onboarding_step ?? 'No iniciado'));
            $this->line("     ✅ Onboarding completo: " . ($user->onboarding_completed_at ? 'Sí' : 'No'));
            $this->line("     🌐 Sitio web empresa: " . ($user->company_website ?? 'No especificado'));
            $this->line("     💼 Caso de uso: " . ($user->use_case ?? 'No especificado'));
            $this->line("     📊 Volumen mensual: " . ($user->monthly_volume ?? 'No especificado'));
            $this->line("     🔍 Método descubrimiento: " . ($user->discovery_method ?? 'No especificado'));
            $this->line("     🛠️ Herramientas actuales: " . ($user->current_tools ?? 'No especificadas'));
            $this->newLine();
        }

        // 2. EMPRESAS
        $this->info('🏢 TABLA COMPANIES:');
        $companies = Company::all();
        $this->line("   Total empresas: " . $companies->count());
        
        foreach ($companies as $company) {
            $this->line("   - ID: {$company->id}");
            $this->line("     Nombre: " . ($company->name ?? 'Sin nombre'));
            $this->line("     Página/Industria: " . ($company->page ?? 'No especificada'));
            $this->line("     Configuraciones: " . (is_array($company->settings) ? json_encode($company->settings) : 'Ninguna'));
            $this->newLine();
        }

        // 3. ROLES Y USUARIOS
        $this->info('🎭 SISTEMA DE ROLES:');
        $roles = \App\Helpers\RoleHelper::getAllRoles();
        
        $this->line("   Total roles disponibles: " . count($roles));
        $this->newLine();

        foreach ($roles as $role) {
            $usersCount = \App\Models\User::where('role', $role)->count();
            $this->line("   🔑 {$role}: {$usersCount} usuarios");
        }
        $this->newLine();

        // 4. DISTRIBUCIÓN DE USUARIOS POR ROL
        $this->info('🔗 DISTRIBUCIÓN DE USUARIOS:');
        $totalUsers = \App\Models\User::count();
        $this->line("   Total usuarios: " . $totalUsers);
        
        $roleStats = \App\Models\User::selectRaw('role, COUNT(*) as count')
            ->groupBy('role')
            ->get();
            
        foreach ($roleStats as $stat) {
            $this->line("   - {$stat->role}: {$stat->count} usuarios");
        }
        $this->newLine();

        // 5. OTRAS TABLAS
        $this->info('📋 OTRAS TABLAS:');
        try {
            $tables = [
                'subscriptions' => 'Suscripciones',
                'ai_agents' => 'Agentes AI',
                'integrations' => 'Integraciones', 
                'custom_configs' => 'Configuraciones personalizadas',
                'usage_metrics' => 'Métricas de uso',
                'cache' => 'Cache',
                'jobs' => 'Trabajos en cola'
            ];

            foreach ($tables as $table => $description) {
                $count = DB::table($table)->count();
                $this->line("   📊 {$description}: {$count} registros");
            }
        } catch (\Exception $e) {
            $this->error("   Error al consultar tablas adicionales: " . $e->getMessage());
        }

        $this->newLine();
        $this->info('✅ Revisión de base de datos completada!');
        
        return 0;
    }
}