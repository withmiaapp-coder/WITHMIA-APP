<?php
/**
 * Verificar estado de encoding en TODOS los puntos de Qdrant
 */

$qdrantHost = 'https://qdrant-production-f4e7.up.railway.app';
$apiKey = 'qdrant_api_key_withmia_2024_secure';

echo "🔍 VERIFICACIÓN DE ENCODING EN QDRANT\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

// Obtener todos los puntos
$scrollData = ['limit' => 100, 'with_payload' => true];

$ch = curl_init("$qdrantHost/collections/company_withmia-nfudrg_knowledge/points/scroll");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ["api-key: $apiKey", 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($scrollData),
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false
]);
$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true)['result'] ?? [];
$points = $result['points'] ?? [];

echo "📊 Total de puntos: " . count($points) . "\n\n";

$hasMojibake = false;
$hasCorrectAccents = false;

// Patrones de mojibake a buscar
$mojibakePatterns = [
    '/Ã¡/' => 'á mal codificado',
    '/Ã©/' => 'é mal codificado', 
    '/Ã­/' => 'í mal codificado',
    '/Ã³/' => 'ó mal codificado',
    '/Ãº/' => 'ú mal codificado',
    '/Ã±/' => 'ñ mal codificado',
];

foreach ($points as $i => $point) {
    $text = $point['payload']['text'] ?? '';
    $source = $point['payload']['source'] ?? 'unknown';
    
    // Buscar mojibake
    $foundMojibake = [];
    foreach ($mojibakePatterns as $pattern => $desc) {
        if (preg_match($pattern, $text)) {
            $foundMojibake[] = $desc;
        }
    }
    
    // Buscar acentos correctos
    $hasAccents = preg_match('/[áéíóúñüÁÉÍÓÚÑÜ]/u', $text);
    
    if (!empty($foundMojibake)) {
        echo "❌ Punto " . ($i+1) . " [$source]: TIENE MOJIBAKE\n";
        echo "   Problemas: " . implode(', ', $foundMojibake) . "\n";
        echo "   Preview: " . substr($text, 0, 100) . "\n\n";
        $hasMojibake = true;
    } elseif ($hasAccents) {
        echo "✅ Punto " . ($i+1) . " [$source]: Acentos correctos\n";
        echo "   Preview: " . substr($text, 0, 100) . "...\n\n";
        $hasCorrectAccents = true;
    } else {
        echo "➖ Punto " . ($i+1) . " [$source]: Sin acentos detectados\n";
    }
}

echo "\n═══════════════════════════════════════════════════════════════\n";
echo "📋 RESUMEN:\n";
if ($hasMojibake) {
    echo "⚠️  Se encontró mojibake en algunos puntos - NECESITA CORRECCIÓN\n";
} else {
    echo "✅ NO se encontró mojibake - Los acentos están bien codificados\n";
}

if ($hasCorrectAccents) {
    echo "✅ Se encontraron acentos correctamente codificados en UTF-8\n";
}
