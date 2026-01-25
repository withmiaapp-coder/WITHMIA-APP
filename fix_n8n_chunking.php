<?php
/**
 * Fix n8n RAG workflow chunking
 * The current chunking code doesn't properly divide long texts
 */

$n8nUrl = 'https://n8n-production-00dd.up.railway.app';
$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Mjk3OTc3fQ.aCNw5pXWbnyy_JDk24TsYN69T61acaEqoELhrtNtlI0';
$workflowId = 'YPhNu14uIWJ87ZaP';

// New improved chunking code
$newChunkingCode = <<<'JS'
// Dividir texto en chunks - MÁXIMO 5000 chars para embeddings
const text = $input.first().json.text || '';
const companySlug = $input.first().json.company_slug;
const filename = $input.first().json.filename;
const category = $input.first().json.category;
const collectionName = $input.first().json.collection_name;
const openaiApiKey = $input.first().json.openai_api_key;
const qdrantHost = $input.first().json.qdrant_host;
const qdrantApiKey = $input.first().json.qdrant_api_key;

const maxCharsPerChunk = 5000;
const chunks = [];

// FORZAR división por longitud si el texto es muy largo
if (text.length <= maxCharsPerChunk) {
  chunks.push(text);
} else {
  // Dividir forzosamente por longitud con puntos de corte naturales
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxCharsPerChunk) {
      chunks.push(remaining.trim());
      break;
    }
    
    // Buscar un punto de corte natural (punto seguido de espacio o salto de línea)
    let cutPoint = maxCharsPerChunk;
    const searchStart = Math.max(0, maxCharsPerChunk - 500);
    const searchArea = remaining.substring(searchStart, maxCharsPerChunk);
    
    // Buscar el último punto seguido de espacio
    const lastPeriod = searchArea.lastIndexOf('. ');
    const lastNewline = searchArea.lastIndexOf('\n');
    const lastDoubleNewline = searchArea.lastIndexOf('\n\n');
    
    // Preferir doble salto de línea, luego punto, luego salto simple
    if (lastDoubleNewline > 0) {
      cutPoint = searchStart + lastDoubleNewline + 2;
    } else if (lastPeriod > 0) {
      cutPoint = searchStart + lastPeriod + 2;
    } else if (lastNewline > 0) {
      cutPoint = searchStart + lastNewline + 1;
    }
    
    const chunk = remaining.substring(0, cutPoint).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    remaining = remaining.substring(cutPoint);
  }
}

console.log('Total text length: ' + text.length);
console.log('Chunks created: ' + chunks.length);
chunks.forEach((c, i) => console.log('Chunk ' + i + ' length: ' + c.length));

return chunks.map((chunk, index) => ({
  json: {
    text: chunk,
    chunk_index: index,
    total_chunks: chunks.length,
    company_slug: companySlug,
    filename: filename,
    category: category,
    collection_name: collectionName,
    openai_api_key: openaiApiKey,
    qdrant_host: qdrantHost,
    qdrant_api_key: qdrantApiKey
  }
}));
JS;

echo "=== Fixing n8n RAG Workflow Chunking ===\n\n";

// Get current workflow
echo "1. Getting current workflow...\n";
$ch = curl_init("$n8nUrl/api/v1/workflows/$workflowId");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-N8N-API-KEY: ' . $apiKey,
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    echo "Error getting workflow: HTTP $httpCode\n";
    echo $response . "\n";
    exit(1);
}

$workflow = json_decode($response, true);
echo "   Got workflow: " . $workflow['name'] . "\n";

// Find and update the chunking node
echo "2. Finding 'Split into Chunks' node...\n";
$found = false;
foreach ($workflow['nodes'] as &$node) {
    if ($node['name'] === 'Split into Chunks') {
        echo "   Found node at position " . implode(',', $node['position']) . "\n";
        echo "   Old code length: " . strlen($node['parameters']['jsCode']) . " chars\n";
        
        $node['parameters']['jsCode'] = $newChunkingCode;
        
        echo "   New code length: " . strlen($newChunkingCode) . " chars\n";
        $found = true;
        break;
    }
}

if (!$found) {
    echo "   ERROR: Node 'Split into Chunks' not found!\n";
    exit(1);
}

// Update workflow
echo "3. Updating workflow...\n";
$updateData = [
    'nodes' => $workflow['nodes'],
    'connections' => $workflow['connections'],
    'settings' => $workflow['settings'] ?? []
];

$ch = curl_init("$n8nUrl/api/v1/workflows/$workflowId");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($updateData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-N8N-API-KEY: ' . $apiKey,
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    echo "   ✓ Workflow updated successfully!\n";
    
    // Activate workflow
    echo "4. Activating workflow...\n";
    $ch = curl_init("$n8nUrl/api/v1/workflows/$workflowId/activate");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-N8N-API-KEY: ' . $apiKey,
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        echo "   ✓ Workflow activated!\n";
    } else {
        echo "   Note: Activation response: HTTP $httpCode\n";
    }
    
    echo "\n=== DONE ===\n";
    echo "The chunking algorithm has been fixed.\n";
    echo "Documents with 100,000+ characters will now be split into ~20 chunks of 5,000 chars each.\n";
} else {
    echo "   ERROR updating workflow: HTTP $httpCode\n";
    echo $response . "\n";
}
