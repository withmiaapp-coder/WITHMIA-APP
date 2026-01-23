<?php
// Verificar documentos via API

$url = 'https://mia-app-production.up.railway.app/api/documents';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "=== DOCUMENTOS VIA API ===\n\n";
echo "HTTP Code: $httpCode\n\n";

$data = json_decode($response, true);

if (isset($data['data'])) {
    foreach ($data['data'] as $doc) {
        echo "📄 " . $doc['filename'] . "\n";
        echo "   Status: " . $doc['status'] . "\n";
        echo "   Categoría: " . ($doc['category'] ?? 'N/A') . "\n";
        if (isset($doc['metadata'])) {
            echo "   Caracteres: " . ($doc['metadata']['char_count'] ?? 'N/A') . "\n";
            echo "   Páginas: " . ($doc['metadata']['page_count'] ?? 'N/A') . "\n";
        }
        echo "\n";
    }
} else {
    echo "Response: " . substr($response, 0, 500) . "\n";
}
