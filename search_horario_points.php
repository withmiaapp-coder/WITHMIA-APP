<?php
/**
 * Buscar puntos que contengan "horario"
 */

$qdrantHost = 'https://qdrant-production-f4e7.up.railway.app';
$apiKey = 'qdrant_api_key_withmia_2024_secure';

$ch = curl_init("$qdrantHost/collections/company_withmia-nfudrg_knowledge/points/scroll");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ["api-key: $apiKey", 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['limit' => 100, 'with_payload' => true]),
    CURLOPT_SSL_VERIFYPEER => false
]);
$response = curl_exec($ch);
curl_close($ch);

$points = json_decode($response, true)['result']['points'] ?? [];

echo "Total puntos: " . count($points) . "\n\n";

echo "=== Buscando puntos con 'horario' o 'atencion' ===\n\n";

foreach ($points as $p) {
    $text = $p['payload']['text'] ?? '';
    $type = $p['payload']['type'] ?? 'unknown';
    
    if (stripos($text, 'horario') !== false || stripos($text, 'atencion') !== false) {
        echo "📌 ID: " . $p['id'] . "\n";
        echo "🏷️  Type: $type\n";
        echo "📝 Text: $text\n";
        echo "────────────────────────────\n\n";
    }
}

echo "\n=== Ultimos 3 puntos de tipo 'training_message' ===\n\n";
$trainingMessages = array_filter($points, function($p) {
    return ($p['payload']['type'] ?? '') === 'training_message';
});

foreach (array_slice($trainingMessages, -3) as $p) {
    echo "📌 ID: " . $p['id'] . "\n";
    echo "📝 Text: " . ($p['payload']['text'] ?? 'N/A') . "\n";
    echo "────────────────────────────\n\n";
}
