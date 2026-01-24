<?php
/**
 * Script para ver los últimos puntos en Qdrant con detalle de encoding
 */

$qdrantUrl = 'https://qdrant-production-f4e7.up.railway.app';
$qdrantApiKey = 'qdrant_api_key_withmia_2024_secure';
$collection = 'company_withmia-rzmpsq_knowledge';

// Obtener todos los puntos
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => "{$qdrantUrl}/collections/{$collection}/points/scroll",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'api-key: ' . $qdrantApiKey
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'limit' => 50,
        'with_payload' => true,
        'with_vector' => false
    ])
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    echo "Error: HTTP $httpCode\n";
    exit(1);
}

$data = json_decode($response, true);
$points = $data['result']['points'] ?? [];

// Filtrar solo training_message y ordenar por ID (timestamp)
$trainingPoints = array_filter($points, function($p) {
    return ($p['payload']['type'] ?? '') === 'training_message';
});

// Ordenar por ID descendente (más reciente primero)
usort($trainingPoints, function($a, $b) {
    return $b['id'] <=> $a['id'];
});

echo "=== ÚLTIMOS TRAINING MESSAGES EN QDRANT ===\n\n";
echo "Total training_message: " . count($trainingPoints) . "\n\n";

$count = 0;
foreach ($trainingPoints as $point) {
    if ($count >= 5) break;
    $count++;
    
    $id = $point['id'];
    $text = $point['payload']['text'] ?? '';
    $content = $point['payload']['content'] ?? '';
    
    echo "--- Punto #$count ---\n";
    echo "ID: $id\n";
    echo "Text length: " . strlen($text) . "\n";
    echo "Content length: " . strlen($content) . "\n";
    
    // Mostrar primeros 200 caracteres del texto
    $preview = mb_substr($text ?: $content, 0, 200);
    echo "Preview: $preview\n";
    
    // Mostrar hex de primeros 100 bytes
    $hexPreview = bin2hex(substr($text ?: $content, 0, 100));
    echo "HEX (first 100 bytes): $hexPreview\n";
    
    // Buscar el carácter de replacement
    if (strpos($text, "\xEF\xBF\xBD") !== false || strpos($content, "\xEF\xBF\xBD") !== false) {
        echo "⚠️ CONTIENE REPLACEMENT CHARACTER (U+FFFD)!\n";
    }
    
    echo "\n";
}
