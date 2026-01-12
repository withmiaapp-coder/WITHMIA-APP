<?php

/**
 * Script para migrar datos de MySQL a PostgreSQL
 * 
 * Uso: railway run --service mia-app php database/mysql-to-postgres.php
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "=== Migración MySQL a PostgreSQL ===\n\n";

// Configurar conexión MySQL temporal
config(['database.connections.mysql_source' => [
    'driver' => 'mysql',
    'host' => env('MYSQLHOST', 'mysql.railway.internal'),
    'port' => env('MYSQLPORT', '3306'),
    'database' => env('MYSQLDATABASE', 'railway'),
    'username' => env('MYSQLUSER', 'root'),
    'password' => env('MYSQLPASSWORD', ''),
    'charset' => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'prefix' => '',
    'strict' => true,
]]);

try {
    // Obtener lista de tablas de MySQL
    echo "Conectando a MySQL...\n";
    $tables = DB::connection('mysql_source')->select('SHOW TABLES');
    $tableKey = 'Tables_in_' . env('MYSQLDATABASE', 'railway');
    
    echo "Tablas encontradas: " . count($tables) . "\n\n";
    
    foreach ($tables as $table) {
        $tableName = $table->$tableKey;
        
        // Saltar tabla de migraciones si ya existe en PostgreSQL
        if ($tableName === 'migrations') {
            echo "Saltando tabla 'migrations' (se creará con php artisan migrate)\n";
            continue;
        }
        
        echo "Procesando tabla: $tableName\n";
        
        // Obtener datos de MySQL
        $records = DB::connection('mysql_source')->table($tableName)->get();
        echo "  - Registros encontrados: " . $records->count() . "\n";
        
        if ($records->isEmpty()) {
            echo "  - Tabla vacía, saltando...\n\n";
            continue;
        }
        
        // Insertar en PostgreSQL
        try {
            // Verificar si la tabla existe en PostgreSQL
            if (!Schema::connection('pgsql')->hasTable($tableName)) {
                echo "  - ADVERTENCIA: Tabla $tableName no existe en PostgreSQL. Ejecuta 'php artisan migrate' primero.\n\n";
                continue;
            }
            
            // Truncar tabla en PostgreSQL (opcional)
            DB::connection('pgsql')->table($tableName)->truncate();
            
            // Insertar en chunks para evitar problemas de memoria
            $chunks = $records->chunk(100);
            $totalInserted = 0;
            
            foreach ($chunks as $chunk) {
                $data = $chunk->map(function ($record) {
                    return (array) $record;
                })->toArray();
                
                DB::connection('pgsql')->table($tableName)->insert($data);
                $totalInserted += count($data);
            }
            
            echo "  - ✓ Insertados $totalInserted registros\n\n";
            
        } catch (Exception $e) {
            echo "  - ✗ Error insertando en PostgreSQL: " . $e->getMessage() . "\n\n";
        }
    }
    
    echo "\n=== Migración completada ===\n";
    echo "Verifica los datos en PostgreSQL\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
