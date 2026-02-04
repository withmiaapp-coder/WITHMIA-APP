<?php

/**
 * Chatwoot Configuration
 * Updated: 2026-01-27
 */

return [
    // Super Admin credentials
    'account_id' => env('CHATWOOT_ACCOUNT_ID', '1'),
    'super_admin_token' => env('CHATWOOT_SUPER_ADMIN_TOKEN'),

    // API tokens
    'api_key' => env('CHATWOOT_API_KEY'),
    'api_token' => env('CHATWOOT_PLATFORM_API_TOKEN'),
    'platform_token' => env('CHATWOOT_PLATFORM_API_TOKEN'),
    'token' => env('CHATWOOT_PLATFORM_API_TOKEN'),

    // URLs
    'url' => env('CHATWOOT_URL', 'http://localhost:3000'),
    'base_url' => env('CHATWOOT_API_BASE_URL', 'http://localhost:3000'),

    // Configuration
    'reopen_conversation' => env('CHATWOOT_REOPEN_CONVERSATION', true),
    'merge_brazil_contacts' => env('CHATWOOT_MERGE_BRAZIL_CONTACTS', true),
    'conversation_pending' => env('CHATWOOT_CONVERSATION_PENDING', false),
    'sign_msg' => env('CHATWOOT_SIGN_MSG', false),
    'auto_create' => env('CHATWOOT_AUTO_CREATE', true),
    'import_contacts' => env('CHATWOOT_IMPORT_CONTACTS', false),
    'import_messages' => env('CHATWOOT_IMPORT_MESSAGES', false),
];
