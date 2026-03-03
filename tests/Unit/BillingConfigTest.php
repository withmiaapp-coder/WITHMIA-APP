<?php

it('returns plan configuration from billing config', function () {
    $plans = config('billing.plans');

    // 4 tiers exist
    expect($plans)->toHaveCount(4);

    // Free tier
    expect($plans['free']['price_monthly'])->toBe(0);
    expect($plans['free']['ai_messages'])->toBe(500);
    expect($plans['free']['max_members'])->toBe(1);
    expect($plans['free']['channels'])->toContain('whatsapp');
    expect($plans['free']['primary_model'])->toBe('gpt-4o-mini');

    // Pro tier
    expect($plans['pro']['price_monthly'])->toBe(24990);
    expect($plans['pro']['ai_messages'])->toBe(2000);
    expect($plans['pro']['max_members'])->toBe(1);
    expect($plans['pro']['channels'])->toHaveCount(5);

    // Business tier
    expect($plans['business']['price_monthly'])->toBe(44990);
    expect($plans['business']['ai_messages'])->toBe(8000);
    expect($plans['business']['max_members'])->toBe(3);

    // Enterprise tier
    expect($plans['enterprise']['price_monthly'])->toBe(149990);
    expect($plans['enterprise']['ai_messages'])->toBe(25000);
    expect($plans['enterprise']['max_members'])->toBe(10);
});

it('has overage pricing configured', function () {
    $overage = config('billing.overage');

    expect($overage['price_per_1000'])->toBe(5990);
    expect($overage['enabled'])->toBeTrue();
    expect($overage['max_extra_messages'])->toBe(5000);
});

it('has Flow.cl gateway configured', function () {
    $flow = config('billing.flow');

    expect($flow)->toHaveKeys(['api_url', 'plan_monthly_id', 'plan_annual_id', 'webhook_url']);
    expect($flow['api_url'])->toBe('https://www.flow.cl/api');
});

it('has dLocal gateway configured', function () {
    $dlocal = config('billing.dlocal');

    expect($dlocal)->toHaveKeys(['api_url', 'webhook_url', 'supported_currencies', 'renewal']);
    expect($dlocal['supported_currencies'])->toContain('BRL', 'MXN', 'CLP', 'USD');
    expect($dlocal['renewal']['retry_days'])->toBe([0, 1, 3, 7]);
    expect($dlocal['renewal']['grace_period_days'])->toBe(3);
});

it('has correct annual discount (~15%)', function () {
    $plans = config('billing.plans');

    // Pro: $24,990/mo vs $254,990/yr ($21,249/mo) = 15% discount
    $proMonthly = $plans['pro']['price_monthly'];
    $proAnnualPerMonth = $plans['pro']['price_annual'] / 12;
    $proDiscount = round((1 - $proAnnualPerMonth / $proMonthly) * 100, 1);
    expect($proDiscount)->toBeGreaterThanOrEqual(14)->toBeLessThanOrEqual(16);

    // Business: same ~15% discount
    $bizMonthly = $plans['business']['price_monthly'];
    $bizAnnualPerMonth = $plans['business']['price_annual'] / 12;
    $bizDiscount = round((1 - $bizAnnualPerMonth / $bizMonthly) * 100, 1);
    expect($bizDiscount)->toBeGreaterThanOrEqual(14)->toBeLessThanOrEqual(16);
});
