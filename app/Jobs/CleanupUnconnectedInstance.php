<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

/**
 * Job para limpiar instancias de Evolution API que no se conectaron
 * después de generar el código QR.
 * 
 * Se ejecuta automáticamente 5 minutos después de solicitar conexión QR.
 * Si la instancia no está conectada (estado != 'open'), se elimina.
 */
class CleanupUnconnectedInstance implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Nombre de la instancia a verificar
     */
    private string $instanceName;

    /**
     * Timestamp de cuando se solicitó la conexión
     */
    private int $connectionRequestedAt;

    /**
     * Número de reintentos antes de fallar
     */
    public int $tries = 3;

    /**
     * Tiempo en segundos antes de reintentar si falla
     */
    public int $backoff = 30;

    /**
     * Create a new job instance.
     *
     * @param string $instanceName Nombre de la instancia a verificar
     * @param int|null $connectionRequestedAt Timestamp de la solicitud
     */
    public function __construct(string $instanceName, ?int $connectionRequestedAt = null)
    {
        $this->instanceName = $instanceName;
        $this->connectionRequestedAt = $connectionRequestedAt ?? time();
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::debug('🧹 CleanupUnconnectedInstance: Verificando conexión de instancia', [
            'instance' => $this->instanceName,
            'requested_at' => date('Y-m-d H:i:s', $this->connectionRequestedAt),
            'checking_at' => now()->toDateTimeString()
        ]);

        try {
            // Verificar estado de conexión de la instancia
            $status = $this->getInstanceStatus();

            if ($status === null) {
                Log::warning('🧹 CleanupUnconnectedInstance: No se pudo obtener estado de la instancia', [
                    'instance' => $this->instanceName
                ]);
                return;
            }

            $state = $status['instance']['state'] ?? $status['state'] ?? 'close';
            $isConnected = $state === 'open';

            Log::debug('🧹 CleanupUnconnectedInstance: Estado de instancia', [
                'instance' => $this->instanceName,
                'state' => $state,
                'is_connected' => $isConnected
            ]);

            // Si está conectada, no hacer nada
            if ($isConnected) {
                Log::debug('✅ CleanupUnconnectedInstance: Instancia conectada correctamente, no se elimina', [
                    'instance' => $this->instanceName
                ]);
                return;
            }

            // Verificar si hay un Job de cleanup más reciente programado
            // (por si el usuario intentó conectar nuevamente)
            $latestAttemptKey = "whatsapp:connection_attempt:{$this->instanceName}";
            $latestAttempt = Cache::get($latestAttemptKey);

            if ($latestAttempt && $latestAttempt > $this->connectionRequestedAt) {
                Log::debug('⏭️ CleanupUnconnectedInstance: Hay un intento de conexión más reciente, omitiendo limpieza', [
                    'instance' => $this->instanceName,
                    'our_attempt' => $this->connectionRequestedAt,
                    'latest_attempt' => $latestAttempt
                ]);
                return;
            }

            // La instancia no se conectó después de 5 minutos, eliminarla
            Log::warning('🗑️ CleanupUnconnectedInstance: Instancia sin conectar después de 5 minutos, eliminando', [
                'instance' => $this->instanceName,
                'state' => $state
            ]);

            $deleted = $this->deleteInstance();

            if ($deleted) {
                Log::debug('✅ CleanupUnconnectedInstance: Instancia eliminada exitosamente', [
                    'instance' => $this->instanceName
                ]);

                // Limpiar registros de la base de datos
                $this->cleanupDatabaseRecords();

                // Limpiar cache
                $this->cleanupCache();
            } else {
                Log::error('❌ CleanupUnconnectedInstance: No se pudo eliminar la instancia', [
                    'instance' => $this->instanceName
                ]);
            }

        } catch (\Exception $e) {
            Log::error('💥 CleanupUnconnectedInstance: Error al procesar limpieza', [
                'instance' => $this->instanceName,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Re-lanzar para que el Job se reintente
            throw $e;
        }
    }

    /**
     * Obtener estado de la instancia desde Evolution API
     */
    private function getInstanceStatus(): ?array
    {
        try {
            $baseUrl = config('evolution.api_url', 'http://localhost:8080');
            $apiKey = config('evolution.api_key', 'withmia_evolution_api_key_2025_secure_token');

            $response = Http::withHeaders([
                'apikey' => $apiKey
            ])->timeout(10)
              ->connectTimeout(5)
              ->get("{$baseUrl}/instance/connectionState/{$this->instanceName}");

            if (!$response->successful()) {
                Log::warning('CleanupUnconnectedInstance: Error al obtener estado', [
                    'instance' => $this->instanceName,
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return null;
            }

            return $response->json();

        } catch (\Exception $e) {
            Log::error('CleanupUnconnectedInstance: Excepción al obtener estado', [
                'instance' => $this->instanceName,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Eliminar instancia de Evolution API
     */
    private function deleteInstance(): bool
    {
        try {
            $baseUrl = config('evolution.api_url', 'http://localhost:8080');
            $apiKey = config('evolution.api_key', 'withmia_evolution_api_key_2025_secure_token');

            $response = Http::withHeaders([
                'apikey' => $apiKey
            ])->timeout(15)
              ->delete("{$baseUrl}/instance/delete/{$this->instanceName}");

            return $response->successful();

        } catch (\Exception $e) {
            Log::error('CleanupUnconnectedInstance: Error al eliminar instancia', [
                'instance' => $this->instanceName,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Limpiar registros de la base de datos relacionados con la instancia
     */
    private function cleanupDatabaseRecords(): void
    {
        try {
            // Marcar como inactiva en la tabla whatsapp_instances
            DB::table('whatsapp_instances')
                ->where('instance_name', $this->instanceName)
                ->update([
                    'is_active' => 0,
                    'updated_at' => now()
                ]);

            Log::debug('CleanupUnconnectedInstance: Registro de BD actualizado', [
                'instance' => $this->instanceName
            ]);

        } catch (\Exception $e) {
            Log::warning('CleanupUnconnectedInstance: Error limpiando BD (no crítico)', [
                'instance' => $this->instanceName,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Limpiar cache relacionado con la instancia
     */
    private function cleanupCache(): void
    {
        try {
            $cacheKeys = [
                "whatsapp:status:{$this->instanceName}",
                "whatsapp:connection_attempt:{$this->instanceName}"
            ];

            foreach ($cacheKeys as $key) {
                Cache::forget($key);
            }

            Log::debug('CleanupUnconnectedInstance: Cache limpiado', [
                'instance' => $this->instanceName
            ]);

        } catch (\Exception $e) {
            Log::warning('CleanupUnconnectedInstance: Error limpiando cache (no crítico)', [
                'instance' => $this->instanceName,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Determinar si el job debería reintentarse
     */
    public function shouldRetry(\Exception $e): bool
    {
        // Solo reintentar si es un error de conexión temporal
        return $this->attempts() < $this->tries;
    }

    /**
     * Manejar un fallo del job
     */
    public function failed(\Throwable $e): void
    {
        Log::error('💥 CleanupUnconnectedInstance: Job falló definitivamente', [
            'instance' => $this->instanceName,
            'error' => $e->getMessage(),
            'attempts' => $this->attempts()
        ]);
    }
}
