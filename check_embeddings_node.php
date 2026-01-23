<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');

$stmt = $pdo->query("SELECT nodes FROM n8n.workflow_entity WHERE name LIKE '%RAG%'");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$nodes = json_decode($row['nodes'], true);

echo "=== Nodos del workflow RAG ===\n\n";

foreach ($nodes as $node) {
    if (strpos($node['name'], 'Embed') !== false || strpos($node['name'], 'OpenAI') !== false || $node['name'] === 'Generate Embeddings') {
        echo "Nodo: {$node['name']}\n";
        echo "Tipo: {$node['type']}\n";
        
        if (isset($node['credentials'])) {
            echo "Credentials: " . json_encode($node['credentials'], JSON_PRETTY_PRINT) . "\n";
        } else {
            echo "Credentials: NINGUNA\n";
        }
        
        if (isset($node['parameters']['nodeCredentialType'])) {
            echo "nodeCredentialType: {$node['parameters']['nodeCredentialType']}\n";
        }
        
        if (isset($node['parameters']['authentication'])) {
            echo "authentication: {$node['parameters']['authentication']}\n";
        }
        
        echo "\n";
    }
}
