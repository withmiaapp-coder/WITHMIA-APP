<?php
// Verificar puntos en Qdrant
$qdrantHost = 'https://qdrant-production-f4e7.up.railway.app';
$collection = 'company_withmia-rzmpsq_knowledge';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "$qdrantHost/collections/$collection/points/scroll");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'limit' => 20,
    'with_payload' => true,
    'with_vector' => false
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
$points = $data['result']['points'] ?? [];

echo "=== Puntos en Qdrant ($collection) ===\n";
echo "Total encontrados: " . count($points) . "\n\n";

foreach ($points as $point) {
    $id = $point['id'];
    $text = $point['payload']['text'] ?? 'N/A';
    $type = $point['payload']['type'] ?? 'N/A';
    $updated = $point['payload']['updated_at'] ?? 'N/A';
    
    echo "📍 ID: $id\n";
    echo "   Type: $type\n";
    echo "   Updated: $updated\n";
    echo "   Text: " . substr($text, 0, 80) . (strlen($text) > 80 ? '...' : '') . "\n";
    echo "   ---\n";
}

// Buscar específicamente el texto de la ejecución #33
echo "\n=== Buscando 'Atendemos de 9 a 7 pm' ===\n";
$found = false;
foreach ($points as $point) {
    $text = $point['payload']['text'] ?? '';
    if (stripos($text, 'Atendemos de 9 a 7') !== false || stripos($text, '9 a 7 pm') !== false) {
        echo "✅ ENCONTRADO!\n";
        echo "   ID: " . $point['id'] . "\n";
        echo "   Text: $text\n";
        $found = true;
    }
}
if (!$found) {
    echo "❌ No encontrado con búsqueda de texto\n";
}
