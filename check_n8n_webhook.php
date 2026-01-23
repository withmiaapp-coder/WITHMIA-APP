<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');

echo "=== Workflows activos ===\n";
$stmt = $pdo->query('SELECT id, name, active FROM n8n.workflow_entity');
foreach ($stmt as $row) {
    $status = $row['active'] ? '✅ ACTIVO' : '❌ INACTIVO';
    echo $row['name'] . ' - ' . $status . "\n";
}

echo "\n=== Webhook URLs del RAG ===\n";
$stmt = $pdo->query("SELECT id, name, nodes FROM n8n.workflow_entity WHERE name LIKE '%RAG%'");
$workflow = $stmt->fetch(PDO::FETCH_ASSOC);
if ($workflow) {
    $nodes = json_decode($workflow['nodes'], true);
    foreach ($nodes as $node) {
        if ($node['type'] === 'n8n-nodes-base.webhook') {
            echo "Webhook path: " . ($node['parameters']['path'] ?? 'N/A') . "\n";
            echo "Webhook ID: " . ($node['webhookId'] ?? 'N/A') . "\n";
        }
    }
    echo "\nURL completa del webhook:\n";
    echo "https://n8n-production-00dd.up.railway.app/webhook/" . ($node['parameters']['path'] ?? 'unknown') . "\n";
}

echo "\n=== Últimas ejecuciones ===\n";
$stmt = $pdo->query("SELECT id, \"workflowId\", finished, \"stoppedAt\", status FROM n8n.execution_entity ORDER BY \"stoppedAt\" DESC LIMIT 5");
$execs = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (empty($execs)) {
    echo "❌ No hay ejecuciones recientes\n";
} else {
    foreach ($execs as $exec) {
        echo "ID: {$exec['id']} - Status: {$exec['status']} - Finished: " . ($exec['finished'] ? 'Sí' : 'No') . "\n";
    }
}
