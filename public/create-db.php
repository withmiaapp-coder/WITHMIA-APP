<?php
// Crear base de datos chatwoot
try {
    $pdo = new PDO(
        'pgsql:host=postgres.railway.internal;port=5432;dbname=railway',
        'postgres',
        'dzMmfzVhEDLgeRIAvRlWofFnagOyItjs',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    // Verificar si existe
    $stmt = $pdo->query("SELECT 1 FROM pg_database WHERE datname = 'chatwoot'");
    if ($stmt->fetchColumn()) {
        echo "Base de datos 'chatwoot' ya existe\n";
    } else {
        $pdo->exec("CREATE DATABASE chatwoot");
        echo "Base de datos 'chatwoot' creada exitosamente\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
