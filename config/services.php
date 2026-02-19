<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | Dedicated config files also exist for:
    | - config/chatwoot.php (primary source)
    | - config/n8n.php (primary source) 
    | - config/qdrant.php (primary source)
    | - config/evolution.php (primary source)
    |
    | The entries below are kept for backwards compatibility.
    |
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

    "google" => [
        "client_id" => env("GOOGLE_CLIENT_ID"),
        "cse_api_key" => env("GOOGLE_CSE_API_KEY"),
        "cse_engine_id" => env("GOOGLE_CSE_ENGINE_ID"),
    ],

    "baileys" => [
        "url" => env("BAILEYS_API_URL", "http://localhost:3001"),
    ],

    "timeouts" => [
        "default" => (int) env("HTTP_TIMEOUT_DEFAULT", 10),
        "n8n" => (int) env("HTTP_TIMEOUT_N8N", 120),
        "openai" => (int) env("HTTP_TIMEOUT_OPENAI", 180),
        "training" => (int) env("HTTP_TIMEOUT_TRAINING", 30),
    ],

    "dlocal" => [
        "api_key" => env("DLOCAL_API_KEY"),
        "secret_key" => env("DLOCAL_SECRET_KEY"),
        "api_url" => env("DLOCAL_API_URL", "https://api.dlocalgo.com"),
    ],
];
