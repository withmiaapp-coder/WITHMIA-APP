<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Evolution API Configuration
    |--------------------------------------------------------------------------
    |
    | Configuración para la API de Evolution que maneja las conexiones
    | de WhatsApp multi-tenant para múltiples empresas.
    |
    */

    'api_url' => env('EVOLUTION_API_URL', 'http://localhost:8080'),
    
    'base_url' => env('EVOLUTION_API_URL', 'http://localhost:8080'),
    
    'api_key' => env('EVOLUTION_API_KEY', 'withmia_evolution_api_key_2025_secure_token'),
    
    /*
    |--------------------------------------------------------------------------
    | Instance Naming Strategy
    |--------------------------------------------------------------------------
    |
    | Estrategia para nombrar instancias. Puedes usar:
    | - 'company_id': company_{id} (ej: company_123)
    | - 'company_slug': slug de la empresa (ej: acme_corp)
    | - 'custom': implementa tu propia lógica
    |
    */
    
    'instance_naming' => env('EVOLUTION_INSTANCE_NAMING', 'company_id'),
    
    /*
    |--------------------------------------------------------------------------
    | Webhook Configuration
    |--------------------------------------------------------------------------
    |
    | URL base para recibir webhooks de Evolution API
    |
    */
    
    'webhook_url' => env('EVOLUTION_WEBHOOK_URL', null),
    
    /*
    |--------------------------------------------------------------------------
    | Chatwoot Integration
    |--------------------------------------------------------------------------
    |
    | Configuración para integración con Chatwoot
    |
    */
    
    'chatwoot' => [
        'enabled' => env('EVOLUTION_CHATWOOT_ENABLED', false),
        'url' => env('CHATWOOT_URL', 'https://chatwoot.withmia.com'),
        'account_id' => env('CHATWOOT_ACCOUNT_ID', null),
        'token' => env('CHATWOOT_TOKEN', null),
    ],
    
    /*
    |--------------------------------------------------------------------------
    | QR Code Configuration
    |--------------------------------------------------------------------------
    |
    | Configuración de códigos QR
    |
    */
    
    'qr' => [
        'timeout' => env('EVOLUTION_QR_TIMEOUT', 30), // segundos
        'auto_refresh' => env('EVOLUTION_QR_AUTO_REFRESH', true),
        'refresh_interval' => env('EVOLUTION_QR_REFRESH_INTERVAL', 40), // segundos
    ],
];
