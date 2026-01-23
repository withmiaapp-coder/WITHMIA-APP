<?php
try {
    $pdo = new PDO(
        'pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=railway',
        'postgres',
        'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    echo "✅ Conectado a base de datos\n\n";
    
    // Cambiar el tipo de columna logo_url a TEXT (sin límite)
    $pdo->exec("ALTER TABLE companies ALTER COLUMN logo_url TYPE TEXT");
    
    echo "✅ Columna logo_url cambiada a TEXT (sin límite de tamaño)\n\n";
    echo "Ahora puedes subir logos sin problemas.\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
