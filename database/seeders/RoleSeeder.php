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
     * 
     * Solo 2 roles: admin (dueño/administrador) y agent (agentes invitados)
     */
    public function run(): void
    {
        // Clear cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Permisos simplificados para app de chat
        $permissions = [
            // Gestión de equipos
            'manage teams',
            'view teams',
            
            // Gestión de agentes/miembros
            'invite members',
            'remove members',
            'view members',
            
            // Configuración de empresa
            'manage company',
            'view company settings',
            
            // Conversaciones
            'view all conversations',
            'manage conversations',
            
            // Admin del sistema
            'access admin panel',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Solo 2 roles: admin y agent
        
        // 1. ADMIN ROLE - Dueño de la cuenta, acceso total
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $adminRole->syncPermissions([
            'manage teams', 'view teams',
            'invite members', 'remove members', 'view members',
            'manage company', 'view company settings',
            'view all conversations', 'manage conversations',
            'access admin panel',
        ]);
        
        // 2. AGENT ROLE - Agente invitado, acceso limitado
        $agentRole = Role::firstOrCreate(['name' => 'agent']);
        $agentRole->syncPermissions([
            'view teams',
            'view members',
            'view company settings',
            'manage conversations',
        ]);

        // Limpiar roles obsoletos si existen
        Role::whereIn('name', ['assistant', 'seller'])->delete();

        echo "✅ Roles y permisos creados exitosamente:\n";
        echo "   - admin (Administrador/Dueño)\n";
        echo "   - agent (Agente invitado)\n";
        echo "\n📊 Total de permisos: " . count($permissions) . "\n";
    }
}
