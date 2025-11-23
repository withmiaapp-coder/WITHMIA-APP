<?php

require __DIR__ . '/../../vendor/autoload.php';

$app = require_once __DIR__ . '/../../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$service = app('App\Services\EvolutionApiService');

echo "🔄 Reconfigurando integración de Chatwoot...\n\n";

try {
    $result = $service->setChatwootIntegration(
        'withmia_instance',
        'https://app.withmia.com:443',
        '1',
        'n88kRvouwD41QhiXZ1nRmaqY'
    );
    
    echo "✅ Resultado:\n";
    print_r($result);
    echo "\n";
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
