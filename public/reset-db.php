<?php
/**
 * TEMPORAL: Reset database for testing
 * DELETE THIS FILE AFTER USE
 */

// Security: Only allow with secret key
$secretKey = $_GET['key'] ?? '';
if ($secretKey !== 'mia-reset-2026-temp') {
    http_response_code(403);
    die('Forbidden');
}

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;

try {
    echo "<pre>";
    echo "🗑️ Limpiando base de datos...\n\n";
    
    // Disable foreign key checks
    DB::statement('SET session_replication_role = replica;');
    
    // Get all tables
    $tables = DB::select("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    
    foreach ($tables as $table) {
        if ($table->tablename !== 'migrations') {
            DB::table($table->tablename)->truncate();
            echo "✅ Truncated: {$table->tablename}\n";
        }
    }
    
    // Re-enable foreign key checks
    DB::statement('SET session_replication_role = DEFAULT;');
    
    echo "\n✅ Base de datos limpiada!\n";
    echo "\n⚠️ IMPORTANTE: Borra este archivo (reset-db.php) después de usar!\n";
    echo "</pre>";
    
} catch (\Exception $e) {
    echo "<pre>";
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
    echo "</pre>";
}
