<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Pricing
    |--------------------------------------------------------------------------
    */

    'base_price_monthly' => (int) env('BILLING_BASE_PRICE_MONTHLY', 18),
    'base_price_annual'  => (int) env('BILLING_BASE_PRICE_ANNUAL', 15),

    'per_member_monthly' => (int) env('BILLING_PER_MEMBER_MONTHLY', 10),
    'per_member_annual'  => (int) env('BILLING_PER_MEMBER_ANNUAL', 8),

    'trial_days' => (int) env('BILLING_TRIAL_DAYS', 14),

    /*
    |--------------------------------------------------------------------------
    | dLocal GO
    |--------------------------------------------------------------------------
    */

    // IMPORTANTE: Configurar DLOCAL_CHECKOUT_URL en .env con la URL real de checkout
    'dlocal_checkout_url' => env('DLOCAL_CHECKOUT_URL', ''),

];
