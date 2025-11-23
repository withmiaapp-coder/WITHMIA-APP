<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // User Management
            'view users',
            'create users',
            'edit users',
            'delete users',
            
            // Company Management
            'view companies',
            'create companies',
            'edit companies',
            'delete companies',
            
            // Agent Management
            'view agents',
            'create agents',
            'edit agents',
            'delete agents',
            
            // System Administration
            'manage system settings',
            'view admin dashboard',
            'manage roles',
            'manage permissions',
            
            // Sales Management
            'view sales',
            'create sales',
            'edit sales',
            'delete sales',
            'manage leads',
            
            // Onboarding Process
            'view onboarding',
            'manage onboarding',
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }

        // Create roles and assign permissions
        
        // 1. ADMIN ROLE - Full access
        $adminRole = Role::create(['name' => 'admin']);
        $adminRole->givePermissionTo(Permission::all());
        
        // 2. AGENT ROLE - AI Agent with specific permissions
        $agentRole = Role::create(['name' => 'agent']);
        $agentRole->givePermissionTo([
            'view users',
            'view companies',
            'view agents',
            'view onboarding',
        ]);
        
        // 3. ASSISTANT ROLE - Support and assistance
        $assistantRole = Role::create(['name' => 'assistant']);
        $assistantRole->givePermissionTo([
            'view users',
            'view companies',
            'view agents',
            'view onboarding',
            'manage onboarding',
            'create users',
            'edit users',
        ]);
        
        // 4. SELLER ROLE - Sales focused
        $sellerRole = Role::create(['name' => 'seller']);
        $sellerRole->givePermissionTo([
            'view users',
            'view companies',
            'view sales',
            'create sales',
            'edit sales',
            'manage leads',
            'view onboarding',
            'manage onboarding',
        ]);

        echo "✅ Roles y permisos creados exitosamente:\n";
        echo "   - admin (Administrador completo)\n";
        echo "   - agent (Agente de IA)\n";
        echo "   - assistant (Asistente)\n";
        echo "   - seller (Vendedor)\n";
        echo "\n📊 Total de permisos creados: " . count($permissions) . "\n";
    }
}
