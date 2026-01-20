<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$company = App\Models\Company::where('slug', 'withmia-zly7qn')->first();
if ($company) {
    $company->update([
        'settings' => array_merge($company->settings ?? [], [
            'training_workflow_id' => 'tqUt0Ato7dBfjEoD',
            'training_webhook_path' => 'training-withmia-zly7qn',
            'training_webhook_url' => 'https://n8n-production-00dd.up.railway.app/webhook/training-withmia-zly7qn',
            'training_workflow_name' => 'Training Chat - withmia-zly7qn'
        ])
    ]);
    echo "OK - Settings actualizados\n";
    echo json_encode($company->fresh()->settings, JSON_PRETTY_PRINT);
} else {
    echo "ERROR - Company not found\n";
}
