<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Buscar usuario de WITHMIA
$user = App\Models\User::where('email', 'automatiza@withmia.com')->first();

if (!$user) {
    echo "Usuario no encontrado\n";
    exit(1);
}

$company = $user->company;
$settings = $company->settings ?? [];

echo "=== CONFIGURACIÓN ACTUAL DE " . $user->company_slug . " ===\n\n";
echo "Company ID: " . $company->id . "\n";
echo "Company Slug: " . $user->company_slug . "\n";
echo "Assistant Name: " . ($company->assistant_name ?? 'No configurado') . "\n\n";

echo "=== SETTINGS (JSON) ===\n";
echo json_encode($settings, JSON_PRETTY_PRINT) . "\n\n";

// Verificar si tiene training workflow
$hasTraining = isset($settings['training_workflow_id']);
echo "Training Workflow: " . ($hasTraining ? "✅ Configurado" : "❌ No existe") . "\n";

if ($hasTraining) {
    echo "  - Workflow ID: " . ($settings['training_workflow_id'] ?? 'N/A') . "\n";
    echo "  - Webhook URL: " . ($settings['training_webhook_url'] ?? 'N/A') . "\n";
}
