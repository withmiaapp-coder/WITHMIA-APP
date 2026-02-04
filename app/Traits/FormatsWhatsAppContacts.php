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
     * Formatear número de teléfono
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

        // Formatear número chileno si es el caso
        if (strlen($number) == 11 && str_starts_with($number, '569')) {
            return '+56 9 ' . substr($number, 3, 4) . ' ' . substr($number, 7, 4);
        }

        return '+' . $number;
    }
}
