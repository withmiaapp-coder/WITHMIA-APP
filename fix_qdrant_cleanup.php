<?php
/**
 * Script para limpiar Qdrant:
 * 1. Eliminar puntos vacíos (training_message sin contenido)
 * 2. Eliminar puntos duplicados de documentos
 * 3. Corregir encoding mojibake en puntos existentes
 * 
 * Ejecutar: php fix_qdrant_cleanup.php
 */

$qdrantHost = 'https://qdrant-production-f4e7.up.railway.app';
$collectionName = 'company_withmia-rzmpsq_knowledge';
$apiKey = 'qdrant_api_key_withmia_2024_secure';

echo "🧹 LIMPIEZA DE QDRANT\n";
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

// Arrays para rastrear
$pointsToDelete = [];
$seenDocuments = [];
$pointsWithMojibake = [];

foreach ($points as $point) {
    $id = $point['id'];
    $payload = $point['payload'] ?? [];
    $type = $payload['type'] ?? 'unknown';
    $text = $payload['text'] ?? $payload['content'] ?? '';
    $filename = $payload['filename'] ?? '';
    
    // 1. Detectar puntos vacíos (training_message sin contenido)
    if ($type === 'training_message' && strlen(trim($text)) === 0) {
        echo "🗑️  VACÍO - ID: $id (training_message sin contenido)\n";
        $pointsToDelete[] = $id;
        continue;
    }
    
    // 2. Detectar documentos duplicados
    if ($type === 'document' && !empty($filename)) {
        $docKey = $filename . '_' . ($payload['chunk_index'] ?? 0);
        if (isset($seenDocuments[$docKey])) {
            echo "🔄 DUPLICADO - ID: $id ($filename ya existe como {$seenDocuments[$docKey]})\n";
            $pointsToDelete[] = $id;
            continue;
        }
        $seenDocuments[$docKey] = $id;
    }
    
    // 3. Detectar mojibake (caracteres rotos)
    if (preg_match('/[\x80-\xFF]/', $text) && preg_match('/�|¿|Ã|Â/', $text)) {
        echo "⚠️  MOJIBAKE - ID: $id (texto con encoding roto)\n";
        $pointsWithMojibake[] = [
            'id' => $id,
            'payload' => $payload
        ];
    }
}

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "📋 RESUMEN:\n";
echo "   - Puntos a eliminar: " . count($pointsToDelete) . "\n";
echo "   - Puntos con mojibake: " . count($pointsWithMojibake) . "\n\n";

// Eliminar puntos vacíos y duplicados
if (!empty($pointsToDelete)) {
    echo "🗑️  Eliminando " . count($pointsToDelete) . " puntos...\n";
    
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
    
    if (isset($deleteResult['result']) && $deleteResult['result']['status'] === 'ok') {
        echo "✅ Puntos eliminados exitosamente\n";
    } else {
        echo "❌ Error eliminando puntos: " . json_encode($deleteResult) . "\n";
    }
}

// Corregir encoding de puntos con mojibake
if (!empty($pointsWithMojibake)) {
    echo "\n🔧 Corrigiendo encoding de " . count($pointsWithMojibake) . " puntos...\n";
    
    foreach ($pointsWithMojibake as $point) {
        $id = $point['id'];
        $payload = $point['payload'];
        
        // Corregir el texto
        $text = $payload['text'] ?? $payload['content'] ?? '';
        $fixedText = fixMojibake($text);
        
        if ($fixedText !== $text) {
            // Actualizar el payload con texto corregido
            if (isset($payload['text'])) {
                $payload['text'] = $fixedText;
            }
            if (isset($payload['content'])) {
                $payload['content'] = $fixedText;
            }
            
            echo "   📝 Corrigiendo ID: $id\n";
            echo "      Antes: " . substr($text, 0, 50) . "...\n";
            echo "      Después: " . substr($fixedText, 0, 50) . "...\n";
            
            // Actualizar en Qdrant usando set_payload
            $ch = curl_init("$qdrantHost/collections/$collectionName/points/payload");
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_CUSTOMREQUEST => 'POST',
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json; charset=utf-8',
                    "api-key: $apiKey"
                ],
                CURLOPT_POSTFIELDS => json_encode([
                    'points' => [$id],
                    'payload' => $payload
                ], JSON_UNESCAPED_UNICODE)
            ]);
            
            $updateResponse = curl_exec($ch);
            curl_close($ch);
        }
    }
    
    echo "✅ Encoding corregido\n";
}

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "✅ LIMPIEZA COMPLETADA\n\n";

// Verificar estado final
echo "📊 Verificando estado final...\n";
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
echo "📦 Puntos en colección: $pointsCount\n";

/**
 * Funcion para corregir mojibake
 */
function fixMojibake($text) {
    if (empty($text)) return $text;
    
    // Remover caracteres de reemplazo Unicode
    $fixed = preg_replace('/\x{FFFD}/u', '', $text);
    
    // Remover caracteres problematicos
    $fixed = str_replace("\xC2\xBF", '', $fixed); // ¿ mal codificado
    $fixed = str_replace("\xC2", '', $fixed);     // Byte huerfano
    $fixed = str_replace("\xEF\xBF\xBD", '', $fixed); // Replacement char
    
    // Intentar detectar doble encoding y corregir
    if (preg_match('/[\xC0-\xDF][\x80-\xBF]/', $fixed)) {
        $decoded = @iconv('UTF-8', 'ISO-8859-1//IGNORE', $fixed);
        if ($decoded !== false && mb_check_encoding($decoded, 'UTF-8')) {
            $fixed = $decoded;
        }
    }
    
    return $fixed;
}
