<?php

return [
    'paths' => ['*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'https://app.withmia.com',
        'https://withmia.com',
        'http://localhost:8000',
        'http://localhost:5173',
        'http://127.0.0.1:8000',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['Set-Cookie'],

    'max_age' => 0,

    'supports_credentials' => true,
];
