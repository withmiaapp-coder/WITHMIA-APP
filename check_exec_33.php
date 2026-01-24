<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');

// Obtener ejecución #33
$stmt = $pdo->query('SELECT e.id, e.status, ed.data FROM n8n.execution_entity e LEFT JOIN n8n.execution_data ed ON e.id = ed."executionId" WHERE e.id = 33');
$exec = $stmt->fetch(PDO::FETCH_ASSOC);

echo "=== Ejecución #33 ===\n";
echo "Status: " . $exec['status'] . "\n\n";

// Decodificar datos
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

// Input
if (isset($resolved['resultData']['runData']['Webhook Training Chat'][0]['data']['main'][0][0]['json']['body'])) {
    $input = $resolved['resultData']['runData']['Webhook Training Chat'][0]['data']['main'][0][0]['json']['body'];
    echo "📥 INPUT:\n";
    echo "- user_message: " . ($input['user_message'] ?? 'N/A') . "\n\n";
}

// Should Save decision
if (isset($resolved['resultData']['runData']['Should Save?'][0]['data']['main'][0][0]['json'])) {
    $save = $resolved['resultData']['runData']['Should Save?'][0]['data']['main'][0][0]['json'];
    echo "💾 DECISIÓN:\n";
    echo "- should_save: " . ($save['should_save'] ? 'true' : 'false') . "\n";
    echo "- text_to_save: " . ($save['text_to_save'] ?? 'N/A') . "\n\n";
}

// Store in Qdrant result
if (isset($resolved['resultData']['runData']['Store in Qdrant'][0]['data']['main'][0][0]['json'])) {
    $qdrant = $resolved['resultData']['runData']['Store in Qdrant'][0]['data']['main'][0][0]['json'];
    echo "✅ QDRANT RESPONSE:\n";
    echo json_encode($qdrant, JSON_PRETTY_PRINT) . "\n\n";
}

// Prepare Qdrant Point - para ver el ID guardado
if (isset($resolved['resultData']['runData']['Prepare Qdrant Point'][0]['data']['main'][0][0]['json'])) {
    $point = $resolved['resultData']['runData']['Prepare Qdrant Point'][0]['data']['main'][0][0]['json'];
    echo "📍 PUNTO GUARDADO:\n";
    echo "- ID: " . ($point['id'] ?? 'N/A') . "\n";
    echo "- collection: " . ($point['collection_name'] ?? 'N/A') . "\n";
    if (isset($point['payload'])) {
        echo "- payload.text: " . substr($point['payload']['text'] ?? '', 0, 100) . "...\n";
    }
}
