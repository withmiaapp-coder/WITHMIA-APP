<?php
/**
 * Script para actualizar companies con inbox_id
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Company;

echo "\n🔧 Actualizando companies con inbox_id...\n\n";

// Mapeo de account_id a inbox_id (basado en los usuarios)
$mapping = [
    1 => 5,  // WITHMIA Admin → inbox 5
    7 => 7,  // Cosmeniaa → inbox 7
    8 => 8,  // Cibox Supermercado → inbox 8
];

foreach ($mapping as $accountId => $inboxId) {
    $company = Company::where('chatwoot_account_id', $accountId)->first();
    
    if ($company) {
        $company->chatwoot_inbox_id = $inboxId;
        $company->save();
        
        echo "✅ {$company->name} → Inbox ID: {$inboxId}\n";
    }
}

echo "\n🎉 Companies actualizadas!\n\n";
