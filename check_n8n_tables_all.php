<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Tablas en schema n8n ===\n";
$stmt = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'n8n' ORDER BY table_name");
foreach ($stmt as $row) { 
    echo "- " . $row['table_name'] . "\n"; 
}

echo "\n=== Columnas de execution_data ===\n";
$stmt = $pdo->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'n8n' AND table_name = 'execution_data' ORDER BY ordinal_position");
foreach ($stmt as $row) { 
    echo $row['column_name'] . ' - ' . $row['data_type'] . "\n"; 
}
