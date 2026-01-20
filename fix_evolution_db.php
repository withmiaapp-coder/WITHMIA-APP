<?php
/**
 * Script para arreglar el problema de Prisma P3005 en Evolution API
 */

$host = 'yamanote.proxy.rlwy.net';
$port = '30172';
$user = 'postgres';
$password = 'AOtZHroOvTYXBMmKtoaDmKQuSPEiwoWV';

echo "=== DIAGNÓSTICO DE BASE DE DATOS EVOLUTION ===\n\n";

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=evolution", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Conectado a base de datos 'evolution'\n\n";
    
    // Verificar tablas
    echo "📋 Tablas en evolution.public:\n";
    $tables = $pdo->query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    $tableList = $tables->fetchAll(PDO::FETCH_COLUMN);
    if (empty($tableList)) {
        echo "   (ninguna tabla)\n";
    } else {
        foreach ($tableList as $t) echo "   - $t\n";
    }
    
    // Verificar secuencias
    echo "\n📋 Secuencias:\n";
    $seqs = $pdo->query("SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'");
    $seqList = $seqs->fetchAll(PDO::FETCH_COLUMN);
    if (empty($seqList)) {
        echo "   (ninguna secuencia)\n";
    } else {
        foreach ($seqList as $s) echo "   - $s\n";
    }
    
    // Verificar tipos ENUM
    echo "\n📋 Tipos ENUM:\n";
    $enums = $pdo->query("SELECT typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typtype = 'e' AND n.nspname = 'public'");
    $enumList = $enums->fetchAll(PDO::FETCH_COLUMN);
    if (empty($enumList)) {
        echo "   (ningún enum)\n";
    } else {
        foreach ($enumList as $e) echo "   - $e\n";
    }
    
    // Verificar vistas
    echo "\n📋 Vistas:\n";
    $views = $pdo->query("SELECT table_name FROM information_schema.views WHERE table_schema = 'public'");
    $viewList = $views->fetchAll(PDO::FETCH_COLUMN);
    if (empty($viewList)) {
        echo "   (ninguna vista)\n";
    } else {
        foreach ($viewList as $v) echo "   - $v\n";
    }
    
    // Verificar funciones
    echo "\n📋 Funciones:\n";
    $funcs = $pdo->query("SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'");
    $funcList = $funcs->fetchAll(PDO::FETCH_COLUMN);
    if (empty($funcList)) {
        echo "   (ninguna función)\n";
    } else {
        foreach ($funcList as $f) echo "   - $f\n";
    }
    
    $totalObjects = count($tableList) + count($seqList) + count($enumList) + count($viewList) + count($funcList);
    echo "\n📊 Total de objetos en schema public: $totalObjects\n";
    
    // Si se pasa --nuclear, eliminar TODO el schema y recrearlo
    if (isset($argv[1]) && $argv[1] === '--nuclear') {
        echo "\n☢️  LIMPIEZA NUCLEAR - Eliminando y recreando schema public...\n";
        
        $pdo->exec("DROP SCHEMA public CASCADE");
        echo "   ✅ Schema public eliminado\n";
        
        $pdo->exec("CREATE SCHEMA public");
        echo "   ✅ Schema public recreado\n";
        
        $pdo->exec("GRANT ALL ON SCHEMA public TO postgres");
        $pdo->exec("GRANT ALL ON SCHEMA public TO public");
        echo "   ✅ Permisos aplicados\n";
        
        echo "\n✅ Base de datos evolution completamente vacía\n";
        echo "   Ahora haga redeploy de Evolution API\n";
    } else if ($totalObjects > 0) {
        echo "\n⚠️  La base de datos NO está vacía. Use --nuclear para limpiar completamente:\n";
        echo "   php fix_evolution_db.php --nuclear\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
