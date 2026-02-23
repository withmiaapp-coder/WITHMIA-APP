<?php

namespace App\Traits;

/**
 * Trait para formatear contactos de WhatsApp
 * Compartido entre ContactsExcelExporter y DynamicContactsExcelManager
 */
trait FormatsWhatsAppContacts
{
    /**
     * Verificar si es un contacto de grupo
     */
    protected function isGroupContact($remoteJid): bool
    {
        return str_contains($remoteJid, '@g.us');
    }

    /**
     * Formatear número de teléfono según código de país
     */
    protected function formatPhoneNumber($remoteJid): string
    {
        // Remover sufijos de WhatsApp
        $number = str_replace(['@s.whatsapp.net', '@g.us'], '', $remoteJid);
        
        // Si contiene guión (grupo), tomar solo la primera parte
        if (str_contains($number, '-')) {
            $parts = explode('-', $number);
            $number = $parts[0];
        }

        // Formatear según código de país
        return match (true) {
            // Chile: 569 XXXX XXXX
            strlen($number) == 11 && str_starts_with($number, '569')
                => '+56 9 ' . substr($number, 3, 4) . ' ' . substr($number, 7, 4),
            // Argentina: 54 9 XX XXXX XXXX (móvil con 9)
            str_starts_with($number, '549') && strlen($number) >= 12
                => '+54 9 ' . substr($number, 3, 2) . ' ' . substr($number, 5, 4) . ' ' . substr($number, 9),
            // Argentina fijo: 54 XX XXXX XXXX
            str_starts_with($number, '54') && strlen($number) >= 11
                => '+54 ' . substr($number, 2, 2) . ' ' . substr($number, 4, 4) . ' ' . substr($number, 8),
            // México: 52 1 XX XXXX XXXX (móvil) o 52 XX XXXX XXXX
            str_starts_with($number, '52') && strlen($number) >= 12
                => '+52 ' . substr($number, 2, 2) . ' ' . substr($number, 4, 4) . ' ' . substr($number, 8),
            // Colombia: 57 3XX XXX XXXX (móvil)
            str_starts_with($number, '57') && strlen($number) >= 12
                => '+57 ' . substr($number, 2, 3) . ' ' . substr($number, 5, 3) . ' ' . substr($number, 8),
            // Perú: 51 9XX XXX XXX (móvil)
            str_starts_with($number, '51') && strlen($number) >= 11
                => '+51 ' . substr($number, 2, 3) . ' ' . substr($number, 5, 3) . ' ' . substr($number, 8),
            // España: 34 6XX XX XX XX (móvil)
            str_starts_with($number, '34') && strlen($number) >= 11
                => '+34 ' . substr($number, 2, 3) . ' ' . substr($number, 5, 2) . ' ' . substr($number, 7, 2) . ' ' . substr($number, 9),
            // Brasil: 55 XX XXXXX XXXX
            str_starts_with($number, '55') && strlen($number) >= 12
                => '+55 ' . substr($number, 2, 2) . ' ' . substr($number, 4, 5) . ' ' . substr($number, 9),
            // Default: +CÓDIGO NÚMERO sin formateo específico
            default => '+' . $number,
        };
    }
}
