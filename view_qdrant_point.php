<?php
/**
 * Ver contenido completo del punto en Qdrant
 */

$qdrantUrl = 'https://qdrant-production-f4e7.up.railway.app';
$ctx = stream_context_create([
    'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
    'http' => ['timeout' => 10]
]);

// Obtener colecciones
$response = @file_get_contents("$qdrantUrl/collections", false, $ctx);
$data = json_decode($response, true);
$collectionName = $data['result']['collections'][0]['name'] ?? null;

if (!$collectionName) {
    echo "No hay colecciones en Qdrant\n";
    exit;
}

// Obtener puntos
$ch = curl_init("$qdrantUrl/collections/$collectionName/points/scroll");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode(['limit' => 10, 'with_payload' => true]),
    CURLOPT_SSL_VERIFYPEER => false
]);
$response = json_decode(curl_exec($ch), true);
curl_close($ch);

echo "=== CONTENIDO COMPLETO DEL PUNTO EN QDRANT ===\n\n";
echo "Colección: $collectionName\n\n";

foreach ($response['result']['points'] as $point) {
    echo "📌 Punto ID: " . $point['id'] . "\n";
    echo "----------------------------------------\n";
    echo "📝 TEXTO ALMACENADO:\n";
    echo "────────────────────────────────────────\n";
    echo $point['payload']['text'] . "\n";
    echo "────────────────────────────────────────\n\n";
    echo "📋 METADATA:\n";
    echo "   • Source: " . $point['payload']['source'] . "\n";
    echo "   • Type: " . $point['payload']['type'] . "\n";
    echo "   • Company ID: " . $point['payload']['company_id'] . "\n";
    echo "   • Created: " . $point['payload']['created_at'] . "\n";
}
