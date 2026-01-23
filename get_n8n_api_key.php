<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');

$stmt = $pdo->query('SELECT "apiKey" FROM n8n.user_api_keys LIMIT 1');
$row = $stmt->fetch(PDO::FETCH_ASSOC);

echo "API Key de n8n:\n";
echo $row['apiKey'] ?? 'NO ENCONTRADA';
echo "\n";
