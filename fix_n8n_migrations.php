<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "🔧 Arreglando migraciones de n8n...\n\n";

// Opción 1: Borrar TODO el schema y recrearlo
echo "Eliminando schema n8n completo...\n";
$pdo->exec("DROP SCHEMA IF EXISTS n8n CASCADE");
echo "✅ Schema eliminado\n";

echo "Creando schema n8n vacío...\n";
$pdo->exec("CREATE SCHEMA n8n");
echo "✅ Schema creado\n";

echo "\n🎉 ¡Listo! n8n creará las tablas desde cero.\n";
echo "Reiniciando n8n...\n";
