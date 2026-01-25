<?php
/**
 * Script para configurar Evolution API settings en la empresa
 * Ejecutar directamente en el servidor de Railway o usar como migración
 * 
 * Este script configura los settings de Evolution para que el workflow
 * de n8n pueda obtenerlos dinámicamente sin hardcodear nada.
 */

// Si se ejecuta como script PHP standalone
if (php_sapi_name() === 'cli' && !defined('LARAVEL_START')) {
    require __DIR__ . '/vendor/autoload.php';
    $app = require_once __DIR__ . '/bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();
}

use App\Models\Company;
use Illuminate\Support\Facades\DB;

// Configuración para WITHMIA (tu empresa de prueba)
$companySlug = 'withmia-nfudrg'; // o el slug que uses

$evolutionConfig = [
    // Evolution API - CADA EMPRESA TENDRÁ LOS SUYOS
    'evolution_api_url' => 'https://evolution-api-production-a7b5.up.railway.app',
    'evolution_api_key' => 'withmia_evo_2026_xK9mP2vL8nQr4tYw',
    
    // Chatwoot (opcional, si la empresa usa Chatwoot)
    'chatwoot_api_url' => 'https://chatwoot-production-50cc.up.railway.app',
    'chatwoot_api_token' => '60318c5bd2a42b3b41a368851afca25bd1d7267c952abe87360dfbee79f65ea8',
    'chatwoot_account_id' => 1,
    
    // AI prompt personalizado (opcional)
    'ai_prompt' => 'Responde de forma clara, concisa y amigable. Siempre usa la base de conocimientos para responder preguntas sobre la empresa.',
];

try {
    $company = Company::where('slug', $companySlug)->first();
    
    if (!$company) {
        // Intentar buscar por slug parcial
        $company = Company::where('slug', 'like', '%withmia%')->first();
    }
    
    if (!$company) {
        echo "❌ Empresa no encontrada: {$companySlug}\n";
        exit(1);
    }
    
    // Merge con settings existentes
    $currentSettings = $company->settings ?? [];
    $newSettings = array_merge($currentSettings, $evolutionConfig);
    
    // Actualizar
    $company->update(['settings' => $newSettings]);
    
    echo "✅ Empresa actualizada: {$company->slug}\n";
    echo "Settings actualizados:\n";
    echo json_encode($newSettings, JSON_PRETTY_PRINT) . "\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
