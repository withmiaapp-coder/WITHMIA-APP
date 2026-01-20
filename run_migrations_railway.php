<?php
/**
 * Script para ejecutar migraciones en Railway usando el proxy público
 * Ejecutar: php run_migrations_railway.php
 */

require __DIR__.'/vendor/autoload.php';

// Configuración del nuevo Postgres
$host = 'switchyard.proxy.rlwy.net';
$port = '28796';
$database = 'railway';
$username = 'postgres';
$password = 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw';

echo "=== Ejecutando Migraciones en Railway ===\n\n";

// Establecer variables de entorno temporalmente
putenv("DB_CONNECTION=pgsql");
putenv("DB_HOST=$host");
putenv("DB_PORT=$port");
putenv("DB_DATABASE=$database");
putenv("DB_USERNAME=$username");
putenv("DB_PASSWORD=$password");

$_ENV['DB_CONNECTION'] = 'pgsql';
$_ENV['DB_HOST'] = $host;
$_ENV['DB_PORT'] = $port;
$_ENV['DB_DATABASE'] = $database;
$_ENV['DB_USERNAME'] = $username;
$_ENV['DB_PASSWORD'] = $password;

// Bootstrap Laravel
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

// Forzar la reconexión con las nuevas credenciales
config([
    'database.connections.pgsql.host' => $host,
    'database.connections.pgsql.port' => $port,
    'database.connections.pgsql.database' => $database,
    'database.connections.pgsql.username' => $username,
    'database.connections.pgsql.password' => $password,
]);

\DB::purge('pgsql');
\DB::reconnect('pgsql');

echo "Conectando a: $host:$port/$database\n\n";

try {
    // Verificar conexión
    $version = \DB::select('SELECT version()')[0]->version;
    echo "✅ Conexión exitosa\n";
    echo "   PostgreSQL: " . substr($version, 0, 50) . "...\n\n";
    
    // Ejecutar migraciones
    echo "🔄 Ejecutando migraciones...\n\n";
    
    $exitCode = Artisan::call('migrate', [
        '--force' => true,
        '--no-interaction' => true,
    ]);
    
    echo Artisan::output();
    
    if ($exitCode === 0) {
        echo "\n✅ Migraciones completadas exitosamente!\n";
    } else {
        echo "\n❌ Hubo errores en las migraciones (código: $exitCode)\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
