<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Pricing (CLP – IVA incluido)
    |--------------------------------------------------------------------------
    |
    | Todos los precios están en CLP e incluyen IVA (19%).
    | Conversión de referencia: 1 USD ≈ $950 CLP (feb 2026).
    |
    */

    'currency' => 'CLP',

    'base_price_monthly' => (int) env('BILLING_BASE_PRICE_MONTHLY', 19990),
    'base_price_annual'  => (int) env('BILLING_BASE_PRICE_ANNUAL', 189990),

    'per_member_monthly' => (int) env('BILLING_PER_MEMBER_MONTHLY', 9990),
    'per_member_annual'  => (int) env('BILLING_PER_MEMBER_ANNUAL', 95990),

    'trial_days' => (int) env('BILLING_TRIAL_DAYS', 0),

    /*
    |--------------------------------------------------------------------------
    | Flow.cl
    |--------------------------------------------------------------------------
    |
    | Plan IDs deben coincidir con los creados en dashboard.flow.cl
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

        // Adicional IDs en Flow dashboard
        'addon_member_monthly_id' => env('FLOW_ADDON_MEMBER_MONTHLY_ID', '326'),
        'addon_member_annual_id'  => env('FLOW_ADDON_MEMBER_ANNUAL_ID', '327'),

        // URLs de retorno
        'return_url'  => env('FLOW_RETURN_URL', '/dashboard/{slug}?section=subscription&status=success'),
        'cancel_url'  => env('FLOW_CANCEL_URL', '/dashboard/{slug}?section=subscription&status=cancelled'),
        'webhook_url' => env('FLOW_WEBHOOK_URL', '/api/webhooks/flow'),
    ],

];
