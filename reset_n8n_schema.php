<?php
/**
 * Script para eliminar completamente el esquema n8n y recrearlo
 * Esto permite que n8n ejecute sus migraciones desde cero
 */

// Conexión a la base de datos en Railway (usando la conexión pública)
$host = 'switchyard.proxy.rlwy.net';
$port = '28796';
$dbname = 'railway'; // Base de datos principal
$user = 'postgres';
$password = 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Conectado a PostgreSQL en Railway\n\n";
    
    // Verificar si existe el esquema n8n
    $stmt = $pdo->query("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'n8n'");
    $schemaExists = $stmt->fetch();
    
    if ($schemaExists) {
        echo "🗑️ Eliminando esquema 'n8n' completo...\n";
        $pdo->exec("DROP SCHEMA n8n CASCADE");
        echo "✅ Esquema 'n8n' eliminado\n\n";
    } else {
        echo "⚠️ El esquema 'n8n' no existía\n\n";
    }
    
    // Verificar si existe la base de datos n8n
    $stmt = $pdo->query("SELECT datname FROM pg_database WHERE datname = 'n8n'");
    $dbExists = $stmt->fetch();
    
    if ($dbExists) {
        echo "ℹ️ La base de datos 'n8n' existe. Conectando para limpiarla...\n";
        
        // Conectar a la base de datos n8n directamente
        $pdoN8n = new PDO("pgsql:host=$host;port=$port;dbname=n8n", $user, $password);
        $pdoN8n->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Verificar y eliminar el esquema n8n dentro de esa base de datos
        $stmt = $pdoN8n->query("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'n8n'");
        if ($stmt->fetch()) {
            echo "🗑️ Eliminando esquema 'n8n' de la base de datos 'n8n'...\n";
            $pdoN8n->exec("DROP SCHEMA n8n CASCADE");
            echo "✅ Esquema eliminado de la base de datos 'n8n'\n\n";
        }
        
        // Recrear el esquema vacío
        echo "📦 Recreando esquema 'n8n' vacío...\n";
        $pdoN8n->exec("CREATE SCHEMA n8n");
        echo "✅ Esquema 'n8n' creado\n\n";
        
    } else {
        echo "ℹ️ No existe una base de datos separada 'n8n'\n";
        
        // Recrear el esquema en railway
        echo "📦 Recreando esquema 'n8n' vacío en 'railway'...\n";
        $pdo->exec("CREATE SCHEMA IF NOT EXISTS n8n");
        echo "✅ Esquema 'n8n' creado\n\n";
    }
    
    echo "🎉 ¡Listo! Ahora puedes reiniciar n8n y las migraciones se ejecutarán desde cero.\n";
    echo "\n📌 Ejecuta: railway link (selecciona n8n) && railway redeploy -y\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
