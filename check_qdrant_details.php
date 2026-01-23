<?php
/**
 * Revisar detalles de Qdrant a fondo
 */

$qdrantUrl = 'https://qdrant-production-f4e7.up.railway.app';
$ctx = stream_context_create([
    'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
    'http' => ['timeout' => 10]
]);

echo "=== ANÁLISIS DETALLADO DE QDRANT ===\n\n";

// 1. Listar todas las colecciones
echo "1️⃣  COLECCIONES DISPONIBLES\n";
echo str_repeat("-", 50) . "\n";
$response = @file_get_contents("$qdrantUrl/collections", false, $ctx);
$data = json_decode($response, true);
$collections = $data['result']['collections'] ?? [];

if (empty($collections)) {
    echo "   ⚠️  No hay colecciones\n";
    exit;
}

foreach ($collections as $col) {
    echo "   📦 {$col['name']}\n";
}

// 2. Detalles de cada colección
echo "\n2️⃣  DETALLES POR COLECCIÓN\n";
echo str_repeat("-", 50) . "\n";

foreach ($collections as $col) {
    $name = $col['name'];
    echo "\n   📦 $name\n";
    echo "   " . str_repeat("-", 40) . "\n";
    
    // Info de la colección
    $response = @file_get_contents("$qdrantUrl/collections/$name", false, $ctx);
    $info = json_decode($response, true);
    
    if (isset($info['result'])) {
        $result = $info['result'];
        
        // Configuración
        $config = $result['config'] ?? [];
        $vectorsConfig = $config['params']['vectors'] ?? [];
        
        echo "   • Status: " . ($result['status'] ?? 'unknown') . "\n";
        echo "   • Puntos totales: " . ($result['points_count'] ?? 0) . "\n";
        echo "   • Segmentos: " . ($result['segments_count'] ?? 0) . "\n";
        
        // Dimensiones del vector
        if (isset($vectorsConfig['size'])) {
            echo "   • Dimensión vectores: " . $vectorsConfig['size'] . "\n";
            echo "   • Distancia: " . ($vectorsConfig['distance'] ?? 'unknown') . "\n";
        }
    }
    
    // Obtener algunos puntos de ejemplo
    echo "\n   📄 Puntos almacenados:\n";
    
    $scrollData = json_encode([
        'limit' => 5,
        'with_payload' => true,
        'with_vector' => false
    ]);
    
    $scrollCtx = stream_context_create([
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => $scrollData,
            'timeout' => 10
        ]
    ]);
    
    $scrollResponse = @file_get_contents("$qdrantUrl/collections/$name/points/scroll", false, $scrollCtx);
    $scrollResult = json_decode($scrollResponse, true);
    
    if (isset($scrollResult['result']['points'])) {
        $points = $scrollResult['result']['points'];
        echo "   • Total puntos encontrados: " . count($points) . "\n\n";
        
        foreach ($points as $i => $point) {
            echo "   ── Punto " . ($i + 1) . " (ID: " . $point['id'] . ")\n";
            
            $payload = $point['payload'] ?? [];
            
            // Mostrar campos del payload
            foreach ($payload as $key => $value) {
                if ($key === 'content' || $key === 'text') {
                    // Truncar contenido largo
                    $preview = substr($value, 0, 100);
                    if (strlen($value) > 100) $preview .= '...';
                    echo "      • $key: $preview\n";
                } elseif ($key === 'metadata' && is_array($value)) {
                    echo "      • metadata:\n";
                    foreach ($value as $mk => $mv) {
                        if (!is_array($mv)) {
                            echo "         - $mk: $mv\n";
                        }
                    }
                } elseif (!is_array($value)) {
                    echo "      • $key: $value\n";
                }
            }
            echo "\n";
        }
    } else {
        echo "   • No se pudieron obtener los puntos\n";
    }
}

echo str_repeat("=", 50) . "\n";
echo "✅ Análisis completado\n";
