<?php
/**
 * Script para limpiar todas las tablas de miaapp
 * Mantiene: migrations, super admin de chatwoot
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "🧹 Limpiando base de datos miaapp...\n\n";

// Obtener todas las tablas excepto migrations y sistema
$tables = DB::select("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('migrations', 'spatial_ref_sys')");

foreach ($tables as $t) {
    try {
        DB::statement('TRUNCATE TABLE "' . $t->tablename . '" RESTART IDENTITY CASCADE');
        echo "✅ {$t->tablename}\n";
    } catch (\Exception $e) {
        echo "⚠️ {$t->tablename}: " . substr($e->getMessage(), 0, 60) . "\n";
    }
}

echo "\n🎉 Base de datos MIAAPP limpiada!\n";

// Verificar Chatwoot super admin
try {
    $chatwootUrl = env('CHATWOOT_DATABASE_URL');
    if ($chatwootUrl) {
        config(['database.connections.chatwoot_temp' => [
            'driver' => 'pgsql',
            'url' => $chatwootUrl,
            'charset' => 'utf8',
            'prefix' => '',
            'search_path' => 'public',
            'sslmode' => 'prefer',
        ]]);
        
        $superAdmin = DB::connection('chatwoot_temp')
            ->table('users')
            ->where('type', 'SuperAdmin')
            ->first();
        
        if ($superAdmin) {
            echo "\n✅ Super Admin Chatwoot preservado: {$superAdmin->email}\n";
        }
    }
} catch (\Exception $e) {
    echo "\n⚠️ Chatwoot: " . $e->getMessage() . "\n";
}

echo "\n✅ Qdrant ya fue limpiado previamente.\n";
