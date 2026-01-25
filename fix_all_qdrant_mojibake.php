<?php
/**
 * Script para CORREGIR encoding mojibake en TODOS los puntos de Qdrant
 * 
 * El problema: Los acentos se guardaron como "Ã³" en vez de "ó" (UTF-8 interpretado como Latin-1)
 * 
 * Ejecutar: php fix_all_qdrant_mojibake.php
 */

// Credenciales directas (cambiar según necesidad)
$qdrantHost = 'https://qdrant-production-f4e7.up.railway.app';
$apiKey = 'qdrant_api_key_withmia_2024_secure';
$openaiKey = getenv('OPENAI_API_KEY') ?: '';

echo "🔧 CORRECCIÓN DE ENCODING MOJIBAKE EN QDRANT\n";
echo "═══════════════════════════════════════════════════════════════\n\n";
echo "Host: $qdrantHost\n\n";

/**
 * Corregir mojibake UTF-8 (cuando UTF-8 fue interpretado como Latin-1)
 */
function fixMojibake($text) {
    if (empty($text)) return $text;
    
    $fixed = $text;
    
    // MÉTODO PRINCIPAL: Decodificar UTF-8 que fue mal interpretado como Latin-1
    // Si el texto UTF-8 fue leído como ISO-8859-1 y luego codificado a UTF-8,
    // necesitamos revertirlo: UTF-8 -> ISO-8859-1 nos dará el texto original
    
    // Detectar si hay secuencias típicas de mojibake (Ã seguido de caracter)
    if (preg_match('/\xC3[\x80-\xBF]/', $fixed)) {
        // Intentar la conversión inversa
        $decoded = @iconv('UTF-8', 'ISO-8859-1//IGNORE', $fixed);
        if ($decoded !== false && strlen($decoded) > 0) {
            // Verificar que el resultado tiene caracteres españoles correctos
            if (preg_match('/[áéíóúñüÁÉÍÓÚÑÜ¿¡àèìòùÀÈÌÒÙ]/u', $decoded)) {
                $fixed = $decoded;
            }
        }
    }
    
    // Limpiar caracteres de control inválidos
    $fixed = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $fixed);
    
    // Eliminar caracteres de reemplazo Unicode
    $fixed = preg_replace('/\x{FFFD}/u', '', $fixed);
    
    return $fixed;
}

/**
 * Generar embedding usando OpenAI
 */
function generateEmbedding($text, $openaiKey) {
    $ch = curl_init('https://api.openai.com/v1/embeddings');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer $openaiKey",
            'Content-Type: application/json'
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'model' => 'text-embedding-3-small',
            'input' => $text
        ], JSON_UNESCAPED_UNICODE),
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT => 30
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $data = json_decode($response, true);
    return $data['data'][0]['embedding'] ?? null;
}

// 1. Obtener todas las colecciones
$ch = curl_init("$qdrantHost/collections");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ["api-key: $apiKey"],
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_TIMEOUT => 30
]);
$response = curl_exec($ch);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    echo "❌ Error CURL obteniendo colecciones: $curlError\n";
    exit(1);
}

$decoded = json_decode($response, true);
if (!$decoded) {
    echo "❌ Error decodificando respuesta: $response\n";
    exit(1);
}

$collections = $decoded['result']['collections'] ?? [];

echo "📁 Colecciones encontradas: " . count($collections) . "\n\n";

$totalFixed = 0;
$totalPoints = 0;

foreach ($collections as $col) {
    $collectionName = $col['name'];
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "📂 Procesando: $collectionName\n";
    
    $offset = null;
    $collectionFixed = 0;
    
    do {
        // Obtener puntos con scroll
        $scrollData = ['limit' => 50, 'with_payload' => true, 'with_vector' => true];
        if ($offset) {
            $scrollData['offset'] = $offset;
        }
        
        $ch = curl_init("$qdrantHost/collections/$collectionName/points/scroll");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ["api-key: $apiKey", 'Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($scrollData),
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_TIMEOUT => 30
        ]);
        $response = curl_exec($ch);
        curl_close($ch);
        
        $result = json_decode($response, true)['result'] ?? [];
        $points = $result['points'] ?? [];
        $offset = $result['next_page_offset'] ?? null;
        
        foreach ($points as $point) {
            $totalPoints++;
            $pointId = $point['id'];
            $payload = $point['payload'] ?? [];
            $vector = $point['vector'] ?? null;
            
            $text = $payload['text'] ?? $payload['content'] ?? '';
            
            if (empty($text)) continue;
            
            // Verificar si hay mojibake (patrones Ã seguido de caracteres específicos)
            $hasMojibake = preg_match('/\xC3[\x80-\xBF]/', $text);
            
            if (!$hasMojibake) continue;
            
            $fixedText = fixMojibake($text);
            
            if ($fixedText === $text) continue;
            
            echo "   📝 Corrigiendo punto ID: $pointId\n";
            echo "      Antes:   " . mb_substr($text, 0, 60, 'UTF-8') . "...\n";
            echo "      Después: " . mb_substr($fixedText, 0, 60, 'UTF-8') . "...\n";
            
            // Actualizar payload
            if (isset($payload['text'])) {
                $payload['text'] = $fixedText;
            }
            if (isset($payload['content'])) {
                $payload['content'] = $fixedText;
            }
            
            // Regenerar embedding con el texto corregido
            $newVector = $vector;
            if (!empty($openaiKey)) {
                echo "      🔄 Regenerando embedding...\n";
                $newEmbedding = generateEmbedding($fixedText, $openaiKey);
                if ($newEmbedding) {
                    $newVector = $newEmbedding;
                }
            }
            
            // Actualizar punto en Qdrant
            $updateData = [
                'points' => [
                    [
                        'id' => $pointId,
                        'vector' => $newVector,
                        'payload' => $payload
                    ]
                ]
            ];
            
            $ch = curl_init("$qdrantHost/collections/$collectionName/points");
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CUSTOMREQUEST => 'PUT',
                CURLOPT_HTTPHEADER => [
                    "api-key: $apiKey",
                    'Content-Type: application/json; charset=utf-8'
                ],
                CURLOPT_POSTFIELDS => json_encode($updateData, JSON_UNESCAPED_UNICODE),
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false,
                CURLOPT_TIMEOUT => 30
            ]);
            
            $updateResponse = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode >= 200 && $httpCode < 300) {
                echo "      ✅ Actualizado correctamente\n\n";
                $collectionFixed++;
                $totalFixed++;
            } else {
                echo "      ❌ Error: HTTP $httpCode - $updateResponse\n\n";
            }
            
            // Pequeña pausa para no sobrecargar
            usleep(100000); // 100ms
        }
        
    } while ($offset);
    
    echo "   📊 Puntos corregidos en esta colección: $collectionFixed\n\n";
}

echo "═══════════════════════════════════════════════════════════════\n";
echo "✅ CORRECCIÓN COMPLETADA\n";
echo "📊 Total de puntos revisados: $totalPoints\n";
echo "📊 Total de puntos corregidos: $totalFixed\n";

if ($totalFixed > 0) {
    echo "\n⚠️  IMPORTANTE: Los embeddings fueron regenerados con el texto corregido.\n";
    echo "   Las búsquedas deberían funcionar mejor ahora.\n";
}
