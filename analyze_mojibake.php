<?php
// Analizar el texto con mojibake del JSON
$jsonFile = __DIR__ . '/qdrant_output.json';
$data = json_decode(file_get_contents($jsonFile), true);

$text = $data['result']['points'][0]['payload']['text'];

echo "=== Análisis de bytes del texto ===\n\n";

// Encontrar "Descripción" con mojibake
$pos = strpos($text, "Descripci");
if ($pos !== false) {
    $sample = substr($text, $pos, 20);
    echo "Muestra encontrada: $sample\n";
    echo "Hex bytes:\n";
    for ($i = 0; $i < strlen($sample); $i++) {
        $char = $sample[$i];
        $hex = sprintf('%02X', ord($char));
        echo "$char ($hex) ";
    }
    echo "\n\n";
}

// Buscar el patrón Ã³ 
echo "=== Buscando patrones de mojibake ===\n";

// En el JSON guardado, el texto ya pasó por el encoding de PowerShell
// Vamos a analizar los bytes crudos
$patterns = [
    'C383' => 'Ã (parte de mojibake)',
    'C2B3' => '³ (parte de mojibake)',
    'C3B3' => 'ó correcto',
];

echo "\nPatrón 'Ã³' en hex es: C3 83 C2 B3 (4 bytes mojibake) o C3 B3 (2 bytes correcto)\n";

// Extraer bytes crudos de "Descripción"
$searchStart = strpos($text, "Descripci");
if ($searchStart !== false) {
    $chunk = substr($text, $searchStart, 30);
    echo "\nBytes de 'Descripci...':\n";
    $hexStr = "";
    for ($i = 0; $i < strlen($chunk); $i++) {
        $hexStr .= sprintf('%02X ', ord($chunk[$i]));
    }
    echo $hexStr . "\n";
    
    // Decodificar para mostrar
    echo "\nInterpretación:\n";
    echo "- Si C3 83 C2 B3 = mojibake de 'ó' (double UTF-8)\n";
    echo "- Si C3 B3 = 'ó' correcto UTF-8\n";
}

// Ver si el problema es que el text ya tiene mojibake de 2 bytes (no 4)
echo "\n=== Verificación de tipo de mojibake ===\n";
// El patrón Ã³ cuando se guarda como UTF-8 tiene estos bytes:
// Ã = C3 83 (en UTF-8)
// ³ = C2 B3 (en UTF-8) 
// Juntos: C3 83 C2 B3

// Pero si el texto original estaba en UTF-8 y se interpretó como Latin-1
// entonces á (C3 A1) se convierte en Ã¡ (C3 83 C2 A1)

$testMojibake = "\xC3\x83\xC2\xB3"; // Esto es "Ã³" en UTF-8
$testCorrect = "\xC3\xB3"; // Esto es "ó" en UTF-8

echo "Mojibake 'Ã³' en UTF-8: " . bin2hex($testMojibake) . " (4 bytes)\n";
echo "Correcto 'ó' en UTF-8: " . bin2hex($testCorrect) . " (2 bytes)\n";

// Ver si el texto contiene el patrón de 4 bytes
if (strpos($text, $testMojibake) !== false) {
    echo "\n✓ Encontrado patrón de 4 bytes (Ã³) - el fix debería reemplazarlo\n";
} else {
    echo "\n✗ NO encontrado patrón de 4 bytes\n";
}

// Verificar si ya tiene el correcto
if (strpos($text, $testCorrect) !== false) {
    echo "✓ Encontrado 'ó' correcto\n";
}
