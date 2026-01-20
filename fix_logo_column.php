<?php
/**
 * Script para cambiar logo_url de VARCHAR a TEXT
 * Permite almacenar logos como base64 en la base de datos
 */

// Usar variables de entorno de Railway
$host = getenv('DB_HOST') ?: 'postgres.railway.internal';
$port = getenv('DB_PORT') ?: '5432';
$dbname = getenv('DB_DATABASE') ?: 'miaapp';
$username = getenv('DB_USERNAME') ?: 'postgres';
$password = getenv('DB_PASSWORD') ?: '';

try {
    $pdo = new PDO(
        "pgsql:host=$host;port=$port;dbname=$dbname",
        $username,
        $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    echo "✅ Conectado a la base de datos\n\n";
    
    // Cambiar logo_url de VARCHAR a TEXT
    $sql = "ALTER TABLE companies ALTER COLUMN logo_url TYPE TEXT";
    $pdo->exec($sql);
    echo "✅ Columna logo_url cambiada a TEXT\n";
    
    // Limpiar el logo_url actual (que tiene path roto)
    $sql = "UPDATE companies SET logo_url = NULL";
    $pdo->exec($sql);
    echo "✅ logo_url limpiado (los paths antiguos ya no funcionan)\n";
    
    // Verificar
    $stmt = $pdo->query("SELECT id, name, logo_url FROM companies");
    $companies = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "\n📋 Estado de las empresas:\n";
    foreach ($companies as $company) {
        $logoStatus = $company['logo_url'] ? 'Con logo' : 'Sin logo';
        echo "  - {$company['name']}: {$logoStatus}\n";
    }
    
    echo "\n✅ ¡Listo! Ahora sube el logo nuevamente y se guardará como base64 en la BD.\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
