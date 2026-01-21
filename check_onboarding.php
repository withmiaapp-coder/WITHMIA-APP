<?php
/**
 * Script para verificar el estado del onboarding
 * Ejecutar con: php check_onboarding.php
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Company;
use App\Models\User;
use App\Services\QdrantService;
use App\Services\N8nService;

echo "=== VERIFICACIÓN DE ONBOARDING ===\n\n";

// 1. Listar todas las empresas
$companies = Company::all();
echo "📊 Total de empresas: " . $companies->count() . "\n\n";

foreach ($companies as $company) {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "🏢 Empresa: {$company->name}\n";
    echo "   Slug: {$company->slug}\n";
    echo "   ID: {$company->id}\n";
    echo "   Chatwoot Provisioned: " . ($company->chatwoot_provisioned ? '✅ Sí' : '❌ No') . "\n";
    
    $settings = $company->settings ?? [];
    echo "\n   📋 Settings:\n";
    
    // Qdrant
    $qdrantCollection = $settings['qdrant_collection'] ?? null;
    echo "   - Qdrant Collection: " . ($qdrantCollection ? "✅ {$qdrantCollection}" : "❌ No configurado") . "\n";
    
    // RAG Workflow
    $ragWorkflowId = $settings['rag_workflow_id'] ?? null;
    echo "   - RAG Workflow ID: " . ($ragWorkflowId ? "✅ {$ragWorkflowId}" : "❌ No configurado") . "\n";
    
    $ragWebhookPath = $settings['rag_webhook_path'] ?? null;
    echo "   - RAG Webhook Path: " . ($ragWebhookPath ? "✅ {$ragWebhookPath}" : "❌ No configurado") . "\n";
    
    // Training Workflow
    $trainingWorkflowId = $settings['training_workflow_id'] ?? null;
    echo "   - Training Workflow ID: " . ($trainingWorkflowId ? "✅ {$trainingWorkflowId}" : "❌ No configurado") . "\n";
    
    $trainingWebhookPath = $settings['training_webhook_path'] ?? null;
    echo "   - Training Webhook Path: " . ($trainingWebhookPath ? "✅ {$trainingWebhookPath}" : "❌ No configurado") . "\n";
    
    echo "\n";
}

// 2. Verificar Qdrant
echo "\n=== VERIFICACIÓN DE QDRANT ===\n\n";
try {
    $qdrantService = app(QdrantService::class);
    $collections = $qdrantService->getCollections();
    
    if ($collections['success']) {
        $collectionList = $collections['collections'] ?? [];
        echo "📦 Colecciones en Qdrant: " . count($collectionList) . "\n";
        foreach ($collectionList as $col) {
            echo "   - " . ($col['name'] ?? 'Unknown') . "\n";
        }
    } else {
        echo "❌ Error obteniendo colecciones: " . ($collections['error'] ?? 'Unknown') . "\n";
    }
} catch (\Exception $e) {
    echo "❌ Excepción: " . $e->getMessage() . "\n";
}

// 3. Verificar N8N
echo "\n=== VERIFICACIÓN DE N8N ===\n\n";
try {
    $n8nService = app(N8nService::class);
    
    // Intentar listar workflows
    $workflows = $n8nService->listWorkflows();
    
    if ($workflows['success'] ?? false) {
        echo "🔄 Workflows en N8N: " . count($workflows['data'] ?? []) . "\n";
        foreach ($workflows['data'] ?? [] as $wf) {
            $active = $wf['active'] ?? false;
            $icon = $active ? '✅' : '⏸️';
            echo "   {$icon} [{$wf['id']}] {$wf['name']}\n";
        }
    } else {
        echo "❌ Error obteniendo workflows: " . ($workflows['error'] ?? 'Unknown') . "\n";
    }
} catch (\Exception $e) {
    echo "❌ Excepción: " . $e->getMessage() . "\n";
}

echo "\n=== FIN DE VERIFICACIÓN ===\n";
