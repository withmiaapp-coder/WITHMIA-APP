<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Pricing (CLP – IVA incluido)
    |--------------------------------------------------------------------------
    |
    | Todos los precios están en CLP e incluyen IVA (19%).
    | Conversión de referencia: 1 USD ≈ $950 CLP (mar 2026).
    |
    */

    'currency' => 'CLP',

    /*
    |--------------------------------------------------------------------------
    | Plan definitions
    |--------------------------------------------------------------------------
    |
    | 4 tiers: free, pro, business, enterprise
    | Cada plan define precios, límites de IA, canales y modelos.
    |
    */

    'plans' => [
        'free' => [
            'name' => 'Gratis',
            'price_monthly' => 0,
            'price_annual' => 0,
            'ai_messages' => 500,
            'channels' => ['whatsapp'],
            'max_members' => 1,
            'max_documents' => 0,
            'max_workflows' => 0,
            'primary_model' => 'gpt-4o-mini',
            'fallback_model' => 'gpt-4o-mini',
            'available_models' => ['gpt-4o-mini'],
            'support' => 'community',
        ],
        'pro' => [
            'name' => 'Pro',
            'price_monthly' => (int) env('BILLING_PRO_PRICE_MONTHLY', 24990),
            'price_annual' => (int) env('BILLING_PRO_PRICE_ANNUAL', 254990),
            'ai_messages' => (int) env('BILLING_PRO_AI_MESSAGES', 2000),
            'channels' => ['whatsapp', 'instagram', 'facebook', 'email', 'web'],
            'max_members' => 1,
            'members_included' => 1,
            'max_documents' => 10,
            'max_workflows' => 3,
            'primary_model' => 'gpt-4o-mini',
            'fallback_model' => 'gpt-4o',
            'available_models' => ['gpt-4o-mini', 'gpt-4o'],
            'support' => 'email',
        ],
        'business' => [
            'name' => 'Business',
            'price_monthly' => (int) env('BILLING_BUSINESS_PRICE_MONTHLY', 44990),
            'price_annual' => (int) env('BILLING_BUSINESS_PRICE_ANNUAL', 459990),
            'ai_messages' => (int) env('BILLING_BUSINESS_AI_MESSAGES', 8000),
            'channels' => ['whatsapp', 'instagram', 'facebook', 'email', 'web'],
            'max_members' => 3,
            'members_included' => 3,
            'max_documents' => 50,
            'max_workflows' => 10,
            'primary_model' => 'gpt-4o',
            'fallback_model' => 'gpt-4o-mini',
            'available_models' => ['gpt-4o-mini', 'gpt-4o', 'claude-sonnet'],
            'support' => 'priority',
        ],
        'enterprise' => [
            'name' => 'Enterprise',
            'price_monthly' => (int) env('BILLING_ENTERPRISE_PRICE_MONTHLY', 149990),
            'price_annual' => (int) env('BILLING_ENTERPRISE_PRICE_ANNUAL', 1529990),
            'ai_messages' => (int) env('BILLING_ENTERPRISE_AI_MESSAGES', 25000),
            'channels' => ['whatsapp', 'instagram', 'facebook', 'email', 'web', 'api'],
            'max_members' => 10,
            'members_included' => 10,
            'max_documents' => -1, // unlimited
            'max_workflows' => -1,
            'primary_model' => 'gpt-4o',
            'fallback_model' => 'claude-sonnet',
            'available_models' => ['gpt-4o-mini', 'gpt-4o', 'claude-sonnet', 'claude-opus', 'gemini-pro'],
            'support' => 'dedicated',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Legacy pricing (backward compat)
    |--------------------------------------------------------------------------
    */

    'base_price_monthly' => (int) env('BILLING_PRO_PRICE_MONTHLY', 24990),
    'base_price_annual'  => (int) env('BILLING_PRO_PRICE_ANNUAL', 254990),

    'per_member_monthly' => (int) env('BILLING_PER_MEMBER_MONTHLY', 10500),
    'per_member_annual'  => (int) env('BILLING_PER_MEMBER_ANNUAL', 107100),

    'trial_days' => (int) env('BILLING_TRIAL_DAYS', 0),

    /*
    |--------------------------------------------------------------------------
    | Overage pricing
    |--------------------------------------------------------------------------
    |
    | When a company exceeds their AI message limit.
    | Price per 1,000 extra messages (CLP, IVA incluido).
    |
    */

    'overage' => [
        'price_per_1000' => (int) env('BILLING_OVERAGE_PER_1000', 5990),
        'enabled' => (bool) env('BILLING_OVERAGE_ENABLED', true),
        'max_extra_messages' => (int) env('BILLING_OVERAGE_MAX_EXTRA', 5000),
    ],

    /*
    |--------------------------------------------------------------------------
    | Flow.cl (Chile only)
    |--------------------------------------------------------------------------
    |
    | Plan IDs deben coincidir con los creados en dashboard.flow.cl
    | Flow.cl only processes CLP — used exclusively for Chilean customers.
    |
    */

    'flow' => [
        'api_key'    => env('FLOW_API_KEY'),
        'secret_key' => env('FLOW_SECRET_KEY'),
        'api_url'    => env('FLOW_API_URL', 'https://www.flow.cl/api'),
        'sandbox'    => (bool) env('FLOW_SANDBOX', false),

        // Plan IDs en Flow dashboard
        'plan_monthly_id' => env('FLOW_PLAN_MONTHLY_ID', 'withmia-pro-monthly'),
        'plan_annual_id'  => env('FLOW_PLAN_ANNUAL_ID', 'withmia-pro-annual'),

        // Business plan IDs
        'business_monthly_id' => env('FLOW_BUSINESS_MONTHLY_ID', 'withmia-business-monthly'),
        'business_annual_id'  => env('FLOW_BUSINESS_ANNUAL_ID', 'withmia-business-annual'),

        // Enterprise plan IDs
        'enterprise_monthly_id' => env('FLOW_ENTERPRISE_MONTHLY_ID', 'withmia-enterprise-monthly'),
        'enterprise_annual_id'  => env('FLOW_ENTERPRISE_ANNUAL_ID', 'withmia-enterprise-annual'),

        // Adicional IDs en Flow dashboard
        'addon_member_monthly_id' => env('FLOW_ADDON_MEMBER_MONTHLY_ID', '326'),
        'addon_member_annual_id'  => env('FLOW_ADDON_MEMBER_ANNUAL_ID', '327'),

        // URLs de retorno
        'return_url'  => env('FLOW_RETURN_URL', '/dashboard/{slug}?section=subscription&status=success'),
        'cancel_url'  => env('FLOW_CANCEL_URL', '/dashboard/{slug}?section=subscription&status=cancelled'),
        'webhook_url' => env('FLOW_WEBHOOK_URL', '/api/webhooks/flow'),
    ],

    /*
    |--------------------------------------------------------------------------
    | dLocal Go (International — all LATAM currencies)
    |--------------------------------------------------------------------------
    |
    | dLocal handles payments for ALL countries except Chile (which uses Flow).
    | Prices are converted from CLP to local currency at checkout time.
    | Supports: BRL, MXN, ARS, COP, PEN, UYU, PYG, BOB, CRC, USD, etc.
    |
    | Gateway selection is automatic:
    |   Chile → Flow.cl (subscription API, lower fees ~2.95%)
    |   Other → dLocal Go (payment API, converted currency, fees ~3.5-5%)
    |
    */

    'dlocal' => [
        // ── dLocalGo (Simple Checkout — redirect-based) ──
        'api_key'    => env('DLOCAL_API_KEY'),
        'secret_key' => env('DLOCAL_SECRET_KEY'),
        'api_url'    => env('DLOCAL_API_URL', 'https://api.dlocalgo.com'),

        // ── dLocal Full API (Smart Fields + Recurring) ──
        // These credentials are from the dLocal merchant dashboard (not dLocalGo).
        // Required for card tokenization via Smart Fields and recurring charges.
        'x_login'              => env('DLOCAL_X_LOGIN'),
        'x_trans_key'          => env('DLOCAL_X_TRANS_KEY'),
        'secret_key_full'      => env('DLOCAL_SECRET_KEY_FULL'),
        'smart_fields_api_key' => env('DLOCAL_SMART_FIELDS_API_KEY'),
        'api_url_full'         => env('DLOCAL_API_URL_FULL', 'https://api.dlocal.com'),
        'sandbox'              => (bool) env('DLOCAL_SANDBOX', false),

        // Webhook URL for dLocal payment notifications
        'webhook_url' => env('DLOCAL_WEBHOOK_URL', '/api/webhooks/dlocal'),

        // Return URLs
        'return_url' => env('DLOCAL_RETURN_URL', '/dashboard/{slug}?section=subscription&status=success'),
        'cancel_url' => env('DLOCAL_CANCEL_URL', '/dashboard/{slug}?section=subscription&status=cancelled'),

        // Supported currencies for dLocal
        'supported_currencies' => [
            'BRL', 'MXN', 'ARS', 'COP', 'PEN', 'UYU', 'PYG', 'BOB',
            'CRC', 'GTQ', 'HNL', 'NIO', 'DOP', 'USD', 'CAD', 'CLP',
        ],

        // Recurring renewal settings
        'renewal' => [
            'enabled'          => (bool) env('DLOCAL_RENEWAL_ENABLED', true),
            'retry_days'       => [0, 1, 3, 7],     // Days to retry after failed charge
            'grace_period_days' => 3,                 // Days after expiry before suspension
            'notify_before_days' => 3,                // Email warning X days before renewal
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Gateway selection logic
    |--------------------------------------------------------------------------
    |
    | Automatic gateway selection based on country:
    | - Chile (CL) → Flow.cl (better rates, local subscription support)
    | - Any other LATAM country → dLocal Go (multi-currency support)
    | - Rest of world → dLocal Go with USD
    |
    */

    'gateway_rules' => [
        'default' => 'dlocal',        // Default gateway for unknown countries
        'chile_gateway' => 'flow',     // Chile always uses Flow.cl
        'fallback_currency' => 'USD',  // If country currency not supported, use USD
    ],

];
