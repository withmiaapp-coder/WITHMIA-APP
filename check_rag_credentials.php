<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');

echo "=== Credenciales disponibles ===\n";
$stmt = $pdo->query('SELECT id, name, type FROM n8n.credentials_entity');
$openaiCredId = null;
foreach ($stmt as $row) {
    echo "ID: {$row['id']} - {$row['name']} ({$row['type']})\n";
    if ($row['type'] === 'openAiApi') {
        $openaiCredId = $row['id'];
    }
}

echo "\n=== Workflow RAG ===\n";
$stmt = $pdo->query("SELECT id, name, active, nodes FROM n8n.workflow_entity WHERE name LIKE '%RAG%'");
$wf = $stmt->fetch(PDO::FETCH_ASSOC);
if ($wf) {
    echo "ID: {$wf['id']} - {$wf['name']} - Active: " . ($wf['active'] ? 'YES' : 'NO') . "\n";
    
    // Verificar si usa credenciales
    $nodes = json_decode($wf['nodes'], true);
    $usesHttpRequests = false;
    foreach ($nodes as $node) {
        if (isset($node['credentials'])) {
            echo "  Node '{$node['name']}' usa credenciales: " . json_encode($node['credentials']) . "\n";
        }
        if ($node['type'] === 'n8n-nodes-base.httpRequest' && strpos(json_encode($node), 'openai') !== false) {
            $usesHttpRequests = true;
            echo "  Node '{$node['name']}' llama a OpenAI via HTTP\n";
        }
    }
}
