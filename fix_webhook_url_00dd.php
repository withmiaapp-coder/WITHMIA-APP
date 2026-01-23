<?php
$pdo = new PDO('pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=railway', 'postgres', 'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw');

$stmt = $pdo->query("SELECT id, settings FROM companies WHERE slug = 'withmia-jpaoid'");
$company = $stmt->fetch(PDO::FETCH_ASSOC);
$settings = json_decode($company['settings'], true);

echo "Antes:\n";
echo "  rag_webhook_path: " . ($settings['rag_webhook_path'] ?? 'N/A') . "\n";
echo "  rag_webhook_url: " . ($settings['rag_webhook_url'] ?? 'N/A') . "\n";

// Corregir con URL 00dd (la correcta según n8n)
$settings['rag_webhook_path'] = 'rag-documents-withmia-jpaoid';
$settings['rag_webhook_url'] = 'https://n8n-production-00dd.up.railway.app/webhook/rag-documents-withmia-jpaoid';
$settings['training_webhook_url'] = 'https://n8n-production-00dd.up.railway.app/webhook/training-withmia-jpaoid';

$stmt = $pdo->prepare('UPDATE companies SET settings = ? WHERE id = ?');
$stmt->execute([json_encode($settings), $company['id']]);

echo "\nDespués:\n";
echo "  rag_webhook_path: {$settings['rag_webhook_path']}\n";
echo "  rag_webhook_url: {$settings['rag_webhook_url']}\n";
echo "\n✅ Corregido!";
