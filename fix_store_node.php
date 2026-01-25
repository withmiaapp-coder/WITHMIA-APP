<?php
// Cambiar Store in Qdrant de HTTP a Code node para manejar skip_save

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

// Find Store in Qdrant and change it to a Code node
foreach ($workflow['nodes'] as $i => $node) {
    if ($node['name'] === 'Store in Qdrant') {
        echo "Found Store in Qdrant at index $i\n";
        echo "Current type: {$node['type']}\n";
        
        // Change to Code node
        $workflow['nodes'][$i]['type'] = 'n8n-nodes-base.code';
        $workflow['nodes'][$i]['typeVersion'] = 2;
        $workflow['nodes'][$i]['parameters'] = [
            'jsCode' => <<<'JSCODE'
const data = $input.first().json;

// If skip_save is true, just pass through
if (data.skip_save === true) {
  return {
    json: {
      skipped: true,
      ai_response: data.ai_response
    }
  };
}

// Make the Qdrant request
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
JSCODE
        ];
        
        echo "Changed to Code node with skip_save logic\n";
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
} else {
    echo "\n❌ Error: $result\n";
}
