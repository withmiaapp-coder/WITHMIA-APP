<?php
/**
 * Script para resetear la base de datos de Laravel
 * Ejecutar via: curl https://app.withmia.com/reset_database.php?key=SECRETKEY
 */

// Verificar clave de seguridad
$secretKey = 'WITHMIA_RESET_2026';
if (!isset($_GET['key']) || $_GET['key'] !== $secretKey) {
    http_response_code(403);
    die('Unauthorized');
}

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

header('Content-Type: text/plain');

try {
    echo "=== RESETEANDO BASE DE DATOS LARAVEL ===\n\n";
    
    // 1. Ejecutar migrate:fresh
    echo "1. Ejecutando migrate:fresh...\n";
    Artisan::call('migrate:fresh', ['--force' => true]);
    echo Artisan::output();
    
    // 2. Ejecutar seeders
    echo "\n2. Ejecutando seeders...\n";
    Artisan::call('db:seed', ['--force' => true]);
    echo Artisan::output();
    
    // 3. Verificar usuario creado
    echo "\n3. Verificando usuarios...\n";
    $users = DB::table('users')->select('id', 'name', 'email')->get();
    foreach ($users as $user) {
        echo "   - ID: {$user->id}, Name: {$user->name}, Email: {$user->email}\n";
    }
    
    echo "\n=== RESET COMPLETADO ===\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
