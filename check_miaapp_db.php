<?php
/**
 * Script para verificar y ejecutar migraciones manualmente en la base de datos miaapp
 */

$host = 'yamanote.proxy.rlwy.net';
$port = '30172';
$dbname = 'miaapp';
$user = 'postgres';
$password = 'AOtZHroOvTYXBMmKtoaDmKQuSPEiwoWV';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Conectado a base de datos 'miaapp'\n\n";
    
    // Verificar tablas existentes
    echo "📋 Tablas en 'miaapp':\n";
    $tables = $pdo->query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    $tableList = $tables->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($tableList)) {
        echo "   (ninguna tabla - base de datos vacía)\n";
        echo "\n⚠️  Las migraciones NO se ejecutaron\n";
    } else {
        foreach ($tableList as $t) echo "   - $t\n";
        echo "\n✅ Total: " . count($tableList) . " tablas\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
