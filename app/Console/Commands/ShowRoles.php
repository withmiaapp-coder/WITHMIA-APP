<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Helpers\RoleHelper;

class ShowRoles extends Command
{
    protected $signature = 'roles:show';
    protected $description = 'Mostrar todos los roles disponibles en el sistema y usuarios por rol';

    public function handle()
    {
        $this->info('🎭 ROLES DEL SISTEMA WITHMIA');
        $this->line('═══════════════════════════════════════════════');
        $this->newLine();

        $roles = RoleHelper::getAllRoles();

        foreach ($roles as $role) {
            $usersCount = User::where('role', $role)->count();
            
            $this->info("👤 ROL: " . strtoupper($role));
            $this->line("   📝 Descripción: " . $this->getRoleDescription($role));
            $this->line("   👥 Usuarios con este rol: {$usersCount}");
            $this->line("   🔐 Permisos: " . $this->getRolePermissions($role));
            
            if ($usersCount > 0) {
                $users = User::where('role', $role)->get(['id', 'full_name', 'email']);
                foreach ($users as $user) {
                    $this->line("      → {$user->full_name} ({$user->email})");
                }
            }
            
            $this->newLine();
        }

        $totalUsers = User::count();
        $this->info("📊 ESTADÍSTICAS:");
        $this->line("   - Total de roles: " . count($roles));
        $this->line("   - Total de usuarios: " . $totalUsers);
        
        $this->newLine();
        $this->info('✅ Listado completado!');

        return 0;
    }

    private function getRoleDescription($roleName)
    {
        $descriptions = [
            'admin' => 'Administrador del sistema con acceso completo',
            'agent' => 'Cliente principal que contrata WITHMIA, jefe del equipo',
            'seller' => 'Invitado por agent para trabajar en flujos de venta',
            'assistant' => 'Invitado por agent para gestionar cerebro y avisos internos'
        ];

        return $descriptions[$roleName] ?? 'Sin descripción';
    }

    private function getRolePermissions($role)
    {
        $permissions = [
            'admin' => 'Acceso completo al sistema',
            'agent' => 'Gestión de equipo, ventas, workflows, invitar sellers y assistants',
            'seller' => 'Gestión de ventas',
            'assistant' => 'Gestión de contenido interno'
        ];

        return $permissions[$role] ?? 'Sin permisos definidos';
    }
}
