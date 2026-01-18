<?php
/**
 * Script para crear las bases de datos necesarias en PostgreSQL
 * Ejecutar: php create-databases.php
 */

$host = getenv('DB_HOST') ?: 'postgres-vector.railway.internal';
$port = getenv('DB_PORT') ?: '5432';
$user = getenv('DB_USERNAME') ?: 'postgres';
$password = getenv('DB_PASSWORD') ?: 'SDYYzXiHXBzfUZBFEsMqvaRyJZovcXlT';

// Conectar a la base de datos por defecto (postgres o chatwoot)
$defaultDb = 'chatwoot';

echo "Conectando a PostgreSQL en {$host}:{$port}...\n";

try {
    $pdo = new PDO(
        "pgsql:host={$host};port={$port};dbname={$defaultDb}",
        $user,
        $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "✓ Conexión exitosa!\n\n";
} catch (PDOException $e) {
    die("✗ Error de conexión: " . $e->getMessage() . "\n");
}

// Bases de datos a crear
$databases = ['n8n', 'mia_app'];

foreach ($databases as $dbName) {
    echo "Verificando base de datos '{$dbName}'...\n";
    
    // Verificar si existe
    $stmt = $pdo->prepare("SELECT 1 FROM pg_database WHERE datname = ?");
    $stmt->execute([$dbName]);
    
    if ($stmt->fetch()) {
        echo "  → Base de datos '{$dbName}' ya existe.\n";
    } else {
        echo "  → Creando base de datos '{$dbName}'...\n";
        try {
            // No se pueden usar prepared statements para CREATE DATABASE
            $pdo->exec("CREATE DATABASE \"{$dbName}\"");
            echo "  ✓ Base de datos '{$dbName}' creada exitosamente!\n";
        } catch (PDOException $e) {
            echo "  ✗ Error creando '{$dbName}': " . $e->getMessage() . "\n";
        }
    }
    echo "\n";
}

echo "¡Proceso completado!\n";
