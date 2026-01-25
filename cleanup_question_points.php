<?php
/**
 * Eliminar puntos que son preguntas (no deberían haberse guardado)
 */

$qdrantHost = 'https://qdrant-production-f4e7.up.railway.app';
$apiKey = 'qdrant_api_key_withmia_2024_secure';

echo "🧹 LIMPIEZA DE PREGUNTAS GUARDADAS INCORRECTAMENTE\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

// Obtener todos los puntos
$ch = curl_init("$qdrantHost/collections/company_withmia-nfudrg_knowledge/points/scroll");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ["api-key: $apiKey", 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['limit' => 100, 'with_payload' => true]),
    CURLOPT_SSL_VERIFYPEER => false
]);
$response = curl_exec($ch);
curl_close($ch);

$points = json_decode($response, true)['result']['points'] ?? [];

echo "📊 Total puntos: " . count($points) . "\n\n";

// Detectar puntos que son preguntas
$questionsToDelete = [];

foreach ($points as $p) {
    $text = $p['payload']['text'] ?? '';
    $type = $p['payload']['type'] ?? 'unknown';
    
    // Solo revisar training_message
    if ($type !== 'training_message') {
        continue;
    }
    
    $lowerText = mb_strtolower(trim($text), 'UTF-8');
    $isQuestion = false;
    
    // Detectar si es pregunta
    if (preg_match('/^¿|^\?|\?$/', $text)) {
        $isQuestion = true;
    }
    
    // Palabras interrogativas
    $questionStarters = ['qué', 'que', 'cuál', 'cual', 'cómo', 'como', 'cuándo', 'cuando', 
                         'dónde', 'donde', 'quién', 'quien', 'tienen', 'tienes', 'hay'];
    foreach ($questionStarters as $starter) {
        if (str_starts_with($lowerText, $starter . ' ')) {
            $isQuestion = true;
            break;
        }
    }
    
    // Patrones de preguntas
    if (preg_match('/horario.*(tienen|tienes)\s*\??$/iu', $text)) {
        $isQuestion = true;
    }
    
    if ($isQuestion) {
        $questionsToDelete[] = [
            'id' => $p['id'],
            'text' => $text
        ];
    }
}

echo "🔍 Preguntas detectadas para eliminar: " . count($questionsToDelete) . "\n\n";

if (empty($questionsToDelete)) {
    echo "✅ No hay preguntas para eliminar\n";
    exit(0);
}

foreach ($questionsToDelete as $q) {
    echo "❌ ID: " . $q['id'] . "\n";
    echo "   Text: " . $q['text'] . "\n\n";
}

// Eliminar los puntos
echo "🗑️ Eliminando puntos...\n";

$pointIds = array_column($questionsToDelete, 'id');

$ch = curl_init("$qdrantHost/collections/company_withmia-nfudrg_knowledge/points/delete");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ["api-key: $apiKey", 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['points' => $pointIds]),
    CURLOPT_SSL_VERIFYPEER => false
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode >= 200 && $httpCode < 300) {
    echo "✅ Puntos eliminados correctamente\n";
} else {
    echo "❌ Error eliminando: HTTP $httpCode - $response\n";
}

// Verificar resultado
$ch = curl_init("$qdrantHost/collections/company_withmia-nfudrg_knowledge/points/scroll");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ["api-key: $apiKey", 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['limit' => 100, 'with_payload' => false]),
    CURLOPT_SSL_VERIFYPEER => false
]);
$response = curl_exec($ch);
curl_close($ch);

$finalCount = count(json_decode($response, true)['result']['points'] ?? []);
echo "\n📊 Total puntos después de limpieza: $finalCount\n";
