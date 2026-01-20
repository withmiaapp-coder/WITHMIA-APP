<?php
try {
    $pdo = new PDO(
        'pgsql:host=ballast.proxy.rlwy.net;port=12662;dbname=railway',
        'postgres',
        'KhOBXhYGuAFGFcAwWdBydjDDTMZCianm'
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Verificar si la base de datos ya existe
    $result = $pdo->query("SELECT 1 FROM pg_database WHERE datname = 'chatwoot'");
    if ($result->fetchColumn()) {
        echo "Database 'chatwoot' already exists!\n";
    } else {
        $pdo->exec('CREATE DATABASE chatwoot');
        echo "Database 'chatwoot' created successfully!\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
