<?php
/**
 * Ver contenido completo de los puntos en Qdrant
 */

$qdrantHost = 'https://qdrant-production-f4e7.up.railway.app';
$collectionName = 'company_withmia-rzmpsq_knowledge';

// Obtener todos los puntos con payload completo
$ch = curl_init("$qdrantHost/collections/$collectionName/points/scroll");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'api-key: qdrant_api_key_withmia_2024_secure'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'limit' => 10,
    'with_payload' => true,
    'with_vector' => false
]));

$response = curl_exec($ch);
$result = json_decode($response, true);

echo "=== CONTENIDO COMPLETO DE QDRANT ===\n\n";

foreach ($result['result']['points'] ?? [] as $point) {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "📌 ID: {$point['id']}\n";
    
    $payload = $point['payload'] ?? [];
    
    echo "📁 Tipo: " . ($payload['type'] ?? 'N/A') . "\n";
    echo "📄 Archivo: " . ($payload['filename'] ?? 'N/A') . "\n";
    echo "📂 Categoría: " . ($payload['category'] ?? 'N/A') . "\n";
    echo "🔢 Chunk: " . ($payload['chunk_index'] ?? 'N/A') . " de " . ($payload['total_chunks'] ?? 'N/A') . "\n";
    
    $text = $payload['text'] ?? $payload['content'] ?? '';
    $textLength = strlen($text);
    
    echo "📏 Longitud texto: $textLength caracteres\n";
    echo "\n📝 TEXTO COMPLETO:\n";
    echo "─────────────────────────────────────────────────────────────\n";
    echo $text . "\n";
    echo "─────────────────────────────────────────────────────────────\n\n";
}
