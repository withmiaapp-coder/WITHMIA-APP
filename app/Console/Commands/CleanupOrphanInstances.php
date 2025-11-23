<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Services\EvolutionInstanceManager;

class CleanupOrphanInstances extends Command
{
    protected $signature = 'evolution:cleanup-orphans {--force : No pedir confirmación}';
    protected $description = 'Elimina instancias de Evolution API que no tienen usuario asociado';

    public function handle()
    {
        $this->info('🔍 Buscando instancias huérfanas en Evolution API...');
        
        try {
            // Obtener todas las instancias de Evolution API
            $response = \Http::withHeaders([
                'apikey' => '429683C4C977415CAAFCCE10F7D57E11'
            ])->get('http://localhost:8080/instance/fetchInstances');

            if (!$response->successful()) {
                $this->error('❌ No se pudo conectar a Evolution API');
                return 1;
            }

            $allInstances = $response->json();
            $this->info("📱 Total instancias en Evolution API: " . count($allInstances));

            // Obtener todos los whatsapp_instance_id de usuarios existentes
            $userInstances = User::whereNotNull('whatsapp_instance_id')
                                ->pluck('whatsapp_instance_id')
                                ->toArray();
            
            $this->info("👥 Instancias asignadas a usuarios: " . count($userInstances));

            // Encontrar instancias huérfanas
            $orphanInstances = [];
            foreach ($allInstances as $instance) {
                if (!in_array($instance['name'], $userInstances)) {
                    $orphanInstances[] = $instance;
                }
            }

            $this->info("🗑️ Instancias huérfanas encontradas: " . count($orphanInstances));

            if (empty($orphanInstances)) {
                $this->info('✅ No hay instancias huérfanas para eliminar');
                return 0;
            }

            // Mostrar detalles de instancias huérfanas
            $this->table(
                ['Nombre', 'ID', 'Estado', 'Creada'],
                array_map(function($instance) {
                    return [
                        $instance['name'],
                        substr($instance['id'], 0, 8) . '...',
                        $instance['connectionStatus'],
                        $instance['createdAt']
                    ];
                }, $orphanInstances)
            );

            if (!$this->option('force')) {
                if (!$this->confirm('¿Eliminar estas ' . count($orphanInstances) . ' instancias huérfanas?')) {
                    $this->info('Operación cancelada');
                    return 0;
                }
            }

            // Eliminar instancias huérfanas
            $evolutionManager = new EvolutionInstanceManager();
            $deletedCount = 0;
            $failedCount = 0;

            foreach ($orphanInstances as $instance) {
                $this->info("🗑️ Eliminando: {$instance['name']}");
                
                $result = $evolutionManager->deleteInstance($instance['name']);
                
                if ($result['success']) {
                    $this->info("✅ Eliminada: {$instance['name']}");
                    $deletedCount++;
                } else {
                    $this->error("❌ Error eliminando {$instance['name']}: {$result['message']}");
                    $failedCount++;
                }
            }

            $this->info("\n=== RESUMEN ===");
            $this->info("✅ Instancias eliminadas: {$deletedCount}");
            $this->info("❌ Fallos: {$failedCount}");

        } catch (\Exception $e) {
            $this->error("💥 Error: " . $e->getMessage());
            return 1;
        }

        return 0;
    }
}
