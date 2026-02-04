<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Qdrant Vector Database Configuration
    |--------------------------------------------------------------------------
    */

    'url' => env('RAILWAY_SERVICE_QDRANT_URL') 
        ? 'https://' . ltrim(env('RAILWAY_SERVICE_QDRANT_URL'), 'https://') 
        : env('QDRANT_HOST', 'http://qdrant.railway.internal:6333'),
    
    'api_key' => env('QDRANT_API_KEY'),
];
