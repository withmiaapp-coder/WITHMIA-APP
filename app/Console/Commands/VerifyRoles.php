<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class VerifyRoles extends Command
{
    protected $signature = 'roles:verify';
    protected $description = 'Verificar el estado del sistema de roles';

    public function handle()
    {
        $this->info('🔍 VERIFICANDO SISTEMA DE ROLES...');
        $this->newLine();

        // Obtener todos los usuarios con roles
        $users = User::with('roles')->get();

        $this->info("👥 USUARIOS ENCONTRADOS: " . $users->count());
        $this->newLine();

        $roleCounts = [];

        foreach ($users as $user) {
            $role = $user->roles->first();
            $roleName = $role ? $role->name : 'sin rol';
            
            $this->line("📋 {$user->name} ({$user->email}) - Rol: {$roleName}");
            
            if ($role) {
                $roleCounts[$roleName] = ($roleCounts[$roleName] ?? 0) + 1;
            }
        }

        $this->newLine();
        $this->info('📊 RESUMEN POR ROLES:');
        
        foreach ($roleCounts as $role => $count) {
            $this->line("   - {$role}: {$count} usuarios");
        }

        $this->newLine();
        $this->info('✅ Verificación completada!');

        return 0;
    }
}