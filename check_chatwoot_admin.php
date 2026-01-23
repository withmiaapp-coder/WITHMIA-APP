<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

// Conectar a Chatwoot DB
config(['database.connections.chatwoot_db' => [
    'driver' => 'pgsql',
    'host' => 'switchyard.proxy.rlwy.net',
    'port' => '28796',
    'database' => 'chatwoot',
    'username' => 'postgres',
    'password' => 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw',
    'charset' => 'utf8',
    'sslmode' => 'prefer',
]]);

try {
    $superAdmin = DB::connection('chatwoot_db')
        ->table('users')
        ->where('type', 'SuperAdmin')
        ->first();
    
    if ($superAdmin) {
        echo "✅ Super Admin de Chatwoot encontrado:\n";
        echo "   ID: {$superAdmin->id}\n";
        echo "   Email: {$superAdmin->email}\n";
        echo "   Nombre: {$superAdmin->name}\n";
    } else {
        echo "⚠️ No se encontró Super Admin en Chatwoot\n";
    }
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
