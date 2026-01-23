<?php
/**
 * Revisar contenido de Qdrant
 */

require __DIR__.'/vendor/autoload.php';

use Illuminate\Foundation\Application;

// Bootstrap Laravel
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$qdrantHost = env('QDRANT_HOST', 'https://qdrant-production-f4e7.up.railway.app');
$client = new \GuzzleHttp\Client(['timeout' => 10, 'verify' => false]);

echo "=== REVISIÓN DE QDRANT ===\n\n";

try {
    // 1. Listar todas las colecciones
    echo "1️⃣  Colecciones en Qdrant:\n\n";
    
    $response = $client->get("{$qdrantHost}/collections");
    $data = json_decode($response->getBody()->getContents(), true);
    
    $collections = $data['result']['collections'] ?? [];
    
    if (empty($collections)) {
        echo "   ❌ No hay colecciones\n\n";
        exit(0);
    }
    
    foreach ($collections as $collection) {
        $name = $collection['name'];
        echo "   📁 {$name}\n";
        
        // Obtener detalles de la colección
        $detailResponse = $client->get("{$qdrantHost}/collections/{$name}");
        $details = json_decode($detailResponse->getBody()->getContents(), true);
        
        $pointsCount = $details['result']['points_count'] ?? 0;
        $vectorsCount = $details['result']['vectors_count'] ?? 0;
        
        echo "      Puntos: {$pointsCount}\n";
        echo "      Vectores: {$vectorsCount}\n";
        
        // Obtener algunos puntos de ejemplo
        if ($pointsCount > 0) {
            $scrollResponse = $client->post("{$qdrantHost}/collections/{$name}/points/scroll", [
                'json' => [
                    'limit' => 10,
                    'with_payload' => true,
                    'with_vector' => false
                ]
            ]);
            
            $scrollData = json_decode($scrollResponse->getBody()->getContents(), true);
            $points = $scrollData['result']['points'] ?? [];
            
            echo "\n      📋 Puntos (mostrando primeros " . count($points) . "):\n\n";
            
            foreach ($points as $index => $point) {
                $id = $point['id'];
                $payload = $point['payload'] ?? [];
                
                echo "      " . ($index + 1) . ". ID: {$id}\n";
                
                // Mostrar campos relevantes del payload
                if (isset($payload['type'])) {
                    echo "         Tipo: {$payload['type']}\n";
                }
                
                if (isset($payload['content'])) {
                    $content = substr($payload['content'], 0, 100);
                    echo "         Contenido: {$content}...\n";
                }
                
                if (isset($payload['text'])) {
                    $text = substr($payload['text'], 0, 100);
                    echo "         Texto: {$text}...\n";
                }
                
                if (isset($payload['filename'])) {
                    echo "         Archivo: {$payload['filename']}\n";
                }
                
                if (isset($payload['category'])) {
                    echo "         Categoría: {$payload['category']}\n";
                }
                
                if (isset($payload['chunk_index'])) {
                    echo "         Chunk: {$payload['chunk_index']}\n";
                }
                
                if (isset($payload['assistant_name'])) {
                    echo "         Asistente: {$payload['assistant_name']}\n";
                }
                
                if (isset($payload['company_name'])) {
                    echo "         Empresa: {$payload['company_name']}\n";
                }
                
                if (isset($payload['update_count'])) {
                    echo "         Actualizaciones: {$payload['update_count']}\n";
                }
                
                if (isset($payload['created_at'])) {
                    echo "         Creado: {$payload['created_at']}\n";
                }
                
                if (isset($payload['updated_at'])) {
                    echo "         Actualizado: {$payload['updated_at']}\n";
                }
                
                echo "\n";
            }
        }
        
        echo "\n" . str_repeat("-", 70) . "\n\n";
    }
    
    echo "✅ Revisión completada\n\n";

} catch (\Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
