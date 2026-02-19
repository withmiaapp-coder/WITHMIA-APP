<?php

namespace App\Console\Commands;

use App\Events\WhatsAppStatusChanged;
use App\Models\Company;
use App\Models\WhatsAppInstance;
use App\Services\EvolutionApiService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Monitor de salud de instancias WhatsApp.
 * 
 * Corre cada 5 minutos via scheduler. Detecta instancias atascadas en
 * "connecting" o desconectadas y las reconecta automáticamente.
 * 
 * Esto resuelve el caso donde Evolution API se reinicia y las sesiones
 * quedan en "connecting" sin recuperarse solas.
 * 
 * Uso manual: php artisan whatsapp:health-check
 */
class WhatsAppHealthCheck extends Command
{
    protected $signature = 'whatsapp:health-check 
                            {--force : Forzar reconexión aunque no haya pasado el cooldown}
                            {--dry-run : Solo reportar sin reconectar}';
    
    protected $description = 'Monitorea instancias de WhatsApp y reconecta las caídas automáticamente';

    public function handle(EvolutionApiService $evolutionApi): int
    {
        $this->info('🔍 WhatsApp Health Check iniciado...');
        
        // 1. Verificar que Evolution API esté vivo
        if (!$this->checkEvolutionApiHealth($evolutionApi)) {
            $this->error('❌ Evolution API no responde — no se puede hacer health check');
            Log::error('❌ [HealthCheck] Evolution API no responde');
            return 1;
        }
        
        // 2. Obtener todas las instancias activas de nuestra BD
        $instances = WhatsAppInstance::where('is_active', true)->get();
        
        if ($instances->isEmpty()) {
            $this->info('✅ No hay instancias activas para monitorear');
            return 0;
        }
        
        $this->info("📱 Monitoreando {$instances->count()} instancia(s) activa(s)...");
        
        $reconnected = 0;
        $failed = 0;
        $healthy = 0;
        $needsQr = 0;
        
        foreach ($instances as $instance) {
            $result = $this->checkInstance($instance, $evolutionApi);
            
            match ($result) {
                'healthy' => $healthy++,
                'reconnected' => $reconnected++,
                'needs_qr' => $needsQr++,
                'failed' => $failed++,
                default => null,
            };
        }
        
        // Resumen
        $this->newLine();
        $this->info("📊 Resumen: ✅ {$healthy} sanas | 🔄 {$reconnected} reconectadas | 📱 {$needsQr} necesitan QR | ❌ {$failed} fallaron");
        
        Log::info('📊 [HealthCheck] Completado', [
            'healthy' => $healthy,
            'reconnected' => $reconnected,
            'needs_qr' => $needsQr,
            'failed' => $failed,
        ]);
        
        return 0;
    }

    /**
     * Verificar que Evolution API esté respondiendo
     */
    private function checkEvolutionApiHealth(EvolutionApiService $evolutionApi): bool
    {
        try {
            $baseUrl = config('evolution.api_url');
            $apiKey = config('evolution.api_key');
            
            $response = Http::withHeaders(['apikey' => $apiKey])
                ->timeout(10)
                ->get("{$baseUrl}/instance/fetchInstances");
            
            return $response->successful();
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Verificar y reconectar una instancia específica
     */
    private function checkInstance(WhatsAppInstance $instance, EvolutionApiService $evolutionApi): string
    {
        $name = $instance->instance_name;
        
        try {
            // Obtener estado actual
            $status = $evolutionApi->getStatus($name);
            $state = $status['data']['instance']['state'] 
                ?? $status['data']['state'] 
                ?? $status['state'] 
                ?? 'unknown';
            
            // Si está conectada, todo bien
            if ($state === 'open' || $state === 'connected') {
                $this->line("  ✅ {$name}: conectada ({$state})");
                
                // Asegurar que tiene workflow de n8n
                if (empty($instance->n8n_workflow_id)) {
                    $this->warn("  ⚠️ {$name}: sin workflow n8n, se creará al recibir primer mensaje");
                }
                
                return 'healthy';
            }
            
            // Si no está conectada, intentar reconectar
            $this->warn("  ⚠️ {$name}: estado '{$state}' — intentando reconectar...");
            
            // Cooldown: no reintentar si ya lo intentamos hace menos de 10 min
            $cooldownKey = "health_reconnect_{$name}";
            if (!$this->option('force') && Cache::has($cooldownKey)) {
                $this->line("  ⏭️ {$name}: cooldown activo, saltando");
                return 'failed';
            }
            
            if ($this->option('dry-run')) {
                $this->line("  🏃 {$name}: [dry-run] se reconectaría");
                return 'failed';
            }
            
            // Poner cooldown
            Cache::put($cooldownKey, true, 600); // 10 minutos
            
            // Si la instancia existe pero no conecta, puede ser que necesite
            // un restart de sesión. Intentar connect directamente.
            $connectResult = $evolutionApi->connect($name);
            
            if ($connectResult['success'] ?? false) {
                // Verificar si devolvió QR (necesita re-escaneo)
                $hasQr = isset($connectResult['qrcode']) || isset($connectResult['base64']);
                
                if ($hasQr) {
                    $this->warn("  📱 {$name}: necesita re-escanear QR (sesión expirada)");
                    
                    // Notificar al frontend
                    $this->notifyFrontend($instance, 'requires_action', $connectResult['qrcode'] ?? null);
                    
                    Log::warning('📱 [HealthCheck] Instancia necesita QR', [
                        'instance' => $name,
                    ]);
                    
                    return 'needs_qr';
                }
                
                // Reconectada sin QR (sesión restaurada)
                $this->info("  🔄 {$name}: reconectada exitosamente");
                Cache::forget($cooldownKey);
                
                // Notificar al frontend
                $this->notifyFrontend($instance, 'open');
                
                Log::info('🔄 [HealthCheck] Instancia reconectada', [
                    'instance' => $name,
                ]);
                
                return 'reconnected';
            }
            
            // Si no existe en Evolution, crear desde cero
            if (str_contains($connectResult['error'] ?? '', 'not found') || 
                str_contains($connectResult['error'] ?? '', 'not exist')) {
                $this->warn("  🆕 {$name}: no existe en Evolution, necesita creación nueva");
                
                // Notificar al frontend que necesita reconectar desde el dashboard
                $this->notifyFrontend($instance, 'requires_action');
                
                return 'needs_qr';
            }
            
            $this->error("  ❌ {$name}: reconexión falló — " . ($connectResult['error'] ?? 'unknown'));
            
            Log::error('❌ [HealthCheck] Reconexión falló', [
                'instance' => $name,
                'error' => $connectResult['error'] ?? 'unknown',
            ]);
            
            return 'failed';
            
        } catch (\Throwable $e) {
            $this->error("  ❌ {$name}: error — {$e->getMessage()}");
            
            Log::error('❌ [HealthCheck] Error verificando instancia', [
                'instance' => $name,
                'error' => $e->getMessage(),
            ]);
            
            return 'failed';
        }
    }

    /**
     * Notificar al frontend del cambio de estado vía WebSocket
     */
    private function notifyFrontend(WhatsAppInstance $instance, string $state, ?string $qrcode = null): void
    {
        try {
            $company = Company::find($instance->company_id);
            $companySlug = $instance->company_slug ?? $company?->slug ?? $instance->instance_name;
            
            broadcast(new WhatsAppStatusChanged(
                $companySlug,
                $instance->instance_name,
                $state,
                $qrcode,
                null
            ));
        } catch (\Throwable $e) {
            // Non-blocking
            Log::debug('[HealthCheck] No se pudo notificar frontend', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
