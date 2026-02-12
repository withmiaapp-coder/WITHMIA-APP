<?php

return [

    'default' => env('BROADCAST_CONNECTION', env('BROADCAST_DRIVER', 'reverb')),

    'connections' => [

        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            'options' => [
                'host' => env('REVERB_SERVER_HOST', env('REVERB_HOST', '127.0.0.1')),
                'port' => env('REVERB_SERVER_PORT', env('REVERB_PORT', 6001)),
                'scheme' => env('REVERB_SERVER_SCHEME', env('REVERB_SCHEME', 'http')),
                'useTLS' => env('REVERB_SERVER_SCHEME', env('REVERB_SCHEME', 'http')) === 'https',
            ],
        ],

        'log' => [
            'driver' => 'log',
        ],

        'null' => [
            'driver' => 'null',
        ],

    ],

];