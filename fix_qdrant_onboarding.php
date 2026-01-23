<?php
/**
 * Ver la company creada y re-insertar su información en Qdrant
 */

require 'vendor/autoload.php';

$host = 'switchyard.proxy.rlwy.net';
$port = '28796';
$user = 'postgres';
$password = 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw';

$pdo = new PDO("pgsql:host=$host;port=$port;dbname=railway", $user, $password);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== COMPANY DEL ONBOARDING ===\n\n";

$stmt = $pdo->query('SELECT id, slug, name, description, assistant_name, website, client_type, settings FROM companies ORDER BY id DESC LIMIT 1');
$company = $stmt->fetch(PDO::FETCH_ASSOC);

echo "ID: {$company['id']}\n";
echo "Slug: {$company['slug']}\n";
echo "Company Name: {$company['name']}\n";
echo "Assistant Name: {$company['assistant_name']}\n";
echo "Website: {$company['website']}\n";
echo "Client Type: {$company['client_type']}\n";
echo "Description: " . substr($company['description'] ?? '', 0, 200) . "\n";
echo "\nSettings: " . $company['settings'] . "\n";

// Preparar texto para vectorizar
$companyInfoParts = [];

if (!empty($company['assistant_name'])) {
    $companyInfoParts[] = "Nombre del Asistente: {$company['assistant_name']}";
}

if (!empty($company['name'])) {
    $companyInfoParts[] = "Nombre de la Empresa: {$company['name']}";
}

if (!empty($company['website'])) {
    $companyInfoParts[] = "Sitio Web: {$company['website']}";
}

if (!empty($company['description'])) {
    $companyInfoParts[] = "Descripción de la Empresa: {$company['description']}";
}

if (!empty($company['client_type'])) {
    $clientTypeText = $company['client_type'] === 'interno' ? 'Interno' : 'Externo - Para tus clientes finales';
    $companyInfoParts[] = "Tipo de Cliente: {$clientTypeText}";
}

echo "\n=== TEXTO PARA VECTORIZAR ===\n";
$companyInfoText = implode("\n\n", $companyInfoParts);
echo $companyInfoText . "\n";

// Ahora vamos a insertar en Qdrant
echo "\n=== INSERTANDO EN QDRANT ===\n";

// Parsear settings para obtener el nombre de la colección
$settings = json_decode($company['settings'], true) ?? [];
$collectionName = $settings['qdrant_collection'] ?? 'company_' . $company['slug'] . '_knowledge';

echo "Colección: $collectionName\n";

// Generar embedding con OpenAI
$openaiKey = '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';

$client = new \GuzzleHttp\Client([
    'verify' => false // Deshabilitar SSL para ejecución local
]);

echo "\n1. Generando embedding...\n";
$embeddingResponse = $client->post('https://api.openai.com/v1/embeddings', [
    'headers' => [
        'Authorization' => 'Bearer ' . $openaiKey,
        'Content-Type' => 'application/json',
    ],
    'json' => [
        'input' => $companyInfoText,
        'model' => 'text-embedding-3-small',
    ]
]);

$embeddingData = json_decode($embeddingResponse->getBody()->getContents(), true);
$embedding = $embeddingData['data'][0]['embedding'];
echo "   ✅ Embedding generado (dimensión: " . count($embedding) . ")\n";

// Insertar en Qdrant
$qdrantUrl = 'https://qdrant-production-f4e7.up.railway.app';

echo "\n2. Insertando punto en Qdrant...\n";

$pointId = intval($company['id']); // Usar ID numérico de la company

$response = $client->put("$qdrantUrl/collections/$collectionName/points", [
    'json' => [
        'points' => [
            [
                'id' => $pointId,
                'vector' => $embedding,
                'payload' => [
                    'text' => $companyInfoText,
                    'source' => 'company_onboarding',
                    'type' => 'company_information',
                    'company_id' => $company['id'],
                    'created_at' => date('c'),
                ]
            ]
        ]
    ],
    'headers' => [
        'Content-Type' => 'application/json'
    ]
]);

$result = json_decode($response->getBody()->getContents(), true);

if (isset($result['status']) && $result['status'] === 'ok') {
    echo "   ✅ Punto insertado correctamente (ID: $pointId)\n";
} else {
    echo "   ❌ Error: " . json_encode($result) . "\n";
}

echo "\n=== VERIFICANDO ===\n";
$checkResponse = $client->post("$qdrantUrl/collections/$collectionName/points/scroll", [
    'json' => [
        'limit' => 10,
        'with_payload' => true,
        'with_vector' => false
    ]
]);

$points = json_decode($checkResponse->getBody()->getContents(), true);
$pointCount = count($points['result']['points'] ?? []);
echo "Puntos en la colección: $pointCount\n";

foreach ($points['result']['points'] ?? [] as $point) {
    echo "\n  📌 Punto ID: {$point['id']}\n";
    echo "     Tipo: " . ($point['payload']['type'] ?? 'N/A') . "\n";
    echo "     Texto: " . substr($point['payload']['text'] ?? $point['payload']['content'] ?? '', 0, 100) . "...\n";
}

echo "\n✅ Completado\n";
