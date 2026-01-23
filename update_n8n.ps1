$newJsCode = @'
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

if (text.length <= maxCharsPerChunk) {
  chunks.push(text);
} else {
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxCharsPerChunk) {
      chunks.push(remaining.trim());
      break;
    }
    let cutPoint = maxCharsPerChunk;
    const searchStart = Math.max(0, maxCharsPerChunk - 500);
    const searchArea = remaining.substring(searchStart, maxCharsPerChunk);
    const lastPeriod = searchArea.lastIndexOf('. ');
    const lastNewline = searchArea.lastIndexOf('\n');
    const lastDoubleNewline = searchArea.lastIndexOf('\n\n');
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
'@

# Load workflow
$workflow = Get-Content "current_workflow.json" | ConvertFrom-Json

# Update the chunk node
for ($i = 0; $i -lt $workflow.nodes.Count; $i++) {
    if ($workflow.nodes[$i].name -eq "Split into Chunks") {
        Write-Output "Updating node: $($workflow.nodes[$i].name)"
        $workflow.nodes[$i].parameters.jsCode = $newJsCode
        Write-Output "Code updated!"
    }
}

# Prepare update payload
$updatePayload = @{
    nodes = $workflow.nodes
    connections = $workflow.connections
    settings = $workflow.settings
}

$jsonPayload = $updatePayload | ConvertTo-Json -Depth 20 -Compress
$jsonPayload | Out-File -FilePath "update_payload.json" -Encoding utf8

Write-Output "Payload saved to update_payload.json"
Write-Output "Payload size: $($jsonPayload.Length) bytes"
