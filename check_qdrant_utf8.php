<?php
/**
 * Script para verificar la codificación UTF-8 en Qdrant
 */

$qdrantHost = 'https://qdrant-production-f4e7.up.railway.app';
$qdrantApiKey = 'qdrant_api_key_withmia_2024_secure';
$collection = 'company_withmia-nfudrg_knowledge';

$ch = curl_init("$qdrantHost/collections/$collection/points/scroll");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "api-key: $qdrantApiKey",
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'limit' => 5,
        'with_payload' => true,
        'with_vector' => false
    ])
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    echo "Error HTTP: $httpCode\n";
    exit(1);
}

$data = json_decode($response, true);
$points = $data['result']['points'] ?? [];

echo "=== Verificación UTF-8 en Qdrant ===\n";
echo "Colección: $collection\n";
echo "Puntos encontrados: " . count($points) . "\n\n";

// Caracteres problemáticos de mojibake
$mojibakePatterns = [
    'Ã¡' => 'á (a con acento)',
    'Ã©' => 'é (e con acento)', 
    'Ã­' => 'í (i con acento)',
    'Ã³' => 'ó (o con acento)',
    'Ãº' => 'ú (u con acento)',
    'Ã±' => 'ñ (eñe)',
    'Ã' => 'Posible mojibake'
];

$hasProblems = false;

foreach ($points as $i => $point) {
    $text = $point['payload']['text'] ?? '';
    $id = $point['id'];
    
    echo "--- Punto #" . ($i + 1) . " (ID: $id) ---\n";
    echo "Texto (primeros 300 chars):\n";
    echo mb_substr($text, 0, 300, 'UTF-8') . "...\n\n";
    
    // Verificar mojibake
    foreach ($mojibakePatterns as $pattern => $desc) {
        if (strpos($text, $pattern) !== false) {
            echo "⚠️  MOJIBAKE DETECTADO: '$pattern' -> debería ser $desc\n";
            $hasProblems = true;
        }
    }
    
    // Verificar que SÍ tiene caracteres españoles correctos
    $correctChars = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ñ'];
    $foundCorrect = [];
    foreach ($correctChars as $char) {
        if (mb_strpos($text, $char, 0, 'UTF-8') !== false) {
            $foundCorrect[] = $char;
        }
    }
    
    if (!empty($foundCorrect)) {
        echo "✅ Caracteres españoles correctos encontrados: " . implode(', ', $foundCorrect) . "\n";
    }
    
    echo "\n";
}

echo "=== RESUMEN ===\n";
if ($hasProblems) {
    echo "❌ SE DETECTARON PROBLEMAS DE CODIFICACIÓN (MOJIBAKE)\n";
} else {
    echo "✅ NO SE DETECTARON PROBLEMAS DE MOJIBAKE\n";
    echo "Los datos están correctamente codificados en UTF-8\n";
}
