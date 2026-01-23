<?php
try {
    $pdo = new PDO(
        'pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n',
        'postgres',
        'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw'
    );
    
    echo "=== Tablas en schema n8n ===\n";
    $stmt = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'n8n' ORDER BY table_name");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo $row['table_name'] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
