<?php
/**
 * Script para arreglar la migración CreateFolderTable1738709609940 de n8n
 * El problema: la columna parentFolderId ya existe, pero la migración no está marcada como ejecutada
 */

$host = 'switchyard.proxy.rlwy.net';
$port = '28796';
$dbname = 'n8n';
$user = 'postgres';
$password = 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw';

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    echo "✅ Conexión exitosa a la base de datos n8n\n\n";
    
    // Verificar el schema n8n
    $pdo->exec("SET search_path TO n8n");
    
    // 1. Ver las migraciones actuales
    echo "📋 Migraciones actuales en la base de datos:\n";
    echo str_repeat("-", 60) . "\n";
    
    $stmt = $pdo->query("SELECT * FROM n8n.migrations ORDER BY id DESC LIMIT 20");
    $migrations = $stmt->fetchAll();
    
    foreach ($migrations as $m) {
        echo "  ID: {$m['id']} | Nombre: {$m['name']} | Timestamp: {$m['timestamp']}\n";
    }
    
    echo "\n";
    
    // 2. Verificar si la migración problemática ya está registrada
    $migrationName = 'CreateFolderTable1738709609940';
    $stmt = $pdo->prepare("SELECT * FROM n8n.migrations WHERE name = ?");
    $stmt->execute([$migrationName]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        echo "⚠️ La migración '$migrationName' ya está registrada (ID: {$existing['id']})\n";
    } else {
        echo "❌ La migración '$migrationName' NO está registrada\n";
        echo "📝 Insertando la migración como ejecutada...\n";
        
        // Insertar la migración como completada
        $stmt = $pdo->prepare("INSERT INTO n8n.migrations (timestamp, name) VALUES (?, ?)");
        $stmt->execute([1738709609940, $migrationName]);
        
        echo "✅ Migración registrada exitosamente\n";
    }
    
    // 3. Verificar que la columna parentFolderId existe en workflow_entity
    echo "\n📊 Verificando columnas en workflow_entity:\n";
    $stmt = $pdo->query("
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'n8n' AND table_name = 'workflow_entity'
        ORDER BY ordinal_position
    ");
    $columns = $stmt->fetchAll();
    
    $hasParentFolderId = false;
    foreach ($columns as $col) {
        if ($col['column_name'] === 'parentfolderid' || $col['column_name'] === 'parentFolderId') {
            $hasParentFolderId = true;
            echo "  ✅ {$col['column_name']} ({$col['data_type']})\n";
        }
    }
    
    if (!$hasParentFolderId) {
        echo "  ⚠️ La columna parentFolderId NO existe\n";
    }
    
    // 4. Verificar si existe la tabla folder
    echo "\n📁 Verificando tabla 'folder':\n";
    $stmt = $pdo->query("
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'n8n' AND table_name = 'folder'
    ");
    $folderTable = $stmt->fetch();
    
    if ($folderTable) {
        echo "  ✅ La tabla 'folder' existe\n";
    } else {
        echo "  ⚠️ La tabla 'folder' NO existe\n";
    }
    
    // 5. Mostrar las migraciones actualizadas
    echo "\n📋 Migraciones después de la corrección:\n";
    echo str_repeat("-", 60) . "\n";
    
    $stmt = $pdo->query("SELECT * FROM n8n.migrations ORDER BY id DESC LIMIT 10");
    $migrations = $stmt->fetchAll();
    
    foreach ($migrations as $m) {
        echo "  ID: {$m['id']} | Nombre: {$m['name']}\n";
    }
    
    echo "\n🎉 ¡Corrección completada! Ahora reinicia el servicio n8n en Railway.\n";
    echo "   Comando: railway service (selecciona n8n) && railway restart\n";
    
} catch (PDOException $e) {
    echo "❌ Error de conexión: " . $e->getMessage() . "\n";
    exit(1);
}
