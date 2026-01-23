<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');

echo "=== Detalles de la última ejecución con error ===\n\n";

$stmt = $pdo->query("SELECT id, \"workflowId\", finished, \"stoppedAt\", status, \"workflowData\" FROM n8n.execution_entity WHERE status = 'error' ORDER BY \"stoppedAt\" DESC LIMIT 1");
$exec = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$exec) {
    echo "No hay ejecuciones con error\n";
    exit;
}

echo "ID: {$exec['id']}\n";
echo "Status: {$exec['status']}\n";
echo "Finished: " . ($exec['finished'] ? 'Sí' : 'No') . "\n";
echo "Stopped At: {$exec['stoppedAt']}\n\n";

$data = json_decode($exec['workflowData'], true);

if (isset($data['resultData']['error'])) {
    echo "=== ERROR ===\n";
    $error = $data['resultData']['error'];
    echo "Mensaje: " . ($error['message'] ?? 'N/A') . "\n";
    echo "Nodo: " . ($error['node']['name'] ?? 'N/A') . "\n";
    echo "Tipo: " . ($error['node']['type'] ?? 'N/A') . "\n";
}

// Buscar errores en los nodos
if (isset($data['resultData']['runData'])) {
    echo "\n=== Datos de ejecución por nodo ===\n";
    foreach ($data['resultData']['runData'] as $nodeName => $nodeData) {
        echo "\nNodo: $nodeName\n";
        if (isset($nodeData[0]['error'])) {
            echo "  ❌ ERROR: " . ($nodeData[0]['error']['message'] ?? json_encode($nodeData[0]['error'])) . "\n";
        } else {
            echo "  ✅ OK\n";
        }
    }
}
