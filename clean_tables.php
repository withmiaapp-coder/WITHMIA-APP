<?php
$pdo = new PDO('pgsql:host=yamanote.proxy.rlwy.net;port=30172;dbname=miaapp', 'postgres', 'AOtZHroOvTYXBMmKtoaDmKQuSPEiwoWV');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "🧹 Limpiando tablas...\n";

$tables = [
    'personal_access_tokens',
    'sessions',
    'knowledge_documents',
    'whatsapp_instances',
    'agent_invitations',
    'pipeline_items',
    'pipelines',
    'usage_metrics',
    'integrations',
    'ai_agents',
    'subscriptions',
    'companies',
    'users',
];

foreach ($tables as $table) {
    try {
        $pdo->exec("TRUNCATE TABLE \"$table\" RESTART IDENTITY CASCADE");
        echo "✅ $table\n";
    } catch (PDOException $e) {
        echo "⚠️ $table: " . $e->getMessage() . "\n";
    }
}

echo "\n✅ Todas las tablas limpiadas\n";
