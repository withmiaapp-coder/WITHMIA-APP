<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "🗑️ Limpiando TODAS las tablas de n8n para reinicio limpio...\n\n";

// Desactivar FK
$pdo->exec("SET session_replication_role = 'replica'");

// Obtener todas las tablas
$stmt = $pdo->query("SELECT tablename FROM pg_tables WHERE schemaname = 'n8n'");
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

foreach ($tables as $table) {
    // No limpiar migrations
    if ($table === 'migrations') continue;
    
    try {
        $pdo->exec("TRUNCATE TABLE n8n.\"$table\" CASCADE");
        echo "✅ $table\n";
    } catch (Exception $e) {
        echo "⚠️ $table: " . $e->getMessage() . "\n";
    }
}

$pdo->exec("SET session_replication_role = 'origin'");

echo "\n🎉 ¡Base de datos de n8n limpiada!\n";
echo "\n⚠️ IMPORTANTE: Ahora debes reiniciar el servicio n8n en Railway.\n";
echo "   Cuando lo hagas, n8n te mostrará la pantalla de setup inicial\n";
echo "   para crear el usuario owner desde cero.\n";
