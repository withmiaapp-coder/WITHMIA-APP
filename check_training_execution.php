<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Obtener la última ejecución del Training Chat
$stmt = $pdo->query('
    SELECT 
        e.id, 
        e."workflowId", 
        e.status, 
        e."startedAt", 
        e."stoppedAt",
        ed.data,
        w.name as workflow_name
    FROM n8n.execution_entity e
    LEFT JOIN n8n.execution_data ed ON e.id = ed."executionId"
    LEFT JOIN n8n.workflow_entity w ON e."workflowId" = w.id
    WHERE w.name LIKE \'%Training%\'
    ORDER BY e.id DESC 
    LIMIT 1
');
$exec = $stmt->fetch(PDO::FETCH_ASSOC);

echo "=== Última ejecución de Training Chat ===\n";
echo "ID: " . $exec['id'] . "\n";
echo "Status: " . $exec['status'] . "\n";
echo "Started: " . $exec['startedAt'] . "\n";
echo "Stopped: " . $exec['stoppedAt'] . "\n\n";

echo "=== Tamaño del campo data ===\n";
echo "Longitud: " . strlen($exec['data'] ?? '') . " bytes\n\n";

if (!empty($exec['data'])) {
    $data = json_decode($exec['data'], true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "Error decodificando JSON: " . json_last_error_msg() . "\n";
    } else {
        echo "=== Estructura de datos ===\n";
        if (isset($data['resultData'])) {
            echo "- resultData presente\n";
            if (isset($data['resultData']['runData'])) {
                echo "- runData presente con nodos:\n";
                foreach ($data['resultData']['runData'] as $nodeName => $nodeData) {
                    $status = $nodeData[0]['executionStatus'] ?? 'N/A';
                    echo "  * $nodeName: $status\n";
                    
                    // Mostrar output si existe
                    if (isset($nodeData[0]['data']['main'][0])) {
                        $items = count($nodeData[0]['data']['main'][0]);
                        echo "    Output items: $items\n";
                        
                        // Mostrar primer item
                        if ($items > 0) {
                            $firstItem = $nodeData[0]['data']['main'][0][0]['json'] ?? null;
                            if ($firstItem) {
                                $output = json_encode($firstItem, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                                if (strlen($output) > 1000) {
                                    $output = substr($output, 0, 1000) . "\n    [... truncado ...]";
                                }
                                echo "    First item:\n$output\n";
                            }
                        }
                    }
                }
            }
            if (isset($data['resultData']['error'])) {
                echo "- ERROR: " . json_encode($data['resultData']['error']) . "\n";
            }
        }
    }
} else {
    echo "El campo data está vacío\n";
}
