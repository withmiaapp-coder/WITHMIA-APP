<?php
/**
 * Script para forzar la creación de workflow n8n para una instancia
 * ELIMINAR DESPUÉS DE USAR
 */

require_once __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Bootstrapear completamente
$request = Illuminate\Http\Request::capture();
$response = $kernel->handle($request);

header('Content-Type: application/json');

$instanceName = $_GET['instance'] ?? 'with-mia-3w9xza';

try {
    $n8nService = app(\App\Services\N8nService::class);
    
    // Buscar instancia
    $instance = \Illuminate\Support\Facades\DB::table('whatsapp_instances')
        ->where('instance_name', $instanceName)
        ->where('is_active', 1)
        ->first();
    
    if (!$instance) {
        echo json_encode(['error' => 'Instancia no encontrada: ' . $instanceName]);
        exit;
    }
    
    // Verificar si ya tiene workflow
    if (!empty($instance->n8n_workflow_id) && !empty($instance->n8n_webhook_url)) {
        echo json_encode([
            'message' => 'Ya tiene workflow configurado',
            'workflow_id' => $instance->n8n_workflow_id,
            'webhook_url' => $instance->n8n_webhook_url
        ]);
        exit;
    }
    
    // Crear workflow usando el controller
    $controller = app(\App\Http\Controllers\Api\EvolutionApiController::class);
    
    // Usar reflexión para llamar al método privado
    $method = new ReflectionMethod($controller, 'createN8nWorkflowForInstance');
    $method->setAccessible(true);
    $method->invoke($controller, $instance);
    
    // Verificar resultado
    $updatedInstance = \Illuminate\Support\Facades\DB::table('whatsapp_instances')
        ->where('id', $instance->id)
        ->first();
    
    echo json_encode([
        'success' => true,
        'message' => 'Workflow creado',
        'instance_name' => $updatedInstance->instance_name,
        'n8n_workflow_id' => $updatedInstance->n8n_workflow_id,
        'n8n_webhook_url' => $updatedInstance->n8n_webhook_url
    ], JSON_PRETTY_PRINT);
    
} catch (\Exception $e) {
    echo json_encode([
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
