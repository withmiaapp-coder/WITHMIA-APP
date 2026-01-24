<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "📋 Buscando tablas de API Keys en n8n...\n\n";

// Listar todas las tablas
$tables = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'n8n' ORDER BY table_name");
echo "Tablas en schema n8n:\n";
foreach ($tables as $row) {
    echo "  - " . $row['table_name'] . "\n";
}

echo "\n🔍 Buscando API Keys...\n";

// Buscar en user_api_keys (tabla común de n8n para API keys)
try {
    $keys = $pdo->query("SELECT id, label FROM n8n.user_api_keys");
    echo "\nAPI Keys encontradas en user_api_keys:\n";
    foreach ($keys as $key) {
        echo "  - ID: {$key['id']}, Label: {$key['label']}\n";
    }
    
    // Eliminar todas
    $deleted = $pdo->exec("DELETE FROM n8n.user_api_keys");
    echo "\n✅ Eliminadas $deleted API keys de user_api_keys\n";
} catch (Exception $e) {
    echo "Tabla user_api_keys no existe o error: " . $e->getMessage() . "\n";
}

echo "\n🎉 ¡Limpieza completada!\n";
