<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=railway', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$stmt = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
echo "Tablas en railway.public:\n";
foreach($stmt as $row) {
    echo "  - " . $row['table_name'] . "\n";
}
