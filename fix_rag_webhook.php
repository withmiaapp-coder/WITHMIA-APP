<?php
// Corregir la configuración del webhook RAG

$pdo = new PDO(
    'pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=railway',
    'postgres',
    'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw'
);

echo "=== Corrigiendo configuración RAG ===\n\n";

// Obtener company actual
$stmt = $pdo->query("SELECT id, name, slug, settings FROM companies WHERE slug = 'withmia-jpaoid'");
$company = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$company) {
    echo "❌ Empresa no encontrada\n";
    exit;
}

echo "📋 Empresa: {$company['name']}\n";

$settings = json_decode($company['settings'], true);

// Valores correctos (del workflow real en n8n)
$correctN8nUrl = 'https://n8n-production-8de5.up.railway.app';
$correctRagWebhookPath = 'rag-documents-withmia-jpaoid';
$correctTrainingWebhookPath = 'training-withmia-jpaoid';

// Actualizar settings
$settings['rag_webhook_path'] = $correctRagWebhookPath;
$settings['rag_webhook_url'] = "{$correctN8nUrl}/webhook/{$correctRagWebhookPath}";
$settings['training_webhook_url'] = "{$correctN8nUrl}/webhook/{$correctTrainingWebhookPath}";

echo "\n=== Nuevos valores ===\n";
echo "rag_webhook_path: {$settings['rag_webhook_path']}\n";
echo "rag_webhook_url: {$settings['rag_webhook_url']}\n";
echo "training_webhook_url: {$settings['training_webhook_url']}\n";

// Guardar
$stmt = $pdo->prepare("UPDATE companies SET settings = ? WHERE id = ?");
$stmt->execute([json_encode($settings), $company['id']]);

echo "\n✅ Configuración actualizada!\n";

// Verificar
$stmt = $pdo->query("SELECT settings FROM companies WHERE id = {$company['id']}");
$updated = $stmt->fetch(PDO::FETCH_ASSOC);
$newSettings = json_decode($updated['settings'], true);

echo "\n=== Verificación ===\n";
echo "rag_webhook_path: {$newSettings['rag_webhook_path']}\n";
echo "rag_webhook_url: {$newSettings['rag_webhook_url']}\n";
