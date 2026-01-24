<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Obtener las últimas ejecuciones con detalles
$stmt = $pdo->query('
    SELECT 
        e.id, 
        e."workflowId", 
        e.status, 
        e."startedAt", 
        e."stoppedAt",
        ed."workflowData",
        ed.data,
        w.name as workflow_name
    FROM n8n.execution_entity e
    LEFT JOIN n8n.execution_data ed ON e.id = ed."executionId"
    LEFT JOIN n8n.workflow_entity w ON e."workflowId" = w.id
    ORDER BY e.id DESC 
    LIMIT 5
');
$executions = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($executions as $exec) {
    echo "=== Ejecución ID: " . $exec['id'] . " ===\n";
    echo "Workflow: " . ($exec['workflow_name'] ?? 'N/A') . " (ID: " . $exec['workflowId'] . ")\n";
    echo "Status: " . $exec['status'] . "\n";
    echo "Started: " . $exec['startedAt'] . "\n";
    echo "Stopped: " . $exec['stoppedAt'] . "\n\n";

    // Decodificar los datos de ejecución
    $data = json_decode($exec['data'], true);
    if ($data && isset($data['resultData']['runData'])) {
        echo "=== Nodos ejecutados ===\n";
        foreach ($data['resultData']['runData'] as $nodeName => $nodeData) {
            $nodeStatus = $nodeData[0]['executionStatus'] ?? 'unknown';
            echo "- $nodeName: $nodeStatus\n";
            
            // Si hay error, mostrarlo
            if (isset($nodeData[0]['error'])) {
                echo "  ERROR: " . $nodeData[0]['error']['message'] . "\n";
            }
        }
    }
    
    // Mostrar input del webhook si existe
    if ($data && isset($data['resultData']['runData']['Webhook'][0]['data']['main'][0][0]['json'])) {
        $webhookInput = $data['resultData']['runData']['Webhook'][0]['data']['main'][0][0]['json'];
        echo "\n=== Input del Webhook ===\n";
        echo json_encode($webhookInput, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    }
    
    echo "\n" . str_repeat('-', 60) . "\n\n";
}
