<?php

// Conectar directamente a Railway
$pdo = new PDO(
    'pgsql:host=switchyard.proxy.rlwy.net;port=28796;dbname=railway',
    'postgres',
    'aWlIHOOlqRtqPdPrnHJJZKZvcIFXioYw',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$stmt = $pdo->prepare("SELECT * FROM companies WHERE slug = ?");
$stmt->execute(['withmia-nobhoe']);
$company = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$company) {
    echo "❌ Empresa no encontrada\n";
    exit(1);
}

echo "=== INFORMACIÓN DE LA EMPRESA ===\n\n";
echo "ID: {$company['id']}\n";
echo "Nombre: {$company['name']}\n";
echo "Slug: {$company['slug']}\n";
echo "Onboarding completado: " . ($company['onboarding_completed'] ? 'Sí' : 'No') . "\n";
echo "Fecha onboarding: " . ($company['onboarding_completed_at'] ?? 'N/A') . "\n";
echo "Nombre asistente: " . ($company['assistant_name'] ?? 'N/A') . "\n";
echo "Website: " . ($company['website'] ?? 'N/A') . "\n";
echo "Descripción: " . ($company['description'] ?? 'N/A') . "\n\n";

// Verificar jobs pendientes relacionados
echo "=== JOBS RELACIONADOS ===\n\n";

$jobs = $pdo->query("SELECT COUNT(*) as count FROM jobs WHERE queue = 'default'")->fetch(PDO::FETCH_ASSOC);
echo "Jobs pendientes en cola: " . $jobs['count'] . "\n\n";

// Verificar colección Qdrant esperada
$expectedCollection = 'knowledge_' . $company['slug'];
echo "=== QDRANT ===\n";
echo "Colección esperada: {$expectedCollection}\n\n";
