<?php

namespace App\Helpers;

/**
 * Helper para manejar encoding UTF-8 y corregir mojibake
 * 
 * Mojibake es cuando texto UTF-8 es interpretado como ISO-8859-1
 * causando que caracteres como "á" se vean como "Ã¡"
 */
class Utf8Helper
{
    /**
     * Mapeo de caracteres mojibake comunes
     */
    private static array $mojibakeMap = [
        // Vocales acentuadas minúsculas
        'Ã¡' => 'á', 'Ã©' => 'é', 'Ã­' => 'í', 'Ã³' => 'ó', 'Ãº' => 'ú',
        // Otros caracteres especiales minúsculas
        'Ã±' => 'ñ', 'Ã¼' => 'ü', 'Ã ' => 'à', 'Ã¨' => 'è', 'Ã¬' => 'ì',
        'Ã²' => 'ò', 'Ã¹' => 'ù', 'Ã¤' => 'ä', 'Ã«' => 'ë', 'Ã¯' => 'ï',
        'Ã¶' => 'ö', 'Ã¿' => 'ÿ', 'Ã§' => 'ç',
        // Mayúsculas acentuadas
        'Ã' => 'Á', 'Ã‰' => 'É', 'Ã' => 'Í', 'Ã"' => 'Ó', 'Ãš' => 'Ú',
        'Ã'' => 'Ñ', 'Ãœ' => 'Ü', 'Ãˆ' => 'È', 'ÃŒ' => 'Ì', 'Ã'' => 'Ò',
        'Ã™' => 'Ù', 'Ã€' => 'À', 'Ã‚' => 'Â', 'ÃŠ' => 'Ê', 'ÃŽ' => 'Î',
        'Ã"' => 'Ô', 'Ã›' => 'Û', 'Ã„' => 'Ä', 'Ã‹' => 'Ë', 'Ã' => 'Ï',
        'Ã–' => 'Ö',
        // Signos de puntuación español
        'Â¡' => '¡', 'Â¿' => '¿', 'Âº' => 'º', 'Âª' => 'ª',
        // Comillas y guiones tipográficos
        'â€"' => '–', 'â€"' => '—', 'â€œ' => '"', 'â€' => '"',
        'â€˜' => ''', 'â€™' => ''', 'â€¦' => '…', 'â€¢' => '•',
        // Moneda
        'â‚¬' => '€',
        // Otros caracteres europeos
        'Å¡' => 'š', 'Å½' => 'Ž', 'Å¾' => 'ž', 'Å'' => 'œ', 'Å"' => 'Œ',
    ];

    /**
     * Corregir mojibake en texto
     * 
     * @param string|null $text
     * @return string|null
     */
    public static function fix(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }

        // 0. Detectar si el texto viene con encoding Latin-1 interpretado como UTF-8
        // Esto ocurre cuando n8n o OpenAI envían texto con encoding incorrecto
        $fixed = $text;
        
        // Detectar patrón común: texto que parece tener doble encoding
        // Por ejemplo: "información" -> bytes UTF-8 leídos como Latin-1 y re-encodados
        if (preg_match('/[\xC2-\xDF][\x80-\xBF]/', $text)) {
            // Intentar decodificar como si fuera UTF-8 doble-encodado
            $decoded = @iconv('UTF-8', 'ISO-8859-1//IGNORE', $text);
            if ($decoded && mb_check_encoding($decoded, 'UTF-8')) {
                $fixed = $decoded;
            }
        }

        // 1. Reemplazo directo de mojibake conocido
        $fixed = str_replace(
            array_keys(self::$mojibakeMap),
            array_values(self::$mojibakeMap),
            $fixed
        );

        // 2. Remover caracteres de reemplazo Unicode (U+FFFD = �)
        // Esto ocurre cuando hay bytes inválidos que no se pueden decodificar
        $fixed = str_replace("\u{FFFD}", '', $fixed);
        $fixed = str_replace('�', '', $fixed); // También el literal
        
        // 3. Si todavía hay problemas, intentar reconversión
        if (!mb_check_encoding($fixed, 'UTF-8')) {
            $detected = mb_detect_encoding($fixed, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
            if ($detected && $detected !== 'UTF-8') {
                $fixed = mb_convert_encoding($fixed, 'UTF-8', $detected);
            }
        }

        // 4. Último recurso: convertir a UTF-8 forzando y limpiando bytes inválidos
        $fixed = mb_convert_encoding($fixed, 'UTF-8', 'UTF-8');

        return $fixed;
    }

    /**
     * Verificar si el texto contiene mojibake
     * 
     * @param string $text
     * @return bool
     */
    public static function hasMojibake(string $text): bool
    {
        // Verificar caracter de reemplazo Unicode (indica bytes inválidos)
        if (str_contains($text, "\u{FFFD}") || str_contains($text, '�')) {
            return true;
        }
        
        // Verificar patrones de mojibake conocidos
        foreach (array_keys(self::$mojibakeMap) as $pattern) {
            if (str_contains($text, $pattern)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Corregir mojibake en array (recursivo)
     * 
     * @param array $data
     * @return array
     */
    public static function fixArray(array $data): array
    {
        $result = [];
        
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $result[$key] = self::fixArray($value);
            } elseif (is_string($value)) {
                $result[$key] = self::fix($value);
            } else {
                $result[$key] = $value;
            }
        }
        
        return $result;
    }

    /**
     * Asegurar que el texto es UTF-8 válido
     * 
     * @param string|null $text
     * @return string|null
     */
    public static function ensureUtf8(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }

        // Si ya es UTF-8 válido, retornar
        if (mb_check_encoding($text, 'UTF-8')) {
            return $text;
        }

        // Intentar detectar encoding y convertir
        $detected = mb_detect_encoding($text, ['UTF-8', 'ISO-8859-1', 'Windows-1252', 'ASCII'], true);
        
        if ($detected && $detected !== 'UTF-8') {
            return mb_convert_encoding($text, 'UTF-8', $detected);
        }

        // Fallback: asumir ISO-8859-1
        return mb_convert_encoding($text, 'UTF-8', 'ISO-8859-1');
    }

    /**
     * Limpiar texto para JSON (quitar caracteres no válidos)
     * 
     * @param string|null $text
     * @return string|null
     */
    public static function cleanForJson(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }

        // Primero corregir mojibake
        $clean = self::fix($text);

        // Remover caracteres de control excepto newline y tab
        $clean = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $clean);

        return $clean;
    }
}
