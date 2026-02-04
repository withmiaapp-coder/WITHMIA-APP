<?php

return [
    /*
    |--------------------------------------------------------------------------
    | n8n Workflow Automation Configuration
    |--------------------------------------------------------------------------
    */

    'url' => env('N8N_INTERNAL_URL', env('N8N_URL', 'http://n8n.railway.internal:5678')),
    
    'api_key' => env('N8N_API_KEY'),
];
