<?php
/**
 * Script para corregir encoding mojibake en puntos de Qdrant
 * Este script arregla los caracteres corruptos
 * 
 * Ejecutar: php fix_qdrant_encoding.php
 */

$qdrantHost = 'https://qdrant-production-f4e7.up.railway.app';
$collectionName = 'company_withmia-rzmpsq_knowledge';
$apiKey = 'qdrant_api_key_withmia_2024_secure';

echo "🔧 CORRECCIÓN DE ENCODING EN QDRANT\n";
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
        'with_vector' => true
    ])
]);

$response = curl_exec($ch);
$result = json_decode($response, true);
curl_close($ch);

$points = $result['result']['points'] ?? [];
echo "📊 Total de puntos encontrados: " . count($points) . "\n\n";

// Mapeo completo CP437/Windows/Console -> UTF-8 (para PDFs)
$cp437ToUtf8 = [
    // Caracteres vistos en el output de consola Windows (├ seguido de caracter)
    "├í" => "á", "├á" => "á", "├¡" => "í", 
    "├®" => "é", "├®" => "é", "├ë" => "É",
    "├│" => "ó", "├ô" => "Ó", "├│" => "ó",
    "├║" => "ú", "├Ü" => "Ú", "├║" => "ú",
    "├▒" => "ñ", "├Ñ" => "Ñ",
    "├¼" => "ü", "├£" => "Ü",
    "├ì" => "Í", "├ü" => "Á",
    "├¿" => "¿", "├í" => "¡",
    // Bullet point
    "ÔÇó" => "•",
    // UTF-8 bytes directos
    "\xc3\xa1" => "á", "\xc3\xa9" => "é", "\xc3\xad" => "í", 
    "\xc3\xb3" => "ó", "\xc3\xba" => "ú", "\xc3\xb1" => "ñ",
    "\xc3\x81" => "Á", "\xc3\x89" => "É", "\xc3\x8d" => "Í", 
    "\xc3\x93" => "Ó", "\xc3\x9a" => "Ú", "\xc3\x91" => "Ñ",
    "\xc3\xbc" => "ü", "\xc3\x9c" => "Ü",
];

$fixedCount = 0;

foreach ($points as $point) {
    $id = $point['id'];
    $payload = $point['payload'] ?? [];
    $text = $payload['text'] ?? $payload['content'] ?? '';
    $type = $payload['type'] ?? '';
    
    if (empty($text)) continue;
    
    $originalText = $text;
    $fixedText = $text;
    
    // Aplicar correcciones CP437/Windows
    foreach ($cp437ToUtf8 as $wrong => $correct) {
        $fixedText = str_replace($wrong, $correct, $fixedText);
    }
    
    // Verificar si hubo cambios
    if ($fixedText !== $originalText) {
        echo "📝 Corrigiendo punto ID: $id ($type)\n";
        echo "   Antes:   " . substr($originalText, 0, 80) . "...\n";
        echo "   Después: " . substr($fixedText, 0, 80) . "...\n\n";
        
        // Actualizar payload
        if (isset($payload['text'])) {
            $payload['text'] = $fixedText;
        }
        if (isset($payload['content'])) {
            $payload['content'] = $fixedText;
        }
        
        // Regenerar embedding con el texto corregido
        echo "   🔄 Regenerando embedding...\n";
        $newEmbedding = generateEmbedding($fixedText);
        
        if ($newEmbedding) {
            // Actualizar el punto completo en Qdrant
            $updatePayload = [
                'points' => [
                    [
                        'id' => $id,
                        'vector' => $newEmbedding,
                        'payload' => $payload
                    ]
                ]
            ];
            
            $ch = curl_init("$qdrantHost/collections/$collectionName/points");
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_CUSTOMREQUEST => 'PUT',
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json; charset=utf-8',
                    "api-key: $apiKey"
                ],
                CURLOPT_POSTFIELDS => json_encode($updatePayload, JSON_UNESCAPED_UNICODE)
            ]);
            
            $updateResponse = curl_exec($ch);
            $updateResult = json_decode($updateResponse, true);
            curl_close($ch);
            
            if (isset($updateResult['status']) && $updateResult['status'] === 'ok') {
                echo "   ✅ Punto actualizado correctamente\n\n";
                $fixedCount++;
            } else {
                echo "   ❌ Error actualizando: " . json_encode($updateResult) . "\n\n";
            }
        } else {
            echo "   ⚠️ No se pudo generar embedding\n\n";
        }
    }
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "✅ CORRECCIÓN COMPLETADA\n";
echo "📊 Puntos corregidos: $fixedCount\n";

/**
 * Generar embedding usando OpenAI
 */
function generateEmbedding($text) {
    $openaiKey = getenv('OPENAI_API_KEY') ?: 'sk-proj-...'; // Reemplazar si es necesario
    
    // Leer de .env si existe
    $envPath = __DIR__ . '/.env';
    if (file_exists($envPath)) {
        $envContent = file_get_contents($envPath);
        if (preg_match('/OPENAI_API_KEY=(.+)/', $envContent, $matches)) {
            $openaiKey = trim($matches[1]);
        }
    }
    
    if (empty($openaiKey) || $openaiKey === 'sk-proj-...') {
        echo "   ⚠️ OPENAI_API_KEY no configurada\n";
        return null;
    }
    
    $ch = curl_init('https://api.openai.com/v1/embeddings');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            "Authorization: Bearer $openaiKey"
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'model' => 'text-embedding-3-small',
            'input' => $text
        ], JSON_UNESCAPED_UNICODE)
    ]);
    
    $response = curl_exec($ch);
    $result = json_decode($response, true);
    curl_close($ch);
    
    return $result['data'][0]['embedding'] ?? null;
}
