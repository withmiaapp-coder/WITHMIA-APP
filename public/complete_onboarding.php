<?php
// Script para completar el onboarding manualmente

require __DIR__.'/../../vendor/autoload.php';
$app = require_once __DIR__.'/../../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Company;
use App\Services\ChatwootProvisioningService;

$user = User::where('email', 'like', '%atlantis%')->first();

if (!$user) {
    die("❌ Usuario no encontrado\n");
}

echo "=== USUARIO ENCONTRADO ===\n";
echo "ID: {$user->id}\n";
echo "Email: {$user->email}\n";
echo "Nombre: {$user->name}\n";
echo "Company Slug: {$user->company_slug}\n";
echo "Onboarding Step: {$user->onboarding_step}\n";
echo "\n";

$company = Company::where('user_id', $user->id)->first();

if (!$company) {
    die("❌ Empresa no encontrada\n");
}

echo "=== EMPRESA ENCONTRADA ===\n";
echo "ID: {$company->id}\n";
echo "Nombre: {$company->name}\n";
echo "Slug: {$company->slug}\n";
echo "\n";

echo "=== INICIANDO PROVISIONING DE CHATWOOT ===\n";

try {
    $chatwootService = new ChatwootProvisioningService();
    $result = $chatwootService->provisionCompanyAccount($company, $user);
    
    echo "✅ CHATWOOT PROVISIONADO EXITOSAMENTE\n\n";
    echo "Account ID: " . ($result['account']['id'] ?? 'N/A') . "\n";
    echo "Account Name: " . ($result['account']['name'] ?? 'N/A') . "\n";
    echo "User ID: " . ($result['user']['id'] ?? 'N/A') . "\n";
    echo "User Email: " . ($result['user']['email'] ?? 'N/A') . "\n";
    echo "Inbox ID: " . ($result['inbox']['id'] ?? 'N/A') . "\n";
    echo "Inbox Name: " . ($result['inbox']['name'] ?? 'N/A') . "\n";
    echo "\n";
    
    // Actualizar usuario con datos de Chatwoot
    if (isset($result['user']['id'])) {
        $user->update([
            'chatwoot_agent_id' => $result['user']['id'],
            'chatwoot_inbox_id' => $result['inbox']['id'] ?? null,
            'chatwoot_agent_token' => $result['user']['access_token'] ?? null,
            'onboarding_completed' => true
        ]);
        echo "✅ Usuario actualizado con datos de Chatwoot\n";
    }
    
    // Actualizar empresa
    if (isset($result['account']['id'])) {
        $company->update([
            'chatwoot_account_id' => $result['account']['id'],
            'chatwoot_provisioned' => true,
            'chatwoot_provisioned_at' => now()
        ]);
        echo "✅ Empresa actualizada con datos de Chatwoot\n";
    }
    
    echo "\n🎉 ONBOARDING COMPLETADO EXITOSAMENTE\n";
    
} catch (\Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    echo "\nStack trace:\n";
    echo $e->getTraceAsString() . "\n";
}
