<?php
/**
 * Script para arreglar TODAS las migraciones pendientes de n8n
 * Marca todas las migraciones conocidas como ejecutadas
 */

$host = 'switchyard.proxy.rlwy.net';
$port = '28796';
$dbname = 'n8n';
$user = 'postgres';
$password = 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw';

// Lista de migraciones que debemos marcar como ejecutadas
// basado en los errores de columnas que ya existen
$migrationsToFix = [
    ['timestamp' => 1738709609940, 'name' => 'CreateFolderTable1738709609940'],
    ['timestamp' => 1739549398681, 'name' => 'CreateAnalyticsTables1739549398681'],
    ['timestamp' => 1750252139166, 'name' => 'AddLastActiveAtColumnToUser1750252139166'],
];

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    echo "✅ Conexión exitosa a la base de datos n8n\n\n";
    
    // 1. Primero obtener el último timestamp de las migraciones existentes
    echo "📋 Analizando estado actual de migraciones...\n";
    $stmt = $pdo->query("SELECT MAX(timestamp) as max_ts FROM n8n.migrations");
    $maxTs = $stmt->fetch()['max_ts'];
    echo "  Último timestamp registrado: $maxTs\n\n";
    
    // 2. Obtener todas las migraciones existentes
    $stmt = $pdo->query("SELECT name FROM n8n.migrations");
    $existingMigrations = array_column($stmt->fetchAll(), 'name');
    
    echo "📝 Procesando migraciones pendientes...\n";
    echo str_repeat("-", 70) . "\n";
    
    foreach ($migrationsToFix as $migration) {
        if (in_array($migration['name'], $existingMigrations)) {
            echo "  ⏭️  {$migration['name']} - Ya registrada\n";
        } else {
            $stmt = $pdo->prepare("INSERT INTO n8n.migrations (timestamp, name) VALUES (?, ?)");
            $stmt->execute([$migration['timestamp'], $migration['name']]);
            echo "  ✅ {$migration['name']} - Registrada exitosamente\n";
        }
    }
    
    // 3. Verificar si hay más migraciones después de nuestro timestamp máximo conocido
    echo "\n📊 Verificando columnas existentes en la base de datos...\n";
    echo str_repeat("-", 70) . "\n";
    
    // Verificar user table
    $stmt = $pdo->query("
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'n8n' AND table_name = 'user'
    ");
    $userColumns = array_column($stmt->fetchAll(), 'column_name');
    echo "  Tabla 'user': " . count($userColumns) . " columnas\n";
    if (in_array('lastactiveat', array_map('strtolower', $userColumns))) {
        echo "    ✅ lastActiveAt existe\n";
    }
    
    // Verificar analytics_workflow_execution si existe
    $stmt = $pdo->query("
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'n8n' AND table_name LIKE '%analytics%'
    ");
    $analyticsTables = $stmt->fetchAll();
    if (count($analyticsTables) > 0) {
        echo "  Tablas de analytics encontradas:\n";
        foreach ($analyticsTables as $t) {
            echo "    ✅ {$t['table_name']}\n";
        }
    }
    
    // 4. Mostrar las últimas 15 migraciones
    echo "\n📋 Últimas 15 migraciones registradas:\n";
    echo str_repeat("-", 70) . "\n";
    
    $stmt = $pdo->query("SELECT id, timestamp, name FROM n8n.migrations ORDER BY timestamp DESC LIMIT 15");
    $migrations = $stmt->fetchAll();
    
    foreach ($migrations as $m) {
        echo "  {$m['timestamp']} | {$m['name']}\n";
    }
    
    echo "\n🎉 ¡Corrección completada!\n";
    echo "   Ejecuta: railway redeploy -y\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
