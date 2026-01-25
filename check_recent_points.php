<?php
/**
 * Ver los puntos más recientes en Qdrant
 */

$qdrantHost = 'https://qdrant-production-f4e7.up.railway.app';
$apiKey = 'qdrant_api_key_withmia_2024_secure';

$scrollData = ['limit' => 100, 'with_payload' => true];

$ch = curl_init("$qdrantHost/collections/company_withmia-nfudrg_knowledge/points/scroll");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ["api-key: $apiKey", 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($scrollData),
    CURLOPT_SSL_VERIFYPEER => false
]);
$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true)['result'] ?? [];
$points = $result['points'] ?? [];

echo "📊 Total puntos en Qdrant: " . count($points) . "\n\n";

// Ordenar por fecha si es posible
usort($points, function($a, $b) {
    $dateA = $a['payload']['created_at'] ?? '1970-01-01';
    $dateB = $b['payload']['created_at'] ?? '1970-01-01';
    return strcmp($dateB, $dateA); // Más recientes primero
});

// Mostrar los 5 más recientes
echo "🕐 ÚLTIMOS 5 PUNTOS (más recientes primero):\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

$recentPoints = array_slice($points, 0, 5);
foreach ($recentPoints as $i => $point) {
    $text = $point['payload']['text'] ?? '';
    $source = $point['payload']['source'] ?? 'unknown';
    $created = $point['payload']['created_at'] ?? 'N/A';
    $type = $point['payload']['type'] ?? 'unknown';
    
    echo "📌 Punto #" . ($i + 1) . " (ID: " . $point['id'] . ")\n";
    echo "   📅 Creado: $created\n";
    echo "   📂 Source: $source\n";
    echo "   🏷️  Type: $type\n";
    echo "   📝 Texto:\n";
    echo "   ────────────────────────────────────────\n";
    
    // Mostrar texto con indentación
    $lines = explode("\n", substr($text, 0, 500));
    foreach ($lines as $line) {
        echo "   " . $line . "\n";
    }
    
    echo "\n   ────────────────────────────────────────\n";
    
    // Verificar si tiene mojibake
    $hasMojibake = preg_match('/Ã[¡©­³º±¼]/', $text);
    if ($hasMojibake) {
        echo "   ⚠️  ALERTA: Este punto TIENE mojibake\n";
    } else {
        echo "   ✅ Encoding OK (sin mojibake detectado)\n";
    }
    
    echo "\n";
}
