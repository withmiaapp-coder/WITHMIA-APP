<?php

/**
 * Script para generar claves de Laravel Reverb
 * Ejecutar: php generate-reverb-keys.php
 */

echo "\n🔐 Generando claves de Laravel Reverb...\n\n";

// Generar claves aleatorias
$appId = 'mia-app';
$appKey = bin2hex(random_bytes(16)); // 32 caracteres hexadecimales
$appSecret = bin2hex(random_bytes(32)); // 64 caracteres hexadecimales

echo "✅ Claves generadas exitosamente:\n\n";
echo "# Copiar estas variables al archivo .env o a Railway:\n\n";
echo "REVERB_APP_ID=$appId\n";
echo "REVERB_APP_KEY=$appKey\n";
echo "REVERB_APP_SECRET=$appSecret\n\n";
echo "# Copiar también al frontend (Vite):\n\n";
echo "VITE_REVERB_APP_KEY=$appKey\n";
echo "VITE_PUSHER_APP_KEY=$appKey\n\n";

// Guardar en archivo
$content = "# Laravel Reverb Configuration\n";
$content .= "# Generado el: " . date('Y-m-d H:i:s') . "\n\n";
$content .= "# Backend\n";
$content .= "REVERB_APP_ID=$appId\n";
$content .= "REVERB_APP_KEY=$appKey\n";
$content .= "REVERB_APP_SECRET=$appSecret\n\n";
$content .= "# Frontend (Vite)\n";
$content .= "VITE_REVERB_APP_KEY=$appKey\n";
$content .= "VITE_PUSHER_APP_KEY=$appKey\n";

file_put_contents('.env.reverb', $content);

echo "📋 Guardado en archivo: .env.reverb\n\n";
echo "🚀 Siguiente paso: Copiar las variables a Railway\n";
echo "   1. Abrir Railway dashboard\n";
echo "   2. Ir a Variables de entorno\n";
echo "   3. Pegar las variables de arriba\n";
echo "   4. Deploy automático se iniciará\n\n";
