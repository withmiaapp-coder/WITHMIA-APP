<?php
// Verificar extensiones disponibles en PostgreSQL-Vector
$pdo = new PDO(
    'pgsql:host=caboose.proxy.rlwy.net;port=29558;dbname=chatwoot',
    'postgres',
    'BOouQNZeuFKQDoFcOulcYdDdfjhdbNmu'
);

echo "PostgreSQL version:\n";
echo $pdo->query('SELECT version()')->fetchColumn() . "\n\n";

echo "Extensiones disponibles con 'vector':\n";
$stmt = $pdo->query("SELECT name FROM pg_available_extensions WHERE name LIKE '%vector%'");
$extensions = $stmt->fetchAll(PDO::FETCH_COLUMN);
if (empty($extensions)) {
    echo "❌ NO hay extensiones de vector disponibles\n";
} else {
    print_r($extensions);
}

echo "\nIntentando crear extensión vector...\n";
try {
    $pdo->exec("CREATE EXTENSION IF NOT EXISTS vector");
    echo "✅ Extensión vector creada!\n";
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
