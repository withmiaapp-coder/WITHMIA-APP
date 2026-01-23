<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=railway', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');

echo "=== EMPRESAS ===\n";
$stmt = $pdo->query('SELECT id, name, slug, settings FROM companies');
foreach ($stmt as $row) {
    echo "ID: {$row['id']} - {$row['name']} ({$row['slug']})\n";
    $settings = json_decode($row['settings'], true);
    echo "  RAG Workflow ID: " . ($settings['rag_workflow_id'] ?? 'N/A') . "\n";
    echo "  RAG Webhook Path: " . ($settings['rag_webhook_path'] ?? 'N/A') . "\n";
    echo "  RAG Webhook URL: " . ($settings['rag_webhook_url'] ?? 'N/A') . "\n";
    echo "  Training Workflow ID: " . ($settings['training_workflow_id'] ?? 'N/A') . "\n";
}

echo "\n=== USUARIOS ===\n";
$stmt = $pdo->query('SELECT id, name, email FROM users');
foreach ($stmt as $row) {
    echo "ID: {$row['id']} - {$row['name']} ({$row['email']})\n";
}

echo "\n=== DOCUMENTOS ===\n";
$stmt = $pdo->query('SELECT COUNT(*) as count FROM knowledge_documents');
$count = $stmt->fetch()['count'];
echo "Total documentos: $count\n";

echo "\n=== COLECCIONES QDRANT ===\n";
$client = new \GuzzleHttp\Client(['verify' => false]);
$response = $client->get('https://qdrant-production-f4e7.up.railway.app/collections');
$data = json_decode($response->getBody()->getContents(), true);
$collections = $data['result']['collections'] ?? [];
echo "Total colecciones: " . count($collections) . "\n";
foreach ($collections as $col) {
    echo "  - {$col['name']}\n";
}
