<?php
/**
 * Script para crear las bases de datos en el nuevo PostgreSQL con pgvector
 */

// Conexión pública del PostgreSQL-Vector
$host = 'caboose.proxy.rlwy.net';
$port = '29558';
$user = 'postgres';
$password = 'BOouQNZeuFKQDoFcOulcYdDdfjhdbNmu';

echo "=== Configurando PostgreSQL Oficial en Railway ===\n\n";

// Primero conectar a la base railway para crear DBs
try {
    $dsn = "pgsql:host=$host;port=$port;dbname=railway";
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    echo "✅ Conexión exitosa a PostgreSQL\n\n";
    
    // Listar bases de datos existentes
    echo "📂 Bases de datos existentes:\n";
    $stmt = $pdo->query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname");
    $databases = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    foreach ($databases as $db) {
        echo "   - $db\n";
    }
    echo "\n";
    
    // Crear base de datos mia_app si no existe
    if (!in_array('mia_app', $databases)) {
        echo "🔧 Creando base de datos 'mia_app'...\n";
        $pdo->exec("CREATE DATABASE mia_app");
        echo "✅ Base de datos 'mia_app' creada\n";
    } else {
        echo "✅ Base de datos 'mia_app' ya existe\n";
    }
    
    // Crear base de datos chatwoot si no existe
    if (!in_array('chatwoot', $databases)) {
        echo "🔧 Creando base de datos 'chatwoot'...\n";
        $pdo->exec("CREATE DATABASE chatwoot");
        echo "✅ Base de datos 'chatwoot' creada\n";
    } else {
        echo "✅ Base de datos 'chatwoot' ya existe\n";
    }
    
    // Verificar resultado final
    echo "\n📂 Bases de datos finales:\n";
    $stmt = $pdo->query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname");
    $databases = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    foreach ($databases as $db) {
        $icon = in_array($db, ['mia_app', 'chatwoot']) ? '🔵' : '  ';
        echo "   $icon $db\n";
    }
    
    echo "\n✅ ¡PostgreSQL listo para WITHMIA y Chatwoot!\n";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
