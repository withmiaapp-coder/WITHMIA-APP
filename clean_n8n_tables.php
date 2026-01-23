<?php
// Conexión a la base de datos n8n en Railway
$host = 'switchyard.proxy.rlwy.net';
$port = '28796';
$dbname = 'n8n';
$user = 'postgres';
$password = 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw';
$schema = 'n8n';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Conectado a la base de datos n8n\n\n";
    
    // Obtener todas las tablas del schema n8n
    $stmt = $pdo->query("SELECT tablename FROM pg_tables WHERE schemaname = '$schema'");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($tables)) {
        echo "⚠️ No se encontraron tablas en el schema '$schema'\n";
        
        // Listar schemas disponibles
        $stmt = $pdo->query("SELECT schema_name FROM information_schema.schemata");
        $schemas = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo "\nSchemas disponibles: " . implode(', ', $schemas) . "\n";
        
        // Listar todas las tablas
        $stmt = $pdo->query("SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')");
        $allTables = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "\nTablas encontradas:\n";
        foreach ($allTables as $t) {
            echo "  - {$t['schemaname']}.{$t['tablename']}\n";
        }
    } else {
        echo "🧹 Limpiando tablas del schema n8n...\n\n";
        
        // Desactivar restricciones de FK temporalmente
        $pdo->exec("SET session_replication_role = 'replica'");
        
        foreach ($tables as $table) {
            try {
                $pdo->exec("TRUNCATE TABLE \"$schema\".\"$table\" CASCADE");
                echo "✅ $table\n";
            } catch (Exception $e) {
                echo "❌ $table: " . $e->getMessage() . "\n";
            }
        }
        
        // Reactivar restricciones
        $pdo->exec("SET session_replication_role = 'origin'");
        
        echo "\n🎉 Tablas de n8n limpiadas!\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Error de conexión: " . $e->getMessage() . "\n";
}
