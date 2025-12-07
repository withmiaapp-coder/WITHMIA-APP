<?php

return [
    'paths' => ['api/*', 'auth/*', 'login', 'logout', 'check-session'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'https://app.withmia.com',
        'https://accounts.google.com'
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];
