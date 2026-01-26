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
        "url" => env("N8N_PUBLIC_URL", env("N8N_URL")), // Alias para compatibilidad
        "api_key" => env("N8N_API_KEY"),
        "internal_url" => env("N8N_INTERNAL_URL", env("N8N_URL")),
        // IDs de credenciales del Super Admin en n8n (configuradas una vez)
        "openai_credential_id" => env("N8N_OPENAI_CREDENTIAL_ID"),
        "qdrant_credential_id" => env("N8N_QDRANT_CREDENTIAL_ID"),
    ],

    "qdrant" => [
        "host" => env("QDRANT_HOST", env("QDRANT_URL")),
        "url" => env("QDRANT_URL", env("QDRANT_HOST")),
        "api_key" => env("QDRANT_API_KEY"),
    ],
];
