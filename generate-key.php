<?php

/**
 * Script para generar una APP_KEY válida para Laravel
 * 
 * Ejecuta este archivo con: php generate-key.php
 * O simplemente ábrelo en el navegador si tienes PHP configurado
 */

// Generate a random 32-byte key for Laravel AES-256-CBC encryption
$key = base64_encode(random_bytes(32));

echo "==============================================\n";
echo "        LARAVEL APP_KEY GENERADA\n";
echo "==============================================\n\n";

echo "Tu APP_KEY es:\n\n";
echo "base64:" . $key . "\n\n";

echo "==============================================\n";
echo "PASOS PARA CONFIGURAR EN RAILWAY:\n";
echo "==============================================\n";
echo "1. Ve a Railway.app\n";
echo "2. Selecciona tu proyecto 'mia-app-production-1462'\n";
echo "3. Ve a la pestaña 'Variables'\n";
echo "4. Busca o crea la variable 'APP_KEY'\n";
echo "5. Pega el valor completo (con 'base64:')\n";
echo "6. Guarda y espera el redespliegue automático\n";
echo "==============================================\n";

