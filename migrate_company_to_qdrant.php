<?php
/**
 * Migrar información de empresa a Qdrant (para empresas que completaron onboarding antes del update)
 */

require __DIR__.'/vendor/autoload.php';

// Configuración
$qdrantHost = 'https://qdrant-production-f4e7.up.railway.app';
$openaiApiKey = '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';

echo "=== MIGRANDO INFORMACIÓN DE EMPRESA A QDRANT ===\n\n";

// 1. Obtener datos de la empresa desde Railway
$pdo = new PDO(
    'pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=railway',
    'postgres',
    'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$stmt = $pdo->prepare("SELECT * FROM companies WHERE slug = ?");
$stmt->execute(['withmia-nobhoe']);
$company = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$company) {
    die("❌ Empresa no encontrada\n");
}

echo "1️⃣  Empresa encontrada:\n";
echo "   Nombre: {$company['name']}\n";
echo "   Slug: {$company['slug']}\n";
echo "   Asistente: {$company['assistant_name']}\n";
echo "   Website: {$company['website']}\n";
echo "   Descripción: " . substr($company['description'] ?? '', 0, 80) . "...\n\n";

$client = new \GuzzleHttp\Client(['timeout' => 30, 'verify' => false]);

// 2. Verificar/crear colección con nombre nuevo
$collectionName = 'knowledge_' . $company['slug'];
echo "2️⃣  Verificando colección: {$collectionName}\n";

try {
    $response = $client->get("{$qdrantHost}/collections/{$collectionName}");
    echo "   ✅ Colección existe\n\n";
} catch (\Exception $e) {
    echo "   ⚠️  Colección no existe, creando...\n";
    
    $client->put("{$qdrantHost}/collections/{$collectionName}", [
        'json' => [
            'vectors' => [
                'size' => 1536,
                'distance' => 'Cosine'
            ]
        ]
    ]);
    
    echo "   ✅ Colección creada\n\n";
}

// 3. Preparar contenido para embedding
$companyInfo = sprintf(
    "Información de la empresa:\n\n" .
    "Nombre del asistente: %s\n" .
    "Nombre de la empresa: %s\n" .
    "Sitio web: %s\n" .
    "Descripción: %s\n" .
    "Tipo de cliente: %s",
    $company['assistant_name'] ?? 'MIA',
    $company['name'] ?? 'Sin nombre',
    $company['website'] ?? 'Sin sitio web',
    $company['description'] ?? 'Sin descripción',
    $company['client_type'] ?? 'Cliente externo'
);

echo "3️⃣  Generando embedding del contenido...\n";
echo "   Contenido:\n";
echo "   ---\n";
foreach (explode("\n", $companyInfo) as $line) {
    echo "   {$line}\n";
}
echo "   ---\n\n";

// 4. Generar embedding con OpenAI
$embeddingResponse = $client->post('https://api.openai.com/v1/embeddings', [
    'headers' => [
        'Authorization' => 'Bearer ' . $openaiApiKey,
        'Content-Type' => 'application/json'
    ],
    'json' => [
        'model' => 'text-embedding-3-small',
        'input' => $companyInfo
    ]
]);

$embeddingData = json_decode($embeddingResponse->getBody()->getContents(), true);
$embedding = $embeddingData['data'][0]['embedding'];

echo "4️⃣  Embedding generado (dimensión: " . count($embedding) . ")\n\n";

// 5. Insertar punto con ID UUID
$pointId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
    mt_rand(0, 0xffff), mt_rand(0, 0xffff),
    mt_rand(0, 0xffff),
    mt_rand(0, 0x0fff) | 0x4000,
    mt_rand(0, 0x3fff) | 0x8000,
    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
);

// Guardar el ID para referencias futuras
$companyInfoPointId = $pointId;

echo "5️⃣  Insertando información de empresa en Qdrant...\n";
echo "   Point ID: {$pointId}\n";

$upsertResponse = $client->put("{$qdrantHost}/collections/{$collectionName}/points", [
    'json' => [
        'points' => [[
            'id' => $pointId,
            'vector' => $embedding,
            'payload' => [
                'content' => $companyInfo,
                'type' => 'company_info',
                'company_id' => (int)$company['id'],
                'company_slug' => $company['slug'],
                'assistant_name' => $company['assistant_name'] ?? 'MIA',
                'company_name' => $company['name'] ?? '',
                'website' => $company['website'] ?? '',
                'description' => $company['description'] ?? '',
                'client_type' => $company['client_type'] ?? 'external',
                'created_at' => date('c'),
                'source' => 'onboarding_migration'
            ]
        ]]
    ]
]);

echo "   ✅ Información insertada exitosamente!\n\n";

// 6. Migrar puntos de la colección antigua (si existe)
$oldCollectionName = 'company_' . $company['slug'] . '_knowledge';
echo "6️⃣  Verificando colección antigua: {$oldCollectionName}\n";

try {
    $oldResponse = $client->get("{$qdrantHost}/collections/{$oldCollectionName}");
    $oldData = json_decode($oldResponse->getBody()->getContents(), true);
    $oldPointsCount = $oldData['result']['points_count'] ?? 0;
    
    echo "   ✅ Colección antigua encontrada con {$oldPointsCount} puntos\n";
    
    if ($oldPointsCount > 0) {
        echo "   🔄 Migrando puntos a la nueva colección...\n";
        
        // Obtener todos los puntos
        $scrollResponse = $client->post("{$qdrantHost}/collections/{$oldCollectionName}/points/scroll", [
            'json' => [
                'limit' => 100,
                'with_payload' => true,
                'with_vector' => true
            ]
        ]);
        
        $scrollData = json_decode($scrollResponse->getBody()->getContents(), true);
        $oldPoints = $scrollData['result']['points'] ?? [];
        
        foreach ($oldPoints as $point) {
            $newPointId = 'migrated_' . (is_string($point['id']) ? $point['id'] : 'point_' . rand(1000, 9999));
            
            $client->put("{$qdrantHost}/collections/{$collectionName}/points", [
                'json' => [
                    'points' => [[
                        'id' => $newPointId,
                        'vector' => $point['vector'],
                        'payload' => array_merge($point['payload'] ?? [], [
                            'migrated_from' => $oldCollectionName,
                            'migrated_at' => date('c')
                        ])
                    ]]
                ]
            ]);
            
            echo "      ✅ Migrado: {$newPointId}\n";
        }
        
        echo "\n   ✅ {$oldPointsCount} puntos migrados\n";
    }
} catch (\Exception $e) {
    echo "   ℹ️  No hay colección antigua para migrar\n";
}

echo "\n";

// 7. Verificar resultado final
echo "7️⃣  Verificación final:\n";

$verifyResponse = $client->post("{$qdrantHost}/collections/{$collectionName}/points/scroll", [
    'json' => [
        'limit' => 10,
        'with_payload' => true,
        'with_vector' => false
    ]
]);

$verifyData = json_decode($verifyResponse->getBody()->getContents(), true);
$points = $verifyData['result']['points'] ?? [];

echo "   Puntos en {$collectionName}: " . count($points) . "\n\n";

foreach ($points as $index => $point) {
    $type = $point['payload']['type'] ?? 'unknown';
    $content = substr($point['payload']['content'] ?? $point['payload']['text'] ?? '', 0, 60);
    echo "   " . ($index + 1) . ". [{$type}] {$point['id']}\n";
    echo "      {$content}...\n\n";
}

echo "✅ ¡MIGRACIÓN COMPLETADA!\n\n";
echo "📋 Resumen:\n";
echo "   • Colección nueva: {$collectionName}\n";
echo "   • Información de empresa insertada como punto #1\n";
echo "   • Puntos antiguos migrados (si existían)\n\n";
