<?php
/**
 * Script para eliminar training messages con texto corrupto de Qdrant
 * Los mensajes de training sin tildes tienen embeddings incorrectos
 * 
 * Ejecutar: php clean_corrupt_training.php
 */

$qdrantHost = 'https://qdrant-production-f4e7.up.railway.app';
$collectionName = 'company_withmia-rzmpsq_knowledge';
$apiKey = 'qdrant_api_key_withmia_2024_secure';

echo "🧹 LIMPIEZA DE TRAINING MESSAGES CORRUPTOS\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// 1. Obtener todos los puntos
echo "📥 Obteniendo puntos de la colección...\n";

$ch = curl_init("$qdrantHost/collections/$collectionName/points/scroll");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        "api-key: $apiKey"
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'limit' => 100,
        'with_payload' => true,
        'with_vector' => false
    ])
]);

$response = curl_exec($ch);
$result = json_decode($response, true);
curl_close($ch);

$points = $result['result']['points'] ?? [];
echo "📊 Total de puntos encontrados: " . count($points) . "\n\n";

// Palabras que deberían tener tildes pero no las tienen (indicador de corrupción)
$corruptPatterns = [
    'informacin',   // información
    'atencin',      // atención
    'dias',         // días
    'podra',        // podría
    'gustara',      // gustaría
    'ms',           // más (cuando está solo)
    'aqupara',      // aquí para
    'quhorario',    // qué horario
];

$pointsToDelete = [];

foreach ($points as $point) {
    $id = $point['id'];
    $payload = $point['payload'] ?? [];
    $type = $payload['type'] ?? '';
    $text = strtolower($payload['text'] ?? $payload['content'] ?? '');
    
    // Solo revisar training_message
    if ($type !== 'training_message') continue;
    
    // Verificar si tiene patrones corruptos
    $isCorrupt = false;
    foreach ($corruptPatterns as $pattern) {
        if (strpos($text, $pattern) !== false) {
            $isCorrupt = true;
            echo "🔴 CORRUPTO - ID: $id\n";
            echo "   Patrón encontrado: '$pattern'\n";
            echo "   Texto: " . substr($payload['text'] ?? '', 0, 100) . "...\n\n";
            break;
        }
    }
    
    if ($isCorrupt) {
        $pointsToDelete[] = $id;
    }
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "📋 Training messages corruptos encontrados: " . count($pointsToDelete) . "\n\n";

if (!empty($pointsToDelete)) {
    echo "¿Deseas eliminar estos puntos? (s/n): ";
    $handle = fopen("php://stdin", "r");
    $line = fgets($handle);
    
    if (trim($line) === 's') {
        echo "\n🗑️  Eliminando " . count($pointsToDelete) . " puntos...\n";
        
        $ch = curl_init("$qdrantHost/collections/$collectionName/points/delete");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                "api-key: $apiKey"
            ],
            CURLOPT_POSTFIELDS => json_encode([
                'points' => $pointsToDelete
            ])
        ]);
        
        $deleteResponse = curl_exec($ch);
        $deleteResult = json_decode($deleteResponse, true);
        curl_close($ch);
        
        if (isset($deleteResult['result']['status']) || (isset($deleteResult['status']) && $deleteResult['status'] === 'ok')) {
            echo "✅ Puntos eliminados exitosamente\n";
        } else {
            echo "❌ Error eliminando puntos: " . json_encode($deleteResult) . "\n";
        }
    } else {
        echo "\n⏭️  Operación cancelada\n";
    }
    
    fclose($handle);
} else {
    echo "✅ No se encontraron training messages corruptos\n";
}

echo "\n📊 RESUMEN FINAL:\n";
// Verificar estado final
$ch = curl_init("$qdrantHost/collections/$collectionName");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_HTTPHEADER => [
        "api-key: $apiKey"
    ]
]);
$infoResponse = curl_exec($ch);
$infoResult = json_decode($infoResponse, true);
curl_close($ch);

$pointsCount = $infoResult['result']['points_count'] ?? 'N/A';
echo "📦 Puntos totales en colección: $pointsCount\n";
