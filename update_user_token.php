<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$userId = 8;
$agentToken = '6oRBwNt3656eW5RPuPsELXqr';

$user = \App\Models\User::find($userId);

if (!$user) {
    echo "❌ Usuario con ID {$userId} no encontrado\n";
    exit(1);
}

echo "🔄 Actualizando usuario...\n";
echo "   ID: {$user->id}\n";
echo "   Email: {$user->email}\n";
echo "   Nuevo token: {$agentToken}\n\n";

$user->chatwoot_agent_token = $agentToken;
$user->save();

echo "✅ Usuario actualizado exitosamente!\n";
echo "\n📋 Datos actuales:\n";
echo "   chatwoot_agent_id: {$user->chatwoot_agent_id}\n";
echo "   chatwoot_agent_token: {$user->chatwoot_agent_token}\n";
echo "   chatwoot_inbox_id: {$user->chatwoot_inbox_id}\n";
