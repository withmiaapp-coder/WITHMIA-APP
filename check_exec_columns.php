<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Estructura de execution_entity ===\n";
$stmt = $pdo->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'n8n' AND table_name = 'execution_entity' ORDER BY ordinal_position");
foreach ($stmt as $row) { 
    echo $row['column_name'] . ' - ' . $row['data_type'] . "\n"; 
}
