<?php

return [
    /*
    |--------------------------------------------------------------------------
    | n8n Workflow Automation Configuration
    |--------------------------------------------------------------------------
    */

    'url' => env('N8N_INTERNAL_URL', env('N8N_URL', 'http://n8n.railway.internal:5678')),
    
    'public_url' => env('N8N_PUBLIC_URL', env('N8N_URL')),
    
    'api_key' => env('N8N_API_KEY'),

    'webhook_secret' => env('N8N_WEBHOOK_SECRET'),
];
