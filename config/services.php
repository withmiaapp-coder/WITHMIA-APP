<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    */

    "mailgun" => [
        "domain" => env("MAILGUN_DOMAIN"),
        "secret" => env("MAILGUN_SECRET"),
        "endpoint" => env("MAILGUN_ENDPOINT", "api.mailgun.net"),
        "scheme" => "https",
    ],

    "postmark" => [
        "token" => env("POSTMARK_TOKEN"),
    ],

    "slack" => [
        "notifications" => [
            "bot_user_oauth_token" => env("SLACK_BOT_USER_OAUTH_TOKEN"),
            "channel" => env("SLACK_BOT_USER_DEFAULT_CHANNEL"),
        ],
    ],

    "openai" => [
        "api_key" => env("OPENAI_API_KEY"),
    ],

    "baileys" => [
        "url" => env("BAILEYS_API_URL", "http://localhost:3001"),
    ],

    "chatwoot" => [
        "base_url" => env("CHATWOOT_API_BASE_URL", "http://localhost:3000"),
        "api_token" => env("CHATWOOT_PLATFORM_API_TOKEN", ""),
    ],

    "n8n" => [
        "base_url" => env("N8N_PUBLIC_URL", env("N8N_URL")),
        "api_key" => env("N8N_API_KEY"),
        "internal_url" => env("N8N_INTERNAL_URL", env("N8N_URL")),
    ],

    "qdrant" => [
        "host" => env("QDRANT_HOST", env("QDRANT_URL")),
        "api_key" => env("QDRANT_API_KEY"),
    ],
];
