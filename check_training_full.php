<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Obtener la última ejecución del Training Chat
$stmt = $pdo->query('
    SELECT 
        e.id, 
        e."workflowId", 
        e.status, 
        e."startedAt", 
        e."stoppedAt",
        ed.data,
        w.name as workflow_name
    FROM n8n.execution_entity e
    LEFT JOIN n8n.execution_data ed ON e.id = ed."executionId"
    LEFT JOIN n8n.workflow_entity w ON e."workflowId" = w.id
    WHERE w.name LIKE \'%Training%\'
    ORDER BY e.id DESC 
    LIMIT 1
');
$exec = $stmt->fetch(PDO::FETCH_ASSOC);

echo "=== Última ejecución de Training Chat (ID: {$exec['id']}) ===\n";
echo "Status: " . $exec['status'] . "\n";
echo "Started: " . $exec['startedAt'] . "\n";
echo "Stopped: " . $exec['stoppedAt'] . "\n\n";

// El formato de n8n es un array especial: [referencias, objeto1, objeto2, ...]
// Donde las referencias usan "1", "2", etc. para apuntar a los objetos
$rawData = $exec['data'];
$parts = json_decode($rawData, true);

if (!is_array($parts) || count($parts) < 2) {
    echo "Formato inesperado\n";
    exit;
}

// Función para resolver referencias
function resolveRefs($data, &$parts) {
    if (is_string($data) && ctype_digit($data)) {
        $idx = (int)$data;
        if (isset($parts[$idx])) {
            return resolveRefs($parts[$idx], $parts);
        }
    }
    if (is_array($data)) {
        $result = [];
        foreach ($data as $key => $value) {
            $result[$key] = resolveRefs($value, $parts);
        }
        return $result;
    }
    return $data;
}

$resolved = resolveRefs($parts[0], $parts);

echo "=== Nodos ejecutados ===\n";
if (isset($resolved['resultData']['runData'])) {
    foreach ($resolved['resultData']['runData'] as $nodeName => $nodeData) {
        $status = $nodeData[0]['executionStatus'] ?? 'N/A';
        echo "✓ $nodeName: $status\n";
    }
}

echo "\n=== Detalles del flujo ===\n";

// Input del webhook
if (isset($resolved['resultData']['runData']['Webhook Training Chat'][0]['data']['main'][0][0]['json'])) {
    echo "\n📥 INPUT (Webhook):\n";
    $input = $resolved['resultData']['runData']['Webhook Training Chat'][0]['data']['main'][0][0]['json'];
    echo json_encode($input, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
}

// Respuesta del OpenAI
if (isset($resolved['resultData']['runData']['Call OpenAI Chat'][0]['data']['main'][0][0]['json'])) {
    echo "\n🤖 RESPUESTA OpenAI:\n";
    $response = $resolved['resultData']['runData']['Call OpenAI Chat'][0]['data']['main'][0][0]['json'];
    if (isset($response['message']['content'])) {
        echo $response['message']['content'] . "\n";
    } else {
        echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    }
}

// Resultado del Search Qdrant
if (isset($resolved['resultData']['runData']['Search Qdrant Context'][0]['data']['main'][0])) {
    echo "\n📚 CONTEXTO (Search Qdrant):\n";
    $qdrantResults = $resolved['resultData']['runData']['Search Qdrant Context'][0]['data']['main'][0];
    echo "Resultados encontrados: " . count($qdrantResults) . "\n";
}

// Output final
if (isset($resolved['resultData']['runData']['Process Response'][0]['data']['main'][0][0]['json'])) {
    echo "\n📤 OUTPUT FINAL:\n";
    $output = $resolved['resultData']['runData']['Process Response'][0]['data']['main'][0][0]['json'];
    echo json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
}

// Si hubo un save
if (isset($resolved['resultData']['runData']['Should Save?'][0]['data']['main'][0][0]['json'])) {
    echo "\n💾 DECISIÓN DE GUARDADO:\n";
    $saveDecision = $resolved['resultData']['runData']['Should Save?'][0]['data']['main'][0][0]['json'];
    echo json_encode($saveDecision, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
}

if (isset($resolved['resultData']['runData']['Upsert in Qdrant'])) {
    echo "\n✅ Se guardó en Qdrant!\n";
}
