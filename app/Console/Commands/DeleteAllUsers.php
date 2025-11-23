<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;

class DeleteAllUsers extends Command
{
    protected $signature = 'users:delete-all {--force : No pedir confirmación}';
    protected $description = 'Elimina TODOS los usuarios y sus datos';

    public function handle()
    {
        $users = User::all();
        $totalUsers = $users->count();
        
        if ($totalUsers === 0) {
            $this->info('No hay usuarios para eliminar.');
            return;
        }
        
        $this->warn("⚠️  ADVERTENCIA: Se eliminarán {$totalUsers} usuarios PERMANENTEMENTE");
        $this->warn("Esto incluye:");
        $this->warn("- Datos del usuario");
        $this->warn("- Instancias de WhatsApp en Evolution API");
        $this->warn("- Archivos Excel exportados");
        
        if (!$this->option('force')) {
            if (!$this->confirm('¿Estás SEGURO de que quieres eliminar TODOS los usuarios?')) {
                $this->info('Operación cancelada.');
                return;
            }
        }
        
        $this->info("\n=== INICIANDO ELIMINACIÓN MASIVA ===");
        
        // Log inicial
        $logPath = '/tmp/observer_debug.log';
        file_put_contents($logPath, "\n=== INICIO ELIMINACIÓN MASIVA - " . date('Y-m-d H:i:s') . " ===\n", FILE_APPEND);
        file_put_contents($logPath, "Total usuarios a eliminar: {$totalUsers}\n", FILE_APPEND);
        
        $deletedCount = 0;
        $bar = $this->output->createProgressBar($totalUsers);
        $bar->start();
        
        foreach ($users as $user) {
            try {
                // Mostrar información del usuario
                $instanceId = $user->whatsapp_instance_id ?? 'sin instancia';
                file_put_contents($logPath, "Eliminando: {$user->name} (ID: {$user->id}, Instance: {$instanceId})\n", FILE_APPEND);
                
                // Eliminar usuario (esto activará el UserObserver)
                $user->delete();
                $deletedCount++;
                $bar->advance();
                
            } catch (\Exception $e) {
                $this->error("\n✗ Error eliminando usuario {$user->id}: " . $e->getMessage());
                file_put_contents($logPath, "ERROR eliminando usuario {$user->id}: " . $e->getMessage() . "\n", FILE_APPEND);
            }
        }
        
        $bar->finish();
        
        $this->info("\n\n=== RESUMEN DE ELIMINACIÓN ===");
        $this->info("✅ Usuarios eliminados: {$deletedCount}/{$totalUsers}");
        
        // Verificar que no queden usuarios
        $remainingUsers = User::count();
        $this->info("👥 Usuarios restantes: {$remainingUsers}");
        
        if ($remainingUsers === 0) {
            $this->info("🎉 ¡TODOS los usuarios han sido eliminados exitosamente!");
        } else {
            $this->warn("⚠️ Aún quedan {$remainingUsers} usuarios en la base de datos");
        }
        
        file_put_contents($logPath, "=== FIN ELIMINACIÓN MASIVA - " . date('Y-m-d H:i:s') . " ===\n", FILE_APPEND);
        file_put_contents($logPath, "Resultado: {$deletedCount}/{$totalUsers} eliminados, {$remainingUsers} restantes\n\n", FILE_APPEND);
        
        $this->info("\n📋 Para ver detalles completos, revisar: /tmp/observer_debug.log");
    }
}