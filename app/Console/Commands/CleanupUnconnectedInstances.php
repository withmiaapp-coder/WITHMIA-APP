<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

/**
 * Comando para limpiar instancias de Evolution API que no están conectadas
 * 
 * Uso: php artisan evolution:cleanup-unconnected
 * Con fuerza: php artisan evolution:cleanup-unconnected --force
 */
class CleanupUnconnectedInstances extends Command
{
    protected $signature = 'evolution:cleanup-unconnected 
                            {--force : No pedir confirmación}
                            {--minutes=5 : Minutos mínimos de inactividad para eliminar}';
    
    protected $description = 'Elimina instancias de Evolution API que no están conectadas (estado != open)';

    private ?string $baseUrl;
    private ?string $apiKey;

    public function __construct()
    {
        parent::__construct();
        $this->baseUrl = config('evolution.api_url');
        $this->apiKey = config('evolution.api_key');
    }

    public function handle(): int
    {
        $this->info('🔍 Buscando instancias no conectadas en Evolution API...');
        
        try {
            // Obtener todas las instancias de Evolution API
            $response = Http::withHeaders([
                'apikey' => $this->apiKey
            ])->timeout(15)->get("{$this->baseUrl}/instance/fetchInstances");

            if (!$response->successful()) {
                $this->error('❌ No se pudo conectar a Evolution API');
                $this->error('   Status: ' . $response->status());
                $this->error('   Body: ' . $response->body());
                return 1;
            }

            $allInstances = $response->json();
            $this->info("📱 Total instancias en Evolution API: " . count($allInstances));

            if (empty($allInstances)) {
                $this->info('✅ No hay instancias en Evolution API');
                return 0;
            }

            // Filtrar instancias no conectadas
            $unconnectedInstances = [];
            foreach ($allInstances as $instance) {
                $state = $instance['connectionStatus'] ?? $instance['state'] ?? 'unknown';
                
                if ($state !== 'open') {
                    // Verificar tiempo desde creación si está disponible
                    $createdAt = $instance['createdAt'] ?? null;
                    $minutesOld = null;
                    
                    if ($createdAt) {
                        try {
                            $created = new \DateTime($createdAt);
                            $now = new \DateTime();
                            $diff = $now->diff($created);
                            $minutesOld = ($diff->days * 24 * 60) + ($diff->h * 60) + $diff->i;
                        } catch (\Exception $e) {
                            // Ignorar si no se puede parsear la fecha
                        }
                    }
                    
                    // Solo incluir si tiene más de X minutos (default: 5)
                    $minMinutes = (int) $this->option('minutes');
                    if ($minutesOld === null || $minutesOld >= $minMinutes) {
                        $instance['_minutes_old'] = $minutesOld;
                        $unconnectedInstances[] = $instance;
                    }
                }
            }

            $this->info("🔴 Instancias NO conectadas encontradas: " . count($unconnectedInstances));

            if (empty($unconnectedInstances)) {
                $this->info('✅ Todas las instancias están conectadas');
                return 0;
            }

            // Mostrar tabla con instancias no conectadas
            $this->table(
                ['Nombre', 'Estado', 'Antigüedad (min)', 'Creada'],
                array_map(function($instance) {
                    return [
                        $instance['name'] ?? 'N/A',
                        $instance['connectionStatus'] ?? $instance['state'] ?? 'unknown',
                        $instance['_minutes_old'] ?? 'N/A',
                        $instance['createdAt'] ?? 'N/A'
                    ];
                }, $unconnectedInstances)
            );

            // Confirmar eliminación
            if (!$this->option('force')) {
                if (!$this->confirm('¿Eliminar estas ' . count($unconnectedInstances) . ' instancias no conectadas?')) {
                    $this->info('Operación cancelada');
                    return 0;
                }
            }

            // Eliminar instancias
            $deletedCount = 0;
            $failedCount = 0;

            foreach ($unconnectedInstances as $instance) {
                $instanceName = $instance['name'] ?? null;
                
                if (!$instanceName) {
                    $this->warn("⚠️ Instancia sin nombre, omitiendo");
                    continue;
                }

                $this->info("🗑️ Eliminando: {$instanceName}");
                
                $deleteResult = $this->deleteInstance($instanceName);
                
                if ($deleteResult) {
                    $this->info("   ✅ Eliminada: {$instanceName}");
                    $deletedCount++;
                    
                    // Actualizar BD
                    $this->updateDatabaseRecord($instanceName);
                } else {
                    $this->error("   ❌ Error eliminando: {$instanceName}");
                    $failedCount++;
                }
            }

            // Resumen
            $this->newLine();
            $this->info("=== RESUMEN ===");
            $this->info("✅ Instancias eliminadas: {$deletedCount}");
            $this->info("❌ Fallos: {$failedCount}");

            return 0;

        } catch (\Exception $e) {
            $this->error("💥 Error: " . $e->getMessage());
            Log::error('CleanupUnconnectedInstances command error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 1;
        }
    }

    /**
     * Eliminar instancia de Evolution API
     */
    private function deleteInstance(string $instanceName): bool
    {
        try {
            $response = Http::withHeaders([
                'apikey' => $this->apiKey
            ])->timeout(15)->delete("{$this->baseUrl}/instance/delete/{$instanceName}");

            return $response->successful();

        } catch (\Exception $e) {
            Log::error("Error deleting instance {$instanceName}", ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Actualizar registro en la base de datos
     */
    private function updateDatabaseRecord(string $instanceName): void
    {
        try {
            DB::table('whatsapp_instances')
                ->where('instance_name', $instanceName)
                ->update([
                    'is_active' => 0,
                    'updated_at' => now()
                ]);
        } catch (\Exception $e) {
            // No es crítico si falla
            Log::warning("Could not update DB record for {$instanceName}", ['error' => $e->getMessage()]);
        }
    }
}
