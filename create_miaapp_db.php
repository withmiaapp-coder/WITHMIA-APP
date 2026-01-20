<?php
/**
 * Script para crear base de datos separada para Laravel
 */

$host = 'yamanote.proxy.rlwy.net';
$port = '30172';
$user = 'postgres';
$password = 'AOtZHroOvTYXBMmKtoaDmKQuSPEiwoWV';

try {
    // Conectar al servidor PostgreSQL (sin base de datos específica)
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=postgres", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Conectado a PostgreSQL\n\n";
    
    // Verificar si existe la base de datos 'miaapp'
    $exists = $pdo->query("SELECT 1 FROM pg_database WHERE datname = 'miaapp'")->fetchColumn();
    
    if (!$exists) {
        echo "📦 Creando base de datos 'miaapp'...\n";
        $pdo->exec("CREATE DATABASE miaapp");
        echo "✅ Base de datos 'miaapp' creada\n";
    } else {
        echo "✅ Base de datos 'miaapp' ya existe\n";
    }
    
    // Listar todas las bases de datos
    echo "\n📋 Bases de datos existentes:\n";
    $dbs = $pdo->query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname");
    foreach ($dbs as $db) {
        echo "   - " . $db['datname'] . "\n";
    }
    
    echo "\n✅ Ahora necesitas:\n";
    echo "   1. Cambiar DB_DATABASE=miaapp en Railway\n";
    echo "   2. Ejecutar migraciones\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
