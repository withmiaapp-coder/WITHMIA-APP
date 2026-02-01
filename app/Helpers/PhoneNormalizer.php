<?php

namespace App\Helpers;

/**
 * Helper para normalización de números de teléfono
 * 
 * Centraliza la lógica de normalización para evitar inconsistencias
 * entre diferentes componentes del sistema.
 */
class PhoneNormalizer
{
    /**
     * Normalizar un número de teléfono a formato base
     * 
     * @param string|null $phone Número de teléfono (puede incluir +, espacios, @lid, @s.whatsapp.net, etc.)
     * @param int $minDigits Mínimo de dígitos para considerar válido
     * @return string|null Número normalizado (solo dígitos) o null si es inválido
     * 
     * Ejemplos:
     * - "+56912345678@s.whatsapp.net" → "56912345678"
     * - "5491112345678@lid" → "5491112345678"
     * - "+1 (555) 123-4567" → "15551234567"
     * - "12345" → null (muy corto)
     */
    public static function normalize(?string $phone, int $minDigits = 8): ?string
    {
        if (empty($phone)) {
            return null;
        }

        // Remover sufijos de WhatsApp
        $phone = preg_replace('/@(lid|s\.whatsapp\.net|c\.us|g\.us|broadcast)$/', '', $phone);
        
        // Remover todo excepto dígitos
        $normalized = preg_replace('/[^0-9]/', '', $phone);
        
        // Validar longitud mínima
        if (strlen($normalized) < $minDigits) {
            return null;
        }

        return $normalized;
    }

    /**
     * Obtener los últimos N dígitos del teléfono normalizado
     * 
     * Útil para comparar números que pueden tener diferentes códigos de país.
     * Por ejemplo: +56912345678 y 912345678 ambos terminan en "912345678"
     * 
     * @param string|null $phone Número de teléfono
     * @param int $digits Cantidad de dígitos a extraer (default: 10)
     * @return string|null Últimos N dígitos o null si es inválido
     */
    public static function getLastDigits(?string $phone, int $digits = 10): ?string
    {
        $normalized = self::normalize($phone);
        
        if ($normalized === null) {
            return null;
        }

        // Si el número tiene menos dígitos que los solicitados, devolver todos
        if (strlen($normalized) <= $digits) {
            return $normalized;
        }

        return substr($normalized, -$digits);
    }

    /**
     * Verificar si dos números de teléfono son el mismo contacto
     * 
     * Compara los últimos 10 dígitos para manejar diferencias en código de país.
     * 
     * @param string|null $phone1 Primer número
     * @param string|null $phone2 Segundo número
     * @return bool True si son el mismo número
     */
    public static function isSamePhone(?string $phone1, ?string $phone2): bool
    {
        $norm1 = self::getLastDigits($phone1);
        $norm2 = self::getLastDigits($phone2);

        if ($norm1 === null || $norm2 === null) {
            return false;
        }

        return $norm1 === $norm2;
    }

    /**
     * Detectar si es un número de grupo o broadcast
     * 
     * @param string|null $identifier Identificador de WhatsApp
     * @return bool True si es grupo o broadcast
     */
    public static function isGroup(?string $identifier): bool
    {
        if (empty($identifier)) {
            return false;
        }

        return strpos($identifier, '@g.us') !== false 
            || strpos($identifier, '@broadcast') !== false;
    }

    /**
     * Detectar si es un LID (Link Identity)
     * 
     * @param string|null $identifier Identificador de WhatsApp
     * @return bool True si es un LID
     */
    public static function isLid(?string $identifier): bool
    {
        if (empty($identifier)) {
            return false;
        }

        return strpos($identifier, '@lid') !== false;
    }

    /**
     * Detectar si es un número real de WhatsApp
     * 
     * @param string|null $identifier Identificador de WhatsApp
     * @return bool True si es número real
     */
    public static function isRealNumber(?string $identifier): bool
    {
        if (empty($identifier)) {
            return false;
        }

        return strpos($identifier, '@s.whatsapp.net') !== false;
    }
}
