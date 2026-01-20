<?php
// Script para limpiar todas las tablas - ejecutar con: railway run php reset_db.php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "🧹 Limpiando base de datos...\n\n";

// Deshabilitar foreign keys temporalmente
DB::statement('SET session_replication_role = replica');

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
    'model_has_roles',
    'model_has_permissions',
    'role_has_permissions',
];

foreach ($tables as $table) {
    try {
        DB::statement("TRUNCATE TABLE \"{$table}\" RESTART IDENTITY CASCADE");
        echo "✅ {$table}\n";
    } catch (\Exception $e) {
        echo "⚠️ {$table}: " . $e->getMessage() . "\n";
    }
}

// Rehabilitar foreign keys
DB::statement('SET session_replication_role = DEFAULT');

echo "\n✅ Base de datos limpiada correctamente!\n";
echo "🔄 La app está lista para un nuevo onboarding.\n";
