<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=railway', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');

// Ver columnas de la tabla
$stmt = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'companies' ORDER BY ordinal_position");
echo "=== COLUMNAS DE LA TABLA COMPANIES ===\n";
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "  - " . $row['column_name'] . "\n";
}

echo "\n=== DATOS DE LA EMPRESA ===\n";
$stmt = $pdo->query('SELECT * FROM companies LIMIT 1');
$company = $stmt->fetch(PDO::FETCH_ASSOC);

echo "=== CAMPOS DE LA EMPRESA ===\n\n";
foreach ($company as $key => $value) {
    $display = $value ?? '(null)';
    if (strlen($display) > 100) {
        $display = substr($display, 0, 100) . '...';
    }
    echo "  $key: $display\n";
}
