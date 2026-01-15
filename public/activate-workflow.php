<?php
/**
 * Script temporal para activar workflow n8n existente
 * ELIMINAR DESPUÉS DE USAR
 */

require_once __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::capture();
$kernel->handle($request);

header('Content-Type: application/json');

$workflowId = $_GET['id'] ?? 'YiF5etxA1xwWvGeM';

try {
    $n8nService = app(\App\Services\N8nService::class);
    $result = $n8nService->activateWorkflow($workflowId);
    
    echo json_encode([
        'workflow_id' => $workflowId,
        'result' => $result
    ], JSON_PRETTY_PRINT);
    
} catch (\Exception $e) {
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
