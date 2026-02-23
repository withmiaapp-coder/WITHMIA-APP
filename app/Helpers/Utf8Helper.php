<?php

namespace App\Helpers;

/**
 * Helper para manejar encoding UTF-8 y corregir mojibake
 */
class Utf8Helper
{
    /**
     * Corregir mojibake y problemas de encoding en texto
     * 
     * @param string|null $text
     * @return string|null
     */
    public static function fix(?string $text): ?string
    {
        if ($text === null || $text === '') {
            return $text;
        }

        $fixed = $text;

        // 1. Remover caracteres de reemplazo Unicode (U+FFFD)
        $fixed = preg_replace('/\x{FFFD}/u', '', $fixed);
        
        // 2. Intentar arreglar doble encoding UTF-8
        // Detect actual double-encoding signatures (e.g. "Ã±" for ñ, "Ã©" for é)
        // Pattern: C3 82/83 followed by C2 xx — NOT just any valid 2-byte UTF-8 char
        if (preg_match('/\xC3[\x82\x83]\xC2[\x80-\xBF]/', $fixed)) {
            $decoded = @iconv('UTF-8', 'ISO-8859-1', $fixed);
            if ($decoded !== false && mb_check_encoding($decoded, 'UTF-8')) {
                $fixed = $decoded;
            }
        }

        // 3. Asegurar UTF-8 valido
        if (!mb_check_encoding($fixed, 'UTF-8')) {
            $detected = mb_detect_encoding($fixed, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
            if ($detected && $detected !== 'UTF-8') {
                $fixed = mb_convert_encoding($fixed, 'UTF-8', $detected);
            }
        }

        // 4. Limpiar cualquier byte invalido restante
        $fixed = mb_convert_encoding($fixed, 'UTF-8', 'UTF-8');

        return $fixed;
    }

    /**
     * Verificar si el texto contiene problemas de encoding
     * 
     * @param string $text
     * @return bool
     */
    public static function hasMojibake(string $text): bool
    {
        // Verificar caracter de reemplazo Unicode
        if (preg_match('/\x{FFFD}/u', $text)) {
            return true;
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
     * Asegurar que el texto es UTF-8 valido
     * 
     * @param string|null $text
     * @return string|null
     */
    public static function ensureUtf8(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }

        if (mb_check_encoding($text, 'UTF-8')) {
            return $text;
        }

        $detected = mb_detect_encoding($text, ['UTF-8', 'ISO-8859-1', 'Windows-1252', 'ASCII'], true);
        
        if ($detected && $detected !== 'UTF-8') {
            return mb_convert_encoding($text, 'UTF-8', $detected);
        }

        return mb_convert_encoding($text, 'UTF-8', 'ISO-8859-1');
    }

    /**
     * Limpiar texto para JSON
     * 
     * @param string|null $text
     * @return string|null
     */
    public static function cleanForJson(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }

        $clean = self::fix($text);
        $clean = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $clean);

        return $clean;
    }
}
