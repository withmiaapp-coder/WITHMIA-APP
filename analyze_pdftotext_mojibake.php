<?php
// Analizar los bytes del mojibake que viene de pdftotext
// Según el log: "econom├¡a" debería ser "economía"

// El patrón del log muestra: ├¡ para í, ├ü para Á, ├│ para ó

// Estos son los caracteres que vemos:
$samples = [
    '├¡' => 'í',  // econom├¡a -> economía
    '├ü' => 'Á',  // ├üngel -> Ángel
    '├│' => 'ó',  // L├│pez -> López
    '├║' => 'ú',  // Sep├║lveda -> Sepúlveda
    '├¡' => 'í',  // expl├¡citamente -> explícitamente
];

echo "=== Análisis de mojibake de pdftotext ===\n\n";

foreach ($samples as $mojibake => $correct) {
    echo "Mojibake: '$mojibake' -> Correcto: '$correct'\n";
    echo "Hex mojibake: ";
    for ($i = 0; $i < strlen($mojibake); $i++) {
        echo sprintf('%02X ', ord($mojibake[$i]));
    }
    echo "\n";
    echo "Hex correcto: ";
    for ($i = 0; $i < strlen($correct); $i++) {
        echo sprintf('%02X ', ord($correct[$i]));
    }
    echo "\n\n";
}

// Verificar si es un problema de Latin-1 a UTF-8
echo "=== Probando conversión ===\n";

$testText = "econom├¡a";
echo "Original: $testText\n";

// El patrón ├ es C2 9C en UTF-8, pero podría ser un problema de CP1252
$fixed1 = mb_convert_encoding($testText, 'UTF-8', 'CP1252');
echo "CP1252->UTF-8: $fixed1\n";

$fixed2 = mb_convert_encoding($testText, 'UTF-8', 'ISO-8859-1');  
echo "ISO-8859-1->UTF-8: $fixed2\n";

// El patrón real de Railway:
// ├¡ en el log de Railway significa que la consola está interpretando mal
// Los bytes C3 AD (í en UTF-8) podrían estar siendo mostrados como ├¡ en consola
echo "\n=== Verificando bytes de í correcto ===\n";
$iCorrect = "í";
echo "í correcto hex: ";
for ($i = 0; $i < strlen($iCorrect); $i++) {
    echo sprintf('%02X ', ord($iCorrect[$i]));
}
echo "\n";
