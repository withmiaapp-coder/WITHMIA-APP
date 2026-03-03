<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Currency Detection & Conversion Service
 *
 * - Detects user country from IP (ip-api.com free tier, 45 req/min)
 * - Converts CLP prices to local LATAM currency using live exchange rates
 * - Caches exchange rates for 6 hours (they don't change that fast)
 *
 * Supported currencies: CLP, BRL, MXN, ARS, COP, PEN, UYU, PYG, BOB, USD
 */
class CurrencyService
{
    /**
     * Country → currency mapping for LATAM + fallback USD.
     */
    private const COUNTRY_CURRENCY_MAP = [
        'CL' => 'CLP', // Chile
        'BR' => 'BRL', // Brasil
        'MX' => 'MXN', // México
        'AR' => 'ARS', // Argentina
        'CO' => 'COP', // Colombia
        'PE' => 'PEN', // Perú
        'UY' => 'UYU', // Uruguay
        'PY' => 'PYG', // Paraguay
        'BO' => 'BOB', // Bolivia
        'EC' => 'USD', // Ecuador (dolarizado)
        'PA' => 'USD', // Panamá (dolarizado)
        'SV' => 'USD', // El Salvador
        'CR' => 'CRC', // Costa Rica
        'GT' => 'GTQ', // Guatemala
        'HN' => 'HNL', // Honduras
        'NI' => 'NIO', // Nicaragua
        'DO' => 'DOP', // República Dominicana
        'VE' => 'USD', // Venezuela (usan USD)
        'US' => 'USD',
        'CA' => 'CAD',
    ];

    /**
     * Currency → country code for dLocal (ISO 3166-1 alpha-2).
     */
    private const CURRENCY_COUNTRY_MAP = [
        'CLP' => 'CL',
        'BRL' => 'BR',
        'MXN' => 'MX',
        'ARS' => 'AR',
        'COP' => 'CO',
        'PEN' => 'PE',
        'UYU' => 'UY',
        'PYG' => 'PY',
        'BOB' => 'BO',
        'CRC' => 'CR',
        'GTQ' => 'GT',
        'HNL' => 'HN',
        'NIO' => 'NI',
        'DOP' => 'DO',
        'USD' => 'US',
        'CAD' => 'CA',
    ];

    /**
     * Currency display names — for user-facing labels.
     */
    private const CURRENCY_NAMES = [
        'CLP' => 'Peso Chileno',
        'BRL' => 'Real Brasileño',
        'MXN' => 'Peso Mexicano',
        'ARS' => 'Peso Argentino',
        'COP' => 'Peso Colombiano',
        'PEN' => 'Sol Peruano',
        'UYU' => 'Peso Uruguayo',
        'PYG' => 'Guaraní',
        'BOB' => 'Boliviano',
        'CRC' => 'Colón Costarricense',
        'GTQ' => 'Quetzal',
        'HNL' => 'Lempira',
        'NIO' => 'Córdoba',
        'DOP' => 'Peso Dominicano',
        'USD' => 'Dólar USD',
        'CAD' => 'Dólar Canadiense',
    ];

    /**
     * Currencies that use 0 decimal places.
     */
    private const ZERO_DECIMAL_CURRENCIES = ['CLP', 'PYG', 'COP'];

    /**
     * Detect user's country from IP address.
     *
     * Uses ip-api.com (free, 45 req/min, no key needed).
     * Caches result per IP for 24 hours.
     *
     * @return array{country_code: string, country_name: string, currency: string, city: string|null}
     */
    public function detectCountry(?string $ip = null): array
    {
        $ip = $ip ?: request()->ip();

        // Localhost / private IP → default to Chile
        if (in_array($ip, ['127.0.0.1', '::1']) || $this->isPrivateIp($ip)) {
            return [
                'country_code' => 'CL',
                'country_name' => 'Chile',
                'currency'     => 'CLP',
                'city'         => null,
            ];
        }

        return Cache::remember("geo_ip:{$ip}", now()->addHours(24), function () use ($ip) {
            try {
                $response = Http::timeout(5)->get("http://ip-api.com/json/{$ip}", [
                    'fields' => 'status,countryCode,country,city',
                ]);

                if ($response->successful() && ($response->json('status') === 'success')) {
                    $countryCode = strtoupper($response->json('countryCode', 'CL'));
                    return [
                        'country_code' => $countryCode,
                        'country_name' => $response->json('country', 'Chile'),
                        'currency'     => self::COUNTRY_CURRENCY_MAP[$countryCode] ?? 'USD',
                        'city'         => $response->json('city'),
                    ];
                }
            } catch (\Exception $e) {
                Log::warning('CurrencyService: geo IP lookup failed', ['ip' => $ip, 'error' => $e->getMessage()]);
            }

            // Fallback: Chile
            return [
                'country_code' => 'CL',
                'country_name' => 'Chile',
                'currency'     => 'CLP',
                'city'         => null,
            ];
        });
    }

    /**
     * Get the currency for the given country code.
     */
    public function currencyForCountry(string $countryCode): string
    {
        return self::COUNTRY_CURRENCY_MAP[strtoupper($countryCode)] ?? 'USD';
    }

    /**
     * Get the country code for the given currency.
     */
    public function countryForCurrency(string $currency): string
    {
        return self::CURRENCY_COUNTRY_MAP[strtoupper($currency)] ?? 'US';
    }

    /**
     * Get the display name for a currency.
     */
    public function currencyName(string $currency): string
    {
        return self::CURRENCY_NAMES[strtoupper($currency)] ?? $currency;
    }

    /**
     * Convert amount from CLP to target currency using live exchange rates.
     *
     * Strategy: CLP → USD → target currency
     * Uses exchangerate-api.com free tier (1500 req/month, no key needed).
     * Caches rates for 6 hours.
     *
     * @param  int|float  $amountCLP  Amount in CLP
     * @param  string     $targetCurrency  Target ISO currency (BRL, MXN, etc.)
     * @return array{amount: float, rate: float, currency: string}
     */
    public function convertFromCLP(int|float $amountCLP, string $targetCurrency): array
    {
        $targetCurrency = strtoupper($targetCurrency);

        // Same currency — no conversion
        if ($targetCurrency === 'CLP') {
            return [
                'amount'   => (float) $amountCLP,
                'rate'     => 1.0,
                'currency' => 'CLP',
            ];
        }

        $rates = $this->getExchangeRates();

        $clpToUsd = $rates['CLP'] ?? null;
        $targetRate = $rates[$targetCurrency] ?? null;

        if (!$clpToUsd || !$targetRate) {
            Log::warning('CurrencyService: missing exchange rates', [
                'clp_rate' => $clpToUsd,
                'target'   => $targetCurrency,
                'target_rate' => $targetRate,
            ]);
            // Fallback: use approximate hardcoded rates (March 2026)
            return $this->fallbackConversion($amountCLP, $targetCurrency);
        }

        // Convert: CLP → USD → target
        // rates are relative to USD (1 USD = X currency)
        $amountUsd = $amountCLP / $clpToUsd;
        $amountTarget = $amountUsd * $targetRate;

        // Round appropriately for the currency
        $rounded = $this->roundForCurrency($amountTarget, $targetCurrency);

        return [
            'amount'   => $rounded,
            'rate'     => round($targetRate / $clpToUsd, 8),
            'currency' => $targetCurrency,
        ];
    }

    /**
     * Get full pricing for a plan in the target currency.
     *
     * @param  string  $plan     Plan key (pro, business, enterprise)
     * @param  string  $currency Target currency
     * @return array{monthly: float, annual: float, currency: string, per_member_monthly: float, per_member_annual: float, overage_per_1000: float}
     */
    public function getPlanPricing(string $plan, string $currency): array
    {
        $planConfig = config("billing.plans.{$plan}");

        if (!$planConfig) {
            return [];
        }

        $monthly = $this->convertFromCLP($planConfig['price_monthly'], $currency);
        $annual  = $this->convertFromCLP($planConfig['price_annual'], $currency);
        $memberMonthly = $this->convertFromCLP(config('billing.per_member_monthly', 10500), $currency);
        $memberAnnual  = $this->convertFromCLP(config('billing.per_member_annual', 107100), $currency);
        $overagePer1000 = $this->convertFromCLP(config('billing.overage.price_per_1000', 5990), $currency);

        return [
            'plan'                => $plan,
            'currency'            => $currency,
            'monthly'             => $monthly['amount'],
            'annual'              => $annual['amount'],
            'per_member_monthly'  => $memberMonthly['amount'],
            'per_member_annual'   => $memberAnnual['amount'],
            'overage_per_1000'    => $overagePer1000['amount'],
            'exchange_rate'       => $monthly['rate'],
        ];
    }

    /**
     * Get all plan pricings in a target currency.
     *
     * @return array
     */
    public function getAllPlanPricings(string $currency): array
    {
        $result = [];
        foreach (['free', 'pro', 'business', 'enterprise'] as $plan) {
            $result[$plan] = $this->getPlanPricing($plan, $currency);
        }
        return $result;
    }

    /**
     * Determine the appropriate payment gateway for a country.
     *
     * Chile → Flow.cl (local gateway, lower fees)
     * All other countries → dLocal (international LATAM gateway)
     */
    public function gatewayForCountry(string $countryCode): string
    {
        return strtoupper($countryCode) === 'CL' ? 'flow' : 'dlocal';
    }

    /**
     * Get exchange rates from API (cached 6 hours).
     *
     * Uses open.er-api.com (free tier, no key, 1500 req/month).
     * Returns rates relative to USD (1 USD = X currency).
     *
     * @return array<string, float>
     */
    private function getExchangeRates(): array
    {
        return Cache::remember('exchange_rates_usd', now()->addHours(6), function () {
            try {
                $response = Http::timeout(10)->get('https://open.er-api.com/v6/latest/USD');

                if ($response->successful() && $response->json('result') === 'success') {
                    $rates = $response->json('rates', []);
                    Log::info('CurrencyService: exchange rates updated', [
                        'source' => 'open.er-api.com',
                        'clp'    => $rates['CLP'] ?? 'N/A',
                        'brl'    => $rates['BRL'] ?? 'N/A',
                        'mxn'    => $rates['MXN'] ?? 'N/A',
                    ]);
                    return $rates;
                }
            } catch (\Exception $e) {
                Log::warning('CurrencyService: exchange rate API failed', ['error' => $e->getMessage()]);
            }

            // Fallback hardcoded rates (approximate March 2026)
            return $this->fallbackRates();
        });
    }

    /**
     * Fallback conversion with hardcoded approximate rates.
     * Used when API is unavailable.
     */
    private function fallbackConversion(int|float $amountCLP, string $targetCurrency): array
    {
        $rates = $this->fallbackRates();
        $clpRate = $rates['CLP'] ?? 950;
        $targetRate = $rates[$targetCurrency] ?? 1;

        $amountUsd = $amountCLP / $clpRate;
        $amountTarget = $amountUsd * $targetRate;
        $rounded = $this->roundForCurrency($amountTarget, $targetCurrency);

        return [
            'amount'   => $rounded,
            'rate'     => round($targetRate / $clpRate, 8),
            'currency' => $targetCurrency,
        ];
    }

    /**
     * Hardcoded fallback rates (USD base) — approximate March 2026.
     * Only used when exchange rate API fails.
     */
    private function fallbackRates(): array
    {
        return [
            'USD' => 1.0,
            'CLP' => 950.0,
            'BRL' => 5.8,
            'MXN' => 20.5,
            'ARS' => 1050.0,
            'COP' => 4300.0,
            'PEN' => 3.75,
            'UYU' => 42.0,
            'PYG' => 7500.0,
            'BOB' => 6.91,
            'CRC' => 510.0,
            'GTQ' => 7.75,
            'HNL' => 25.0,
            'NIO' => 36.5,
            'DOP' => 60.0,
            'CAD' => 1.36,
            'EUR' => 0.92,
        ];
    }

    /**
     * Round appropriately for the target currency.
     *
     * Zero-decimal currencies (CLP, PYG, COP) → round to nearest 10 or 100
     * Others → round to 2 decimals
     */
    private function roundForCurrency(float $amount, string $currency): float
    {
        if (in_array($currency, self::ZERO_DECIMAL_CURRENCIES)) {
            // Round to nearest 10 for "clean" pricing
            return round($amount / 10) * 10;
        }

        // For PYG, round to 100 
        if ($currency === 'PYG') {
            return round($amount / 100) * 100;
        }

        // Standard: 2 decimal places
        return round($amount, 2);
    }

    /**
     * Check if an IP address is private/local.
     */
    private function isPrivateIp(string $ip): bool
    {
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;
    }

    /**
     * Format an amount for display with currency symbol.
     */
    public static function formatPrice(float $amount, string $currency): string
    {
        $symbols = [
            'CLP' => '$',
            'BRL' => 'R$',
            'MXN' => '$',
            'ARS' => '$',
            'COP' => '$',
            'PEN' => 'S/',
            'UYU' => '$',
            'PYG' => '₲',
            'BOB' => 'Bs',
            'CRC' => '₡',
            'GTQ' => 'Q',
            'HNL' => 'L',
            'NIO' => 'C$',
            'DOP' => 'RD$',
            'USD' => 'US$',
            'CAD' => 'CA$',
        ];

        $symbol = $symbols[strtoupper($currency)] ?? $currency . ' ';

        if (in_array($currency, self::ZERO_DECIMAL_CURRENCIES) || $currency === 'PYG') {
            return $symbol . number_format($amount, 0, ',', '.');
        }

        return $symbol . number_format($amount, 2, ',', '.');
    }
}
