<?php
// FIX DEFINITIVO: Modificar el nodo Prepare Qdrant Point para que 
// revise should_save y retorne vacío si es false

$n8nHost = 'https://n8n-production-00dd.up.railway.app';
$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Mjk3OTc3fQ.aCNw5pXWbnyy_JDk24TsYN69T61acaEqoELhrtNtlI0';
$workflowId = 'hAcgcsEzezBJ2HrO';

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => "X-N8N-API-KEY: $apiKey\r\nContent-Type: application/json\r\n"
    ]
]);

$response = file_get_contents("$n8nHost/api/v1/workflows/$workflowId", false, $context);
$workflow = json_decode($response, true);

if (!$workflow) {
    die("Failed to get workflow\n");
}

echo "Got workflow: {$workflow['name']}\n";

// New code for Prepare Qdrant Point that checks should_save
$newPrepareCode = <<<'JSCODE'
// Get data from Process Response (not Should Save?)
const processData = $('Process Response').first().json;

// ⚠️ CRITICAL: Check if we should actually save
if (processData.should_save === false) {
  // Return empty to skip storing
  return [];
}

const embedding = $input.first().json.data[0].embedding;
const timestamp = new Date().toISOString();
const dedup = processData.deduplication || {};
const action = dedup.action || 'create';
const pointId = dedup.point_id || Date.now();

const userMsg = processData.user_message || '';
const knowledgeText = userMsg.trim();

return {
  json: {
    collection_name: processData.collection_name,
    qdrant_host: processData.qdrant_host,
    action: action,
    point: {
      id: pointId,
      vector: embedding,
      payload: {
        text: knowledgeText,
        content: knowledgeText,
        type: 'training_message',
        category: 'entrenamiento',
        company_slug: processData.company_slug,
        action: action,
        similarity: dedup.similarity || 0,
        last_updated: timestamp
      }
    }
  }
};
JSCODE;

// Find and update Prepare Qdrant Point node
foreach ($workflow['nodes'] as $i => $node) {
    if ($node['name'] === 'Prepare Qdrant Point') {
        echo "Found Prepare Qdrant Point at index $i\n";
        $workflow['nodes'][$i]['parameters']['jsCode'] = $newPrepareCode;
        echo "Updated code to check should_save and return [] if false\n";
        break;
    }
}

// Update
$update = [
    'name' => $workflow['name'],
    'nodes' => $workflow['nodes'],
    'connections' => $workflow['connections'],
    'settings' => $workflow['settings'] ?? (object)[]
];

$putContext = stream_context_create([
    'http' => [
        'method' => 'PUT',
        'header' => "X-N8N-API-KEY: $apiKey\r\nContent-Type: application/json\r\n",
        'content' => json_encode($update),
        'ignore_errors' => true
    ]
]);

$result = file_get_contents("$n8nHost/api/v1/workflows/$workflowId", false, $putContext);
$decoded = json_decode($result, true);

if (isset($decoded['id'])) {
    echo "\n✅ Workflow updated!\n";
    echo "Now 'Prepare Qdrant Point' will return [] when should_save is false\n";
} else {
    echo "\n❌ Error: $result\n";
}
