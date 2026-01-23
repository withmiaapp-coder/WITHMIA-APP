<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$stmt = $pdo->query("SELECT tablename FROM pg_tables WHERE schemaname = 'n8n'");
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Tablas en n8n: " . count($tables) . "\n\n";
foreach ($tables as $t) {
    $count = $pdo->query("SELECT COUNT(*) FROM n8n.\"$t\"")->fetchColumn();
    echo "  $t: $count registros\n";
}
