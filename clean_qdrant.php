<?php
/**
 * Eliminar TODAS las colecciones de Qdrant
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$qdrantHost = env('QDRANT_HOST', 'https://qdrant-production-f4e7.up.railway.app');
$client = new \GuzzleHttp\Client(['timeout' => 10, 'verify' => false]);

echo "=== ELIMINANDO TODAS LAS COLECCIONES DE QDRANT ===\n\n";

try {
    // 1. Listar todas las colecciones
    $response = $client->get("{$qdrantHost}/collections");
    $data = json_decode($response->getBody()->getContents(), true);
    
    $collections = $data['result']['collections'] ?? [];
    
    if (empty($collections)) {
        echo "✅ No hay colecciones en Qdrant\n";
        exit(0);
    }
    
    echo "Colecciones encontradas: " . count($collections) . "\n\n";
    
    // 2. Eliminar cada colección
    foreach ($collections as $collection) {
        $name = $collection['name'];
        echo "🗑️  Eliminando: {$name}... ";
        
        try {
            $client->delete("{$qdrantHost}/collections/{$name}");
            echo "✅ Eliminada\n";
        } catch (\Exception $e) {
            echo "❌ Error: " . $e->getMessage() . "\n";
        }
    }
    
    echo "\n✅ Todas las colecciones eliminadas\n";
    
    // 3. Verificar
    echo "\nVerificando...\n";
    $response = $client->get("{$qdrantHost}/collections");
    $data = json_decode($response->getBody()->getContents(), true);
    $collections = $data['result']['collections'] ?? [];
    echo "Colecciones restantes: " . count($collections) . "\n";

} catch (\Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
