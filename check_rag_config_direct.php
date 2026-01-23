<?php
// Conexión directa a las bases de datos de Railway

echo "=== Verificando configuración RAG ===\n\n";

// Conexión a mia-app DB
$pdoMia = new PDO(
    'pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=railway',
    'postgres',
    'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw'
);

// Buscar la empresa
$stmt = $pdoMia->query("SELECT id, name, slug, settings FROM companies ORDER BY id LIMIT 1");
$company = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$company) {
    echo "❌ No hay empresas\n";
    exit;
}

echo "📋 Empresa: {$company['name']} (slug: {$company['slug']})\n";

$settings = json_decode($company['settings'] ?? '{}', true);
echo "\n=== Settings de la empresa ===\n";
echo "RAG Workflow ID: " . ($settings['rag_workflow_id'] ?? '❌ NO CONFIGURADO') . "\n";
echo "RAG Webhook Path: " . ($settings['rag_webhook_path'] ?? '❌ NO CONFIGURADO') . "\n";
echo "RAG Workflow Name: " . ($settings['rag_workflow_name'] ?? '❌ NO CONFIGURADO') . "\n";

// Verificar N8N
echo "\n=== Verificando workflows en N8N ===\n";

$pdoN8n = new PDO(
    'pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n',
    'postgres',
    'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw'
);

$stmt = $pdoN8n->query("SELECT id, name, active, nodes FROM n8n.workflow_entity WHERE name LIKE '%RAG%'");
$workflows = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($workflows)) {
    echo "❌ No hay workflows RAG\n";
} else {
    foreach ($workflows as $wf) {
        echo "\n📌 Workflow: {$wf['name']}\n";
        echo "   ID: {$wf['id']}\n";
        echo "   Activo: " . ($wf['active'] ? '✅ Sí' : '❌ No') . "\n";
        
        $nodes = json_decode($wf['nodes'], true);
        foreach ($nodes as $node) {
            if ($node['type'] === 'n8n-nodes-base.webhook') {
                $path = $node['parameters']['path'] ?? 'N/A';
                echo "   Webhook Path: $path\n";
                echo "   URL: https://n8n-production-8de5.up.railway.app/webhook/$path\n";
            }
        }
    }
}

// Comparar con lo que la empresa tiene configurado
echo "\n=== Diagnóstico ===\n";
$ragWebhookPath = $settings['rag_webhook_path'] ?? null;
$ragWorkflowId = $settings['rag_workflow_id'] ?? null;

if (!$ragWebhookPath) {
    echo "⚠️ La empresa NO tiene configurado rag_webhook_path\n";
    echo "   Laravel intentará crear un nuevo workflow o buscará uno existente\n";
}

if (!$ragWorkflowId) {
    echo "⚠️ La empresa NO tiene configurado rag_workflow_id\n";
}

// Verificar si el workflow configurado existe
if ($ragWorkflowId) {
    $stmt = $pdoN8n->prepare("SELECT id, name, active FROM n8n.workflow_entity WHERE id = ?");
    $stmt->execute([$ragWorkflowId]);
    $existingWf = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingWf) {
        echo "✅ Workflow configurado existe: {$existingWf['name']}\n";
    } else {
        echo "❌ Workflow configurado NO existe en n8n (fue eliminado?)\n";
    }
}

// Sugerencia de fix
echo "\n=== Solución ===\n";
if (!empty($workflows)) {
    $wf = $workflows[0];
    $nodes = json_decode($wf['nodes'], true);
    $webhookPath = null;
    foreach ($nodes as $node) {
        if ($node['type'] === 'n8n-nodes-base.webhook') {
            $webhookPath = $node['parameters']['path'] ?? null;
            break;
        }
    }
    
    if ($webhookPath) {
        echo "Ejecuta este SQL para configurar el webhook:\n\n";
        $newSettings = $settings;
        $newSettings['rag_workflow_id'] = $wf['id'];
        $newSettings['rag_webhook_path'] = $webhookPath;
        $newSettings['rag_workflow_name'] = $wf['name'];
        
        echo "UPDATE companies SET settings = '" . json_encode($newSettings) . "' WHERE id = {$company['id']};\n";
    }
}
