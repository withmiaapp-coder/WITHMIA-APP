<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/**
 * 🧹 AUTO-LIMPIEZA: Verificar instancias WhatsApp no conectadas cada minuto
 * 
 * Si una instancia tiene más de 5 minutos desde que se generó el QR
 * y no está conectada (state != 'open'), se elimina automáticamente.
 */
Schedule::call(function () {
    $baseUrl = config('evolution.api_url', 'http://localhost:8080');
    $apiKey = config('evolution.api_key', 'withmia_evolution_api_key_2025_secure_token');
    
    try {
        // Obtener instancias pendientes de verificación del cache
        $pendingInstances = Cache::get('whatsapp:pending_cleanup', []);
        
        if (empty($pendingInstances)) {
            return;
        }
        
        $now = time();
        $cleanedUp = [];
        
        foreach ($pendingInstances as $instanceName => $requestedAt) {
            // Si han pasado más de 5 minutos desde la solicitud de QR
            $minutesPassed = ($now - $requestedAt) / 60;
            
            if ($minutesPassed < 5) {
                continue; // Aún no han pasado 5 minutos
            }
            
            // Verificar estado de conexión
            try {
                $response = Http::withHeaders([
                    'apikey' => $apiKey
                ])->timeout(10)->get("{$baseUrl}/instance/connectionState/{$instanceName}");
                
                if (!$response->successful()) {
                    // Si no se puede obtener estado, marcar para limpiar del cache
                    $cleanedUp[] = $instanceName;
                    continue;
                }
                
                $data = $response->json();
                $state = $data['instance']['state'] ?? $data['state'] ?? 'close';
                
                if ($state === 'open') {
                    // ✅ Conectada! Remover de pendientes
                    Log::info('✅ Scheduler: Instancia conectada, removiendo de pendientes', [
                        'instance' => $instanceName
                    ]);
                    $cleanedUp[] = $instanceName;
                    continue;
                }
                
                // ❌ No conectada después de 5+ minutos, eliminar
                Log::warning('🗑️ Scheduler: Eliminando instancia no conectada', [
                    'instance' => $instanceName,
                    'minutes_since_qr' => round($minutesPassed, 1),
                    'state' => $state
                ]);
                
                // Eliminar de Evolution API
                Http::withHeaders([
                    'apikey' => $apiKey
                ])->timeout(15)->delete("{$baseUrl}/instance/delete/{$instanceName}");
                
                // Actualizar BD
                DB::table('whatsapp_instances')
                    ->where('instance_name', $instanceName)
                    ->update(['is_active' => 0, 'updated_at' => now()]);
                
                $cleanedUp[] = $instanceName;
                
                Log::info('✅ Scheduler: Instancia eliminada', ['instance' => $instanceName]);
                
            } catch (\Exception $e) {
                Log::error('Scheduler cleanup error', [
                    'instance' => $instanceName,
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        // Actualizar cache removiendo las instancias procesadas
        if (!empty($cleanedUp)) {
            foreach ($cleanedUp as $instance) {
                unset($pendingInstances[$instance]);
            }
            
            if (empty($pendingInstances)) {
                Cache::forget('whatsapp:pending_cleanup');
            } else {
                Cache::put('whatsapp:pending_cleanup', $pendingInstances, now()->addHours(1));
            }
        }
        
    } catch (\Exception $e) {
        Log::error('Scheduler cleanup general error', ['error' => $e->getMessage()]);
    }
})->everyMinute()->name('whatsapp-cleanup-unconnected')->withoutOverlapping();
