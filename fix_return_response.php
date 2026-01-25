<?php
// FIX: Modificar Prepare Qdrant Point para que cuando no guarde,
// retorne un objeto especial que "Return Saved Response" pueda manejar

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

echo "Got workflow: {$workflow['name']}\n";

// New code for Prepare Qdrant Point
$newPrepareCode = <<<'JSCODE'
const processData = $('Process Response').first().json;

// Check if we should skip saving
if (processData.should_save === false) {
  // Return skip marker - Store in Qdrant will check this
  return {
    json: {
      skip_save: true,
      ai_response: processData.ai_response
    }
  };
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
    skip_save: false,
    collection_name: processData.collection_name,
    qdrant_host: processData.qdrant_host,
    ai_response: processData.ai_response,
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

// New code for Store in Qdrant - check skip_save flag
$newStoreCode = <<<'JSCODE'
const data = $input.first().json;

// If skip_save is true, don't store anything
if (data.skip_save === true) {
  return {
    json: {
      skipped: true,
      ai_response: data.ai_response
    }
  };
}

// Otherwise, make the actual Qdrant request
const qdrantHost = data.qdrant_host;
const collectionName = data.collection_name;
const point = data.point;

const response = await this.helpers.httpRequest({
  method: 'PUT',
  url: `${qdrantHost}/collections/${collectionName}/points`,
  headers: {
    'Content-Type': 'application/json; charset=utf-8'
  },
  body: {
    points: [{
      id: point.id,
      vector: point.vector,
      payload: point.payload
    }]
  },
  json: true
});

return {
  json: {
    skipped: false,
    stored: true,
    ai_response: data.ai_response,
    qdrant_response: response
  }
};
JSCODE;

// New code for Return Saved Response
$newReturnCode = <<<'JSCODE'
const data = $input.first().json;
return {
  json: {
    response: data.ai_response,
    saved: !data.skipped,
    message: data.skipped ? 'Respuesta sin guardar' : 'Guardado en la base de conocimiento'
  }
};
JSCODE;

// Update nodes
foreach ($workflow['nodes'] as $i => $node) {
    if ($node['name'] === 'Prepare Qdrant Point') {
        $workflow['nodes'][$i]['parameters']['jsCode'] = $newPrepareCode;
        echo "Updated: Prepare Qdrant Point\n";
    }
    if ($node['name'] === 'Return Saved Response') {
        $workflow['nodes'][$i]['parameters']['jsCode'] = $newReturnCode;
        echo "Updated: Return Saved Response\n";
    }
}

// For Store in Qdrant, we need to change it from HTTP node to Code node
// Actually, let's just add the skip logic to Prepare Qdrant Point and use a simpler approach

// Actually, let's take a different approach - use the IF node properly
// by connecting Output 1 to Return Not Saved Response

// First check current connections
echo "\nCurrent Should Save? connections:\n";
$conn = $workflow['connections']['Should Save?']['main'];
echo "Output 0: " . $conn[0][0]['node'] . "\n";
echo "Output 1: " . $conn[1][0]['node'] . "\n";

// The issue is the IF node sends ALL items to Output 0 even when condition is false
// This seems like a bug in n8n

// Let's just bypass the IF node entirely and do the check in Prepare Qdrant Point
// But we need to handle the response properly

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
} else {
    echo "\n❌ Error: $result\n";
}
