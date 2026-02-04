<?php

namespace App\Helpers;

/**
 * Patrones de mensajes del sistema que deben ser ignorados
 * Unifica la lógica duplicada entre ChatwootWebhookController y EvolutionApiController
 */
class SystemMessagePatterns
{
    /**
     * Patrones de mensajes del sistema de Evolution/WhatsApp que deben ignorarse
     */
    public const PATTERNS = [
        '🚀 Connection successfully established!',
        'Connection successfully established',
        'QRCode generated',
        'Waiting for QR Code',
        'Connecting...',
        'Connected!',
        'Disconnected',
        'protocolomessage',
        'protocolMessage',
        'Evolution API',
        'EvolutionAPI',
    ];

    /**
     * Prefijos de remitentes del sistema que deben ignorarse
     */
    public const SYSTEM_SENDER_PREFIXES = [
        'status@broadcast',
        '0@',
    ];

    /**
     * Verificar si un mensaje es del sistema y debe ignorarse
     */
    public static function isSystemMessage(?string $content): bool
    {
        if (empty($content)) {
            return false;
        }

        $contentLower = strtolower(trim($content));
        
        foreach (self::PATTERNS as $pattern) {
            if (stripos($content, $pattern) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Verificar si un remitente es del sistema
     */
    public static function isSystemSender(?string $remoteJid): bool
    {
        if (empty($remoteJid)) {
            return false;
        }

        foreach (self::SYSTEM_SENDER_PREFIXES as $prefix) {
            if (str_starts_with($remoteJid, $prefix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Verificar si un mensaje o remitente debe ignorarse
     */
    public static function shouldIgnore(?string $content = null, ?string $remoteJid = null): bool
    {
        return self::isSystemMessage($content) || self::isSystemSender($remoteJid);
    }
}
