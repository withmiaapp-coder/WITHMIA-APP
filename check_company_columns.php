<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=railway', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$stmt = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'companies' ORDER BY ordinal_position");
echo "Columnas de 'companies':\n";
foreach($stmt as $row) {
    echo "  - " . $row['column_name'] . "\n";
}

echo "\n\nDatos de la company:\n";
$stmt = $pdo->query("SELECT * FROM companies LIMIT 1");
$company = $stmt->fetch(PDO::FETCH_ASSOC);
print_r($company);
