<?php

use App\Services\CurrencyService;

beforeEach(function () {
    $this->service = new CurrencyService();
});

it('detects Chile for CL country code', function () {
    expect($this->service->currencyForCountry('CL'))->toBe('CLP');
});

it('returns BRL for Brazil', function () {
    expect($this->service->currencyForCountry('BR'))->toBe('BRL');
});

it('returns MXN for Mexico', function () {
    expect($this->service->currencyForCountry('MX'))->toBe('MXN');
});

it('returns USD as fallback for unknown countries', function () {
    expect($this->service->currencyForCountry('XX'))->toBe('USD');
});

it('selects Flow gateway for Chile', function () {
    expect($this->service->gatewayForCountry('CL'))->toBe('flow');
});

it('selects dLocal gateway for non-Chile countries', function () {
    expect($this->service->gatewayForCountry('BR'))->toBe('dlocal');
    expect($this->service->gatewayForCountry('MX'))->toBe('dlocal');
    expect($this->service->gatewayForCountry('AR'))->toBe('dlocal');
    expect($this->service->gatewayForCountry('CO'))->toBe('dlocal');
});

it('returns plan pricing for all tiers', function () {
    $plans = config('billing.plans');

    expect($plans)->toHaveKeys(['free', 'pro', 'business', 'enterprise']);
    expect($plans['free']['price_monthly'])->toBe(0);
    expect($plans['pro']['price_monthly'])->toBe(24990);
    expect($plans['business']['price_monthly'])->toBe(44990);
    expect($plans['enterprise']['price_monthly'])->toBe(149990);
});
