<?php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== Verificando configuración RAG de la empresa ===\n\n";

// Buscar la empresa activa
$company = DB::table('companies')->first();

if (!$company) {
    echo "❌ No hay empresas\n";
    exit;
}

echo "📋 Empresa: {$company->name} (slug: {$company->slug})\n";

$settings = json_decode($company->settings ?? '{}', true);
echo "\n=== Settings de la empresa ===\n";
echo "RAG Workflow ID: " . ($settings['rag_workflow_id'] ?? '❌ NO CONFIGURADO') . "\n";
echo "RAG Webhook Path: " . ($settings['rag_webhook_path'] ?? '❌ NO CONFIGURADO') . "\n";
echo "RAG Workflow Name: " . ($settings['rag_workflow_name'] ?? '❌ NO CONFIGURADO') . "\n";

// Verificar N8N
$n8nUrl = env('N8N_PUBLIC_URL', 'https://n8n-production-00dd.up.railway.app');
echo "\n=== Configuración N8N ===\n";
echo "N8N_PUBLIC_URL: $n8nUrl\n";
echo "N8N_API_KEY: " . (env('N8N_API_KEY') ? '✅ Configurada' : '❌ NO CONFIGURADA') . "\n";

// Verificar qué webhook existe en n8n
echo "\n=== Verificando workflow en base de datos N8N ===\n";

try {
    $pdoN8n = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=n8n', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');
    
    $stmt = $pdoN8n->query("SELECT id, name, active, nodes FROM n8n.workflow_entity WHERE name LIKE '%RAG%'");
    $workflows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($workflows as $wf) {
        echo "\n📌 Workflow: {$wf['name']}\n";
        echo "   ID: {$wf['id']}\n";
        echo "   Activo: " . ($wf['active'] ? '✅ Sí' : '❌ No') . "\n";
        
        $nodes = json_decode($wf['nodes'], true);
        foreach ($nodes as $node) {
            if ($node['type'] === 'n8n-nodes-base.webhook') {
                $path = $node['parameters']['path'] ?? 'N/A';
                echo "   Webhook Path: $path\n";
                echo "   URL Completa: https://n8n-production-8de5.up.railway.app/webhook/$path\n";
            }
        }
    }
    
} catch (Exception $e) {
    echo "Error conectando a N8N: " . $e->getMessage() . "\n";
}

// Ver qué URL debería usar Laravel
echo "\n=== URL que Laravel debería usar ===\n";
$webhookPath = $settings['rag_webhook_path'] ?? "rag-documents-{$company->slug}";
$expectedUrl = "https://n8n-production-8de5.up.railway.app/webhook/$webhookPath";
echo "Webhook Path esperado: $webhookPath\n";
echo "URL Completa esperada: $expectedUrl\n";
