<?php

// Script para diagnosticar problema de autenticación con Chatwoot

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 DIAGNÓSTICO DE AUTENTICACIÓN CHATWOOT\n";
echo "=========================================\n\n";

// 1. Verificar variables de entorno
echo "1️⃣ Variables de Entorno:\n";
echo "   CHATWOOT_API_BASE_URL: " . env('CHATWOOT_API_BASE_URL') . "\n";
echo "   CHATWOOT_ACCOUNT_ID: " . env('CHATWOOT_ACCOUNT_ID') . "\n";
echo "   CHATWOOT_PLATFORM_API_TOKEN: " . (env('CHATWOOT_PLATFORM_API_TOKEN') ? 'SET ✅' : 'NOT SET ❌') . "\n\n";

// 2. Verificar usuario autenticado
echo "2️⃣ Usuario Autenticado:\n";
$user = \App\Models\User::find(8); // Usuario ID 8 (With Mia Prueba)
if ($user) {
    echo "   ID: {$user->id}\n";
    echo "   Email: {$user->email}\n";
    echo "   Name: {$user->name}\n";
    
    // Verificar si tiene campos de Chatwoot
    $fields = ['chatwoot_agent_id', 'chatwoot_agent_token', 'chatwoot_inbox_id'];
    foreach ($fields as $field) {
        $value = $user->$field ?? 'NULL';
        $status = $value !== 'NULL' && $value !== null ? '✅' : '❌';
        echo "   {$field}: {$value} {$status}\n";
    }
} else {
    echo "   ❌ Usuario no encontrado\n";
}

echo "\n3️⃣ Probando autenticación con Platform Token:\n";
$baseUrl = env('CHATWOOT_API_BASE_URL');
$accountId = env('CHATWOOT_ACCOUNT_ID');
$platformToken = env('CHATWOOT_PLATFORM_API_TOKEN');

$url = "{$baseUrl}/api/v1/accounts/{$accountId}/conversations";
echo "   URL: {$url}\n";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'api_access_token: ' . $platformToken,
    'Content-Type: application/json'
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "   HTTP Code: {$httpCode} " . ($httpCode == 200 ? '✅' : '❌') . "\n";
if ($httpCode != 200) {
    echo "   Response: " . substr($response, 0, 200) . "\n";
}

echo "\n4️⃣ Verificar si el usuario necesita un agent token:\n";
if ($user && $user->chatwoot_agent_id) {
    echo "   ℹ️  Usuario tiene chatwoot_agent_id: {$user->chatwoot_agent_id}\n";
    echo "   ℹ️  Esto indica que debe usar un agent token personal\n";
    
    if (!$user->chatwoot_agent_token) {
        echo "   ❌ PROBLEMA: Usuario no tiene chatwoot_agent_token\n";
        echo "   💡 SOLUCIÓN: Necesitas obtener un agent token para este usuario\n";
    }
} else {
    echo "   ℹ️  Usuario no tiene chatwoot_agent_id configurado\n";
}

echo "\n✅ Diagnóstico completado\n";
