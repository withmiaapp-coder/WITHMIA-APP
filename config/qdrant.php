<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Qdrant Vector Database Configuration
    |--------------------------------------------------------------------------
    */

    'url' => env('RAILWAY_SERVICE_QDRANT_URL')
        ? 'https://' . preg_replace('#^https?://#', '', env('RAILWAY_SERVICE_QDRANT_URL'))
        : env('QDRANT_HOST', 'http://qdrant.railway.internal:6333'),
    
    'api_key' => env('QDRANT_API_KEY'),
];
