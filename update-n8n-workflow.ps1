$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiNzI2NTAzMy0zMWUxLTQxZWQtODBmZS0zZDc4MTM0MDU3OTIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY4OTMzNzY4fQ.Ld006SOvPFH6ropsjNavjxzDhRmwkQDbrAPikVP8nos"
$headers = @{ 
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json; charset=utf-8" 
}

# Read backup
$wf = Get-Content ".\workflows\training-chat-backup.json" -Raw | ConvertFrom-Json

# New code for Prepare Qdrant Point with mojibake fix
$newCode = @'
// Prepare point for Qdrant with UTF-8 mojibake fix
const shouldSaveData = $('Should Save?').first().json;
const embedding = $input.first().json.data[0].embedding;

// Fix mojibake - UTF-8 interpreted as Latin-1
function fixMojibake(text) {
  if (!text) return '';
  const replacements = [
    ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'],
    ['Ã±', 'ñ'], ['Ã¼', 'ü'], ['Ã ', 'à'], ['Ã¨', 'è'], ['Ã¬', 'ì'],
    ['Ã²', 'ò'], ['Ã¹', 'ù'], ['Ã¤', 'ä'], ['Ã«', 'ë'], ['Ã¯', 'ï'],
    ['Ã¶', 'ö'], ['Ã¿', 'ÿ'], ['Ã§', 'ç'],
    ['Â¡', '¡'], ['Â¿', '¿'], ['Âº', 'º'], ['Âª', 'ª']
  ];
  let fixed = text;
  for (const [bad, good] of replacements) {
    fixed = fixed.split(bad).join(good);
  }
  return fixed;
}

const textToSave = fixMojibake(shouldSaveData.text_to_save || '');

// Generate UUID v4
const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
  const r = Math.random() * 16 | 0;
  const v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

return {
  json: {
    id: uuid,
    vector: embedding,
    payload: {
      text: textToSave,
      filename: 'training_examples.txt',
      category: 'entrenamiento',
      company_slug: shouldSaveData.company_slug,
      chunk_index: 0,
      total_chunks: 1
    },
    collection_name: shouldSaveData.collection_name,
    qdrant_host: shouldSaveData.qdrant_host,
    response: fixMojibake(shouldSaveData.response || '')
  }
};
'@

# Find and update node
$nodeIdx = 0
foreach ($node in $wf.nodes) {
    if ($node.name -eq "Prepare Qdrant Point") {
        $wf.nodes[$nodeIdx].parameters.jsCode = $newCode
        Write-Host "Nodo 'Prepare Qdrant Point' encontrado en indice $nodeIdx"
        break
    }
    $nodeIdx++
}

# Remove read-only properties that n8n doesn't accept
$wf.PSObject.Properties.Remove('id')
$wf.PSObject.Properties.Remove('createdAt')
$wf.PSObject.Properties.Remove('updatedAt')
$wf.PSObject.Properties.Remove('versionId')

# Update workflow
$body = $wf | ConvertTo-Json -Depth 50 -Compress
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

try {
    $result = Invoke-RestMethod -Uri "https://n8n-production-00dd.up.railway.app/api/v1/workflows/TpaSZ3i1HDcVBp41" -Method PUT -Headers $headers -Body $bodyBytes
    Write-Host "✅ Workflow actualizado: $($result.name)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ErrorDetails.Message
}
