<?php
/**
 * Script para corregir el warning de collation de PostgreSQL
 * y verificar estado de n8n en instancias
 * ELIMINAR DESPUÉS DE USAR
 */

require_once __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Bootstrapear la app completamente
$request = Illuminate\Http\Request::capture();
$kernel->handle($request);

header('Content-Type: application/json');

$results = [];

try {
    // Refresh collation version en la base de datos principal (railway)
    \Illuminate\Support\Facades\DB::statement('ALTER DATABASE railway REFRESH COLLATION VERSION');
    $results['railway'] = 'OK - Collation refreshed';
} catch (\Exception $e) {
    $results['railway'] = 'ERROR: ' . $e->getMessage();
}

try {
    // Verificar si tenemos acceso a la base de datos chatwoot
    $chatwootUrl = env('CHATWOOT_DATABASE_URL');
    if ($chatwootUrl) {
        // Intentar conectar y refrescar collation en chatwoot
        // Nota: Esto puede no funcionar si el usuario no tiene permisos
        $results['chatwoot'] = 'SKIP - Requires separate connection';
    } else {
        $results['chatwoot'] = 'SKIP - No CHATWOOT_DATABASE_URL';
    }
} catch (\Exception $e) {
    $results['chatwoot'] = 'ERROR: ' . $e->getMessage();
}

// También verificar estado de instancias n8n
try {
    $instances = \Illuminate\Support\Facades\DB::table('whatsapp_instances')
        ->select('id', 'instance_name', 'n8n_workflow_id', 'n8n_webhook_url', 'is_active')
        ->get();
    
    $results['instances'] = $instances->map(function($i) {
        return [
            'id' => $i->id,
            'instance_name' => $i->instance_name,
            'has_workflow_id' => !empty($i->n8n_workflow_id),
            'has_webhook_url' => !empty($i->n8n_webhook_url),
            'is_active' => $i->is_active
        ];
    });
} catch (\Exception $e) {
    $results['instances'] = 'ERROR: ' . $e->getMessage();
}

echo json_encode([
    'success' => true,
    'results' => $results,
    'timestamp' => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT);
