<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 PRUEBA FINAL DE AUTENTICACIÓN\n";
echo "==================================\n\n";

$userId = 8;
$user = \App\Models\User::find($userId);

if (!$user) {
    echo "❌ Usuario no encontrado\n";
    exit(1);
}

echo "✅ Usuario encontrado:\n";
echo "   ID: {$user->id}\n";
echo "   Email: {$user->email}\n";
echo "   chatwoot_agent_token: " . ($user->chatwoot_agent_token ? 'SET ✅' : 'NOT SET ❌') . "\n\n";

// Simular autenticación
auth()->loginUsingId($userId);

echo "✅ Usuario autenticado en Laravel\n";
echo "   Auth ID: " . auth()->id() . "\n";
echo "   Auth Email: " . auth()->user()->email . "\n\n";

// Probar llamada a Chatwoot con el token del usuario
$baseUrl = env('CHATWOOT_API_BASE_URL');
$accountId = env('CHATWOOT_ACCOUNT_ID');
$token = auth()->user()->chatwoot_agent_token;

echo "🔗 Probando conexión a Chatwoot:\n";
echo "   URL: {$baseUrl}/api/v1/accounts/{$accountId}/conversations\n";
echo "   Token: " . substr($token, 0, 10) . "...\n\n";

$response = \Illuminate\Support\Facades\Http::withHeaders([
    'api_access_token' => $token,
    'Content-Type' => 'application/json'
])->get("{$baseUrl}/api/v1/accounts/{$accountId}/conversations");

$httpCode = $response->status();
echo "   HTTP Status: {$httpCode} " . ($httpCode == 200 ? '✅' : '❌') . "\n";

if ($httpCode == 200) {
    $data = $response->json();
    $count = count($data['data']['payload'] ?? []);
    echo "   ✅ Conversaciones encontradas: {$count}\n";
} else {
    echo "   ❌ Error: " . $response->body() . "\n";
}

echo "\n✅ Prueba completada\n";
