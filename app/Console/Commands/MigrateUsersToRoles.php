<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class MigrateUsersToRoles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'users:migrate-to-roles {--force : Force migration in production}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate existing users to the new Spatie Permission role system';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🚀 Iniciando migración de usuarios al sistema de roles...');
        $this->newLine();

        $users = User::all();
        
        if ($users->isEmpty()) {
            $this->warn('No se encontraron usuarios para migrar.');
            return;
        }

        $this->info("📊 Usuarios encontrados: {$users->count()}");
        $this->newLine();

        $migratedCount = 0;
        $errorCount = 0;

        foreach ($users as $user) {
            try {
                $this->info("👤 Migrando usuario: {$user->name} ({$user->email})");
                
                // Get current role from column, default to 'agent'
                $currentRole = $user->role ?? 'agent';
                
                // Check if user already has roles assigned
                if ($user->roles->isNotEmpty()) {
                    $this->warn("   ⚠️  Usuario ya tiene roles asignados: " . $user->roles->pluck('name')->join(', '));
                    continue;
                }
                
                // Assign role using Spatie Permission
                $user->assignRole($currentRole);
                
                $this->info("   ✅ Asignado rol: {$currentRole}");
                $migratedCount++;
                
            } catch (\Exception $e) {
                $this->error("   ❌ Error migrando usuario {$user->name}: " . $e->getMessage());
                $errorCount++;
            }
            
            $this->newLine();
        }

        $this->info('📈 RESUMEN DE MIGRACIÓN:');
        $this->info("   ✅ Usuarios migrados: {$migratedCount}");
        if ($errorCount > 0) {
            $this->error("   ❌ Errores: {$errorCount}");
        }
        
        $this->newLine();
        $this->info('🎯 ¡Migración completada!');
        
        // Show final roles summary
        $this->info('📊 RESUMEN DE ROLES ASIGNADOS:');
        $roleStats = User::with('roles')->get()
            ->flatMap(function ($user) {
                return $user->roles->pluck('name');
            })
            ->countBy()
            ->toArray();
            
        foreach ($roleStats as $role => $count) {
            $this->info("   - {$role}: {$count} usuarios");
        }
    }
}
