<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');

// Obtener ejecución #33 - buscar el qdrant_host usado
$stmt = $pdo->query('SELECT ed.data FROM n8n.execution_entity e LEFT JOIN n8n.execution_data ed ON e.id = ed."executionId" WHERE e.id = 33');
$exec = $stmt->fetch(PDO::FETCH_ASSOC);

$parts = json_decode($exec['data'], true);

function resolveRefs($data, &$parts) {
    if (is_string($data) && ctype_digit($data)) {
        $idx = (int)$data;
        if (isset($parts[$idx])) return resolveRefs($parts[$idx], $parts);
    }
    if (is_array($data)) {
        $result = [];
        foreach ($data as $key => $value) $result[$key] = resolveRefs($value, $parts);
        return $result;
    }
    return $data;
}

$resolved = resolveRefs($parts[0], $parts);

// Ver qué qdrant_host se usó
if (isset($resolved['resultData']['runData']['Prepare Training Data'][0]['data']['main'][0][0]['json'])) {
    $prep = $resolved['resultData']['runData']['Prepare Training Data'][0]['data']['main'][0][0]['json'];
    echo "=== Configuración usada ===\n";
    echo "qdrant_host: " . ($prep['qdrant_host'] ?? 'N/A') . "\n";
    echo "collection_name: " . ($prep['collection_name'] ?? 'N/A') . "\n\n";
}

// Ver el request que se hizo a Qdrant
if (isset($resolved['resultData']['runData']['Store in Qdrant'][0]['data']['main'][0][0]['json'])) {
    $store = $resolved['resultData']['runData']['Store in Qdrant'][0]['data']['main'][0][0]['json'];
    echo "=== Respuesta de Store in Qdrant ===\n";
    echo json_encode($store, JSON_PRETTY_PRINT) . "\n";
}

// También revisar el input del webhook
if (isset($resolved['resultData']['runData']['Webhook Training Chat'][0]['data']['main'][0][0]['json']['body'])) {
    $body = $resolved['resultData']['runData']['Webhook Training Chat'][0]['data']['main'][0][0]['json']['body'];
    echo "\n=== Body del Webhook ===\n";
    echo "qdrant_host enviado: " . ($body['qdrant_host'] ?? 'N/A') . "\n";
}
