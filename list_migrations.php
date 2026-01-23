<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');

echo "Migraciones actuales:\n";
$stmt = $pdo->query('SELECT timestamp, name FROM n8n.migrations ORDER BY timestamp');
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) { 
    echo $r['timestamp'] . " = " . $r['name'] . "\n"; 
}
