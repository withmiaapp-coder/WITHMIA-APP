<?php
// Script para crear la base de datos chatwoot en Railway PostgreSQL

$host = getenv('PGHOST') ?: 'postgres.railway.internal';
$port = getenv('PGPORT') ?: '5432';
$user = getenv('PGUSER') ?: 'postgres';
$password = getenv('PGPASSWORD');
$database = 'railway'; // Conectar a la DB por defecto primero

echo "Conectando a PostgreSQL...\n";
echo "Host: $host:$port\n";
echo "User: $user\n";

try {
    // Conectar a la base de datos por defecto
    $dsn = "pgsql:host=$host;port=$port;dbname=$database";
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    echo "✓ Conexión exitosa\n\n";
    
    // Verificar si la base de datos chatwoot ya existe
    $stmt = $pdo->query("SELECT 1 FROM pg_database WHERE datname = 'chatwoot'");
    $exists = $stmt->fetchColumn();
    
    if ($exists) {
        echo "⚠ La base de datos 'chatwoot' ya existe\n";
    } else {
        echo "Creando base de datos 'chatwoot'...\n";
        $pdo->exec("CREATE DATABASE chatwoot");
        echo "✓ Base de datos 'chatwoot' creada exitosamente\n";
    }
    
    // Listar todas las bases de datos
    echo "\nBases de datos disponibles:\n";
    $stmt = $pdo->query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  - " . $row['datname'] . "\n";
    }
    
} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✓ Script completado\n";
