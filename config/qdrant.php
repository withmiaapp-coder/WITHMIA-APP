<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Qdrant Vector Database Configuration
    |--------------------------------------------------------------------------
    | Prioridad: URL interna de Railway (gratuita, sin SSL) > URL pública > fallback local
    */

    'url' => env('QDRANT_HOST', 
        env('RAILWAY_SERVICE_QDRANT_URL')
            ? 'https://' . preg_replace('#^https?://#', '', env('RAILWAY_SERVICE_QDRANT_URL'))
            : 'http://localhost:6333'
    ),
    
    'api_key' => env('QDRANT_API_KEY'),
];
