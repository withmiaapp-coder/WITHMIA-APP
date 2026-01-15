<?php
/**
 * Script temporal para verificar estado de n8n en instancias
 * ELIMINAR DESPUÉS DE USAR
 */

require_once __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Conectar a la BD
$dbUrl = env('DATABASE_URL');
if (!$dbUrl) {
    die(json_encode(['error' => 'No DATABASE_URL']));
}

try {
    $instances = \Illuminate\Support\Facades\DB::table('whatsapp_instances')
        ->select('id', 'instance_name', 'user_id', 'n8n_workflow_id', 'n8n_webhook_url', 'is_active', 'updated_at')
        ->get();
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'count' => count($instances),
        'instances' => $instances
    ], JSON_PRETTY_PRINT);
} catch (\Exception $e) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
