<?php
try {
    // Conectar a la base de datos chatwoot
    $pdo = new PDO(
        'pgsql:host=ballast.proxy.rlwy.net;port=12662;dbname=chatwoot',
        'postgres',
        'KhOBXhYGuAFGFcAwWdBydjDDTMZCianm'
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Intentar crear la extensión pgvector
    echo "Intentando crear extensión pgvector...\n";
    $pdo->exec('CREATE EXTENSION IF NOT EXISTS vector');
    echo "✅ Extensión pgvector creada exitosamente!\n";
    
    // Verificar
    $result = $pdo->query("SELECT * FROM pg_extension WHERE extname = 'vector'");
    if ($result->fetch()) {
        echo "✅ Verificado: pgvector está instalado!\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
