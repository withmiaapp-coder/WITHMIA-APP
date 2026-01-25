<?php
/**
 * Script para crear el workflow de Training Chat via API de n8n
 */

// Configuración
$n8nUrl = 'https://n8n-production-00dd.up.railway.app';
$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNzZjOTE2Ny0zZTA4LTRkN2QtYTY5ZC1iOTUxZjY0MWJiZGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Mjk3OTc3fQ.aCNw5pXWbnyy_JDk24TsYN69T61acaEqoELhrtNtlI0';
$companySlug = 'withmia-zly7qn'; // Tu company slug

echo "=== CREANDO WORKFLOW DE TRAINING PARA {$companySlug} ===\n\n";

// 1. Leer el template
$templatePath = __DIR__ . '/workflows/training-chat.json';
if (!file_exists($templatePath)) {
    die("ERROR: Template no encontrado en {$templatePath}\n");
}

$template = file_get_contents($templatePath);
// Remove BOM if present
$template = preg_replace('/^\xEF\xBB\xBF/', '', $template);
$workflow = json_decode($template, true);

if (!$workflow) {
    die("ERROR: JSON inválido - " . json_last_error_msg() . "\n");
}

echo "✓ Template cargado\n";

// 2. Personalizar el workflow
$webhookPath = "training-{$companySlug}";
$newWebhookId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
    mt_rand(0, 0xffff), mt_rand(0, 0xffff),
    mt_rand(0, 0xffff),
    mt_rand(0, 0x0fff) | 0x4000,
    mt_rand(0, 0x3fff) | 0x8000,
    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
);

foreach ($workflow['nodes'] as &$node) {
    if ($node['type'] === 'n8n-nodes-base.webhook') {
        $node['parameters']['path'] = $webhookPath;
        $node['webhookId'] = $newWebhookId;
    }
}

$workflow['name'] = "Training Chat - {$companySlug}";

// Limpiar campos que no deben ir en workflow nuevo
unset($workflow['id']);
unset($workflow['versionId']);
unset($workflow['active']);
unset($workflow['pinData']);
unset($workflow['meta']);
unset($workflow['staticData']);
unset($workflow['notes']);
unset($workflow['tags']);
unset($workflow['shared']);
unset($workflow['updatedAt']);
unset($workflow['createdAt']);

// Asegurar estructura mínima requerida
if (!isset($workflow['settings'])) {
    $workflow['settings'] = ['executionOrder' => 'v1'];
}

echo "✓ Workflow personalizado para {$companySlug}\n";
echo "  - Webhook path: {$webhookPath}\n";

// 3. Crear workflow en n8n
echo "\n→ Creando workflow en n8n...\n";

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => "{$n8nUrl}/api/v1/workflows",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($workflow),
    CURLOPT_HTTPHEADER => [
        'X-N8N-API-KEY: ' . $apiKey,
        'Content-Type: application/json',
        'Accept: application/json'
    ],
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    die("ERROR CURL: {$error}\n");
}

if ($httpCode !== 200 && $httpCode !== 201) {
    echo "ERROR HTTP {$httpCode}:\n";
    echo $response . "\n";
    exit(1);
}

$result = json_decode($response, true);
$workflowId = $result['id'] ?? null;

if (!$workflowId) {
    echo "ERROR: No se obtuvo ID del workflow\n";
    echo $response . "\n";
    exit(1);
}

echo "✓ Workflow creado con ID: {$workflowId}\n";

// 4. Activar el workflow
echo "\n→ Activando workflow...\n";

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => "{$n8nUrl}/api/v1/workflows/{$workflowId}/activate",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => '{}',
    CURLOPT_HTTPHEADER => [
        'X-N8N-API-KEY: ' . $apiKey,
        'Content-Type: application/json',
        'Accept: application/json'
    ],
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    echo "✓ Workflow activado\n";
} else {
    echo "⚠ No se pudo activar (HTTP {$httpCode}): {$response}\n";
}

// 5. Resumen
$webhookUrl = "{$n8nUrl}/webhook/{$webhookPath}";

echo "\n" . str_repeat("=", 60) . "\n";
echo "✅ WORKFLOW DE TRAINING CREADO EXITOSAMENTE\n";
echo str_repeat("=", 60) . "\n\n";
echo "Workflow ID:  {$workflowId}\n";
echo "Webhook Path: {$webhookPath}\n";
echo "Webhook URL:  {$webhookUrl}\n";
echo "\n";
echo "Para guardar esta configuración en la base de datos,\n";
echo "actualiza company.settings con:\n";
echo json_encode([
    'training_workflow_id' => $workflowId,
    'training_webhook_path' => $webhookPath,
    'training_webhook_url' => $webhookUrl,
    'training_workflow_name' => "Training Chat - {$companySlug}"
], JSON_PRETTY_PRINT) . "\n";
