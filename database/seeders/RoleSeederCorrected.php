<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleSeederCorrected extends Seeder
{
    public function run()
    {
        // Limpiar permisos existentes antes de recrear
        Permission::query()->delete();
        Role::query()->delete();

        // ============ PERMISOS DEL SISTEMA ============
        $permissions = [
            // Gestión de usuarios
            'view.users',
            'create.users', 
            'edit.users',
            'delete.users',
            
            // Gestión de empresas/compañías
            'view.companies',
            'create.companies',
            'edit.companies', 
            'delete.companies',
            
            // Gestión de agentes (solo admin puede gestionar agentes)
            'view.agents',
            'invite.agents',
            'manage.agents',
            'delete.agents',
            
            // Invitaciones y gestión de equipo
            'invite.sellers',
            'invite.assistants', 
            'manage.team',
            'remove.team.members',
            
            // Configuraciones del sistema
            'manage.system.settings',
            'view.admin.dashboard',
            'manage.roles',
            'manage.permissions',
            
            // Ventas y leads
            'view.sales',
            'create.sales',
            'edit.sales',
            'delete.sales',
            'manage.leads',
            'view.sales.reports',
            
            // Onboarding y cerebro/avisos internos
            'view.onboarding',
            'manage.onboarding',
            'edit.brain.content',
            'manage.internal.notices',
            'configure.workflows',
            
            // Configuración de flujos
            'create.workflows',
            'edit.workflows',
            'delete.workflows'
        ];

        // Crear todos los permisos
        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }

        // ============ JERARQUÍA DE ROLES ============

        // 1. ADMIN - Acceso total al sistema
        $adminRole = Role::create(['name' => 'admin']);
        $adminRole->givePermissionTo(Permission::all());

        // 2. AGENT - Cliente principal que contrata WITHMIA
        // Puede invitar sellers y assistants, gestionar su equipo y configurar todo
        $agentRole = Role::create(['name' => 'agent']);
        $agentRole->givePermissionTo([
            // Gestión completa de su empresa
            'view.companies',
            'edit.companies',
            'view.users',
            'create.users',
            'edit.users',
            
            // Puede invitar y gestionar su equipo
            'invite.sellers',
            'invite.assistants',
            'manage.team',
            'remove.team.members',
            
            // Gestión completa de ventas
            'view.sales',
            'create.sales', 
            'edit.sales',
            'delete.sales',
            'manage.leads',
            'view.sales.reports',
            
            // Configuración de workflows y onboarding
            'view.onboarding',
            'manage.onboarding',
            'create.workflows',
            'edit.workflows',
            'delete.workflows',
            'configure.workflows',
            
            // Gestión del "cerebro" y contenido interno
            'edit.brain.content',
            'manage.internal.notices'
        ]);

        // 3. SELLER - Invitado por el agent para trabajar en flujos de venta
        $sellerRole = Role::create(['name' => 'seller']);
        $sellerRole->givePermissionTo([
            'view.companies',
            'view.users',
            'view.sales',
            'create.sales',
            'edit.sales',
            'manage.leads', 
            'view.sales.reports',
            'view.onboarding',
            'edit.workflows' // Puede trabajar en los flujos pero no crearlos
        ]);

        // 4. ASSISTANT - Invitado por el agent para llenar el cerebro y avisos internos
        $assistantRole = Role::create(['name' => 'assistant']);
        $assistantRole->givePermissionTo([
            'view.companies',
            'view.users',
            'view.onboarding',
            'manage.onboarding',
            'edit.brain.content', // Su función principal
            'manage.internal.notices', // Su función principal
            'view.sales' // Solo lectura de ventas
        ]);

        echo "✅ Roles y permisos creados con jerarquía correcta:\n";
        echo "   👑 ADMIN: " . $adminRole->permissions->count() . " permisos\n";
        echo "   🎯 AGENT: " . $agentRole->permissions->count() . " permisos (jefe del equipo)\n";
        echo "   💰 SELLER: " . $sellerRole->permissions->count() . " permisos (invitado por agent)\n";
        echo "   🤝 ASSISTANT: " . $assistantRole->permissions->count() . " permisos (invitado por agent)\n";
    }
}