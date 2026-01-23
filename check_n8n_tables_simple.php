<?php
$pdo = new PDO(
    'pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n',
    'postgres',
    'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "Tablas en la base de datos N8N:\n\n";

echo "Schemas disponibles:\n";
$schemas = $pdo->query("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name")->fetchAll(PDO::FETCH_COLUMN);
foreach ($schemas as $schema) {
    echo "- $schema\n";
}

echo "\nBuscando tablas workflow en todos los schemas:\n";
$tables = $pdo->query("
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE tablename LIKE '%workflow%' 
    ORDER BY schemaname, tablename
")->fetchAll(PDO::FETCH_ASSOC);

foreach ($tables as $table) {
    echo "- {$table['schemaname']}.{$table['tablename']}\n";
}
