<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * dLocal Payment Service — Dual-mode
 *
 * Mode 1: dLocalGo Simple Checkout (redirect-based, one-time payments)
 *   - Uses Bearer token auth
 *   - Creates payment links where user pays on dLocal's hosted page
 *   - Suitable for first-time international payments with local payment methods
 *
 * Mode 2: dLocal Full API with Smart Fields (direct card payments + recurring)
 *   - Uses HMAC-SHA256 authentication (X-Login, X-Trans-Key, Authorization)
 *   - Frontend tokenizes card via dLocal.js Smart Fields SDK
 *   - Backend charges card directly + saves card_id for recurring
 *   - Enables automatic subscription renewal (no user action needed)
 *
 * @see https://docs.dlocal.com/reference/api-reference
 * @see https://docs.dlocal.com/docs/smart-fields-1
 */
class DLocalService
{
    // ── dLocalGo (Simple Checkout) credentials ──
    private string $apiKey;
    private string $secretKey;
    private string $apiUrl;

    // ── dLocal Full API (Smart Fields + Recurring) credentials ──
    private string $xLogin;
    private string $xTransKey;
    private string $fullSecretKey;
    private string $fullApiUrl;
    private string $smartFieldsApiKey;

    /**
     * Document type requirements per country for direct card payments.
     * Most LATAM countries require a national ID document to process cards.
     */
    public const COUNTRY_DOCUMENT_TYPES = [
        'BR' => ['type' => 'CPF',     'label' => 'CPF',          'pattern' => '^\d{11}$',       'placeholder' => '12345678901',     'mask' => '###.###.###-##'],
        'AR' => ['type' => 'DNI',     'label' => 'DNI',          'pattern' => '^\d{7,8}$',      'placeholder' => '12345678',        'mask' => null],
        'MX' => ['type' => 'CURP',    'label' => 'CURP',         'pattern' => '^.{18}$',        'placeholder' => 'HEGG560427MVZRGL04', 'mask' => null],
        'CO' => ['type' => 'CC',      'label' => 'Cédula',       'pattern' => '^\d{6,10}$',     'placeholder' => '1234567890',      'mask' => null],
        'PE' => ['type' => 'DNI',     'label' => 'DNI',          'pattern' => '^\d{8}$',        'placeholder' => '12345678',        'mask' => null],
        'UY' => ['type' => 'CI',      'label' => 'C.I.',         'pattern' => '^\d{7,8}$',      'placeholder' => '12345678',        'mask' => null],
        'CL' => ['type' => 'RUT',     'label' => 'RUT',          'pattern' => '^\d{7,8}[\dkK]$','placeholder' => '12345678K',       'mask' => null],
        'PY' => ['type' => 'CI',      'label' => 'C.I.',         'pattern' => '^\d{5,8}$',      'placeholder' => '1234567',         'mask' => null],
        'BO' => ['type' => 'CI',      'label' => 'C.I.',         'pattern' => '^\d{5,10}$',     'placeholder' => '1234567',         'mask' => null],
        'CR' => ['type' => 'CDI',     'label' => 'Cédula',       'pattern' => '^\d{9,12}$',     'placeholder' => '123456789',       'mask' => null],
        'EC' => ['type' => 'CI',      'label' => 'Cédula',       'pattern' => '^\d{10}$',       'placeholder' => '1234567890',      'mask' => null],
        'US' => ['type' => 'SSN',     'label' => 'Last 4 SSN',   'pattern' => '^\d{4}$',        'placeholder' => '1234',            'mask' => null],
    ];

    public function __construct()
    {
        // dLocalGo Simple Checkout
        $this->apiKey    = config('services.dlocal.api_key') ?? '';
        $this->secretKey = config('services.dlocal.secret_key') ?? '';
        $this->apiUrl    = rtrim(config('services.dlocal.api_url') ?? 'https://api.dlocalgo.com', '/');

        // dLocal Full API (Smart Fields)
        $this->xLogin           = config('billing.dlocal.x_login') ?? '';
        $this->xTransKey        = config('billing.dlocal.x_trans_key') ?? '';
        $this->fullSecretKey    = config('billing.dlocal.secret_key_full') ?? '';
        $this->fullApiUrl       = rtrim(config('billing.dlocal.api_url_full') ?? 'https://api.dlocal.com', '/');
        $this->smartFieldsApiKey = config('billing.dlocal.smart_fields_api_key') ?? '';
    }

    /**
     * Check if dLocalGo (Simple Checkout) is configured.
     */
    public function isConfigured(): bool
    {
        return !empty($this->apiKey) && !empty($this->secretKey);
    }

    /**
     * Check if dLocal Full API (Smart Fields + Recurring) is configured.
     */
    public function isSmartFieldsConfigured(): bool
    {
        return !empty($this->xLogin)
            && !empty($this->xTransKey)
            && !empty($this->fullSecretKey)
            && !empty($this->smartFieldsApiKey);
    }

    /**
     * Get the Smart Fields configuration for the frontend.
     *
     * The frontend needs the public API key and country to initialize
     * the dLocal.js SDK and render card form fields.
     *
     * @return array{api_key: string, country: string, locale: string, sdk_url: string}
     */
    public function getSmartFieldsConfig(string $countryCode = 'BR'): array
    {
        $isSandbox = config('billing.dlocal.sandbox', false);

        return [
            'api_key'  => $this->smartFieldsApiKey,
            'country'  => strtoupper($countryCode),
            'locale'   => 'es',
            'sdk_url'  => $isSandbox
                ? 'https://js-sandbox.dlocal.com/'
                : 'https://js.dlocal.com/',
            'sandbox'  => $isSandbox,
            'document' => self::COUNTRY_DOCUMENT_TYPES[strtoupper($countryCode)] ?? null,
        ];
    }

    /* ═══════════════════════════════════════════
       PAYMENTS
       ═══════════════════════════════════════════ */

    /**
     * Create a one-time payment (checkout link).
     *
     * @param  string  $orderId      Unique order reference
     * @param  string  $description  Payment description
     * @param  float   $amount       Amount (in currency)
     * @param  string  $currency     ISO currency code (CLP, BRL, MXN, etc.)
     * @param  string  $email        Customer email
     * @param  string  $successUrl   Redirect URL on success
     * @param  string  $backUrl      Redirect URL on cancel/back
     * @param  string  $notificationUrl  Webhook URL for payment events
     * @param  array   $metadata     Optional metadata
     * @return array   ['id' => '...', 'checkout_url' => '...']
     */
    public function createPayment(
        string $orderId,
        string $description,
        float $amount,
        string $currency,
        string $email,
        string $successUrl,
        string $backUrl,
        string $notificationUrl,
        array $metadata = []
    ): array {
        $payload = [
            'amount'           => $amount,
            'currency'         => $currency,
            'country'          => $this->countryFromCurrency($currency),
            'order_id'         => $orderId,
            'description'      => $description,
            'payer'            => [
                'email' => $email,
            ],
            'success_url'      => $successUrl,
            'back_url'         => $backUrl,
            'notification_url' => $notificationUrl,
        ];

        if (!empty($metadata)) {
            $payload['metadata'] = $metadata;
        }

        return $this->post('/payments', $payload);
    }

    /**
     * Get payment status by payment ID.
     */
    public function getPayment(string $paymentId): array
    {
        return $this->get("/payments/{$paymentId}");
    }

    /**
     * Create a recurring payment (subscription-like).
     *
     * dLocalGo doesn't have native subscriptions, so we use
     * recurring payments via saved payment method.
     *
     * @param  string  $orderId
     * @param  float   $amount
     * @param  string  $currency
     * @param  string  $email
     * @param  string  $notificationUrl
     * @param  array   $metadata
     * @return array
     */
    public function createRecurringPayment(
        string $orderId,
        float $amount,
        string $currency,
        string $email,
        string $successUrl,
        string $backUrl,
        string $notificationUrl,
        array $metadata = []
    ): array {
        $payload = [
            'amount'           => $amount,
            'currency'         => $currency,
            'country'          => $this->countryFromCurrency($currency),
            'order_id'         => $orderId,
            'description'      => 'WITHMIA Subscription',
            'payer'            => [
                'email' => $email,
            ],
            'success_url'      => $successUrl,
            'back_url'         => $backUrl,
            'notification_url' => $notificationUrl,
        ];

        if (!empty($metadata)) {
            $payload['metadata'] = $metadata;
        }

        return $this->post('/payments', $payload);
    }

    /**
     * Refund a payment.
     *
     * @param  string  $paymentId  dLocal payment ID
     * @param  float|null  $amount  Partial refund amount (null = full refund)
     * @return array
     */
    public function refund(string $paymentId, ?float $amount = null): array
    {
        $payload = [
            'payment_id' => $paymentId,
        ];

        if ($amount !== null) {
            $payload['amount'] = $amount;
        }

        return $this->post('/refunds', $payload);
    }

    /* ═══════════════════════════════════════════
       SMART FIELDS — DIRECT CARD PAYMENTS
       (dLocal Full API with HMAC-SHA256 auth)
       ═══════════════════════════════════════════ */

    /**
     * Create a payment using a card token from dLocal Smart Fields.
     *
     * The card token is generated client-side by dLocal.js SDK.
     * On success, the response includes `card.card_id` which can be saved
     * for future recurring charges (no user interaction needed).
     *
     * @param  string  $token         Card token from dLocal.js SDK
     * @param  string  $orderId       Unique order reference
     * @param  float   $amount        Amount to charge
     * @param  string  $currency      ISO currency code
     * @param  string  $country       ISO country code
     * @param  array   $payer         Payer info: name, email, document, document_type
     * @param  string  $description   Payment description
     * @param  string  $notificationUrl  Webhook URL
     * @param  array   $metadata      Optional metadata
     * @return array   Payment response with card.card_id for recurring
     */
    public function createPaymentWithToken(
        string $token,
        string $orderId,
        float $amount,
        string $currency,
        string $country,
        array $payer,
        string $description,
        string $notificationUrl,
        array $metadata = []
    ): array {
        $payload = [
            'amount'              => $amount,
            'currency'            => strtoupper($currency),
            'country'             => strtoupper($country),
            'payment_method_id'   => 'CARD',
            'payment_method_flow' => 'DIRECT',
            'payer'               => [
                'name'     => $payer['name'] ?? 'Customer',
                'email'    => $payer['email'] ?? '',
                'document' => $payer['document'] ?? null,
            ],
            'card' => [
                'token' => $token,
            ],
            'order_id'         => $orderId,
            'description'      => $description,
            'notification_url' => $notificationUrl,
        ];

        // Add document type if provided and country requires it
        if (!empty($payer['document_type'])) {
            $payload['payer']['document_type'] = $payer['document_type'];
        } elseif (isset(self::COUNTRY_DOCUMENT_TYPES[strtoupper($country)])) {
            $payload['payer']['document_type'] = self::COUNTRY_DOCUMENT_TYPES[strtoupper($country)]['type'];
        }

        // Remove null values
        $payload['payer'] = array_filter($payload['payer'], fn($v) => $v !== null);

        if (!empty($metadata)) {
            $payload['metadata'] = $metadata;
        }

        return $this->fullApiPost('/secure_payments', $payload);
    }

    /**
     * Charge a saved card for recurring subscription renewal.
     *
     * Uses the `card_id` obtained from the initial Smart Fields payment.
     * This is a server-to-server charge — no user interaction required.
     *
     * @param  string  $cardId       Saved card_id from initial payment
     * @param  string  $orderId      Unique order reference
     * @param  float   $amount       Amount to charge
     * @param  string  $currency     ISO currency code
     * @param  string  $country      ISO country code
     * @param  array   $payer        Payer info: name, email
     * @param  string  $notificationUrl  Webhook URL
     * @param  array   $metadata     Optional metadata
     * @return array   Payment response
     */
    public function chargeWithCardId(
        string $cardId,
        string $orderId,
        float $amount,
        string $currency,
        string $country,
        array $payer,
        string $notificationUrl,
        array $metadata = []
    ): array {
        $payload = [
            'amount'              => $amount,
            'currency'            => strtoupper($currency),
            'country'             => strtoupper($country),
            'payment_method_id'   => 'CARD',
            'payment_method_flow' => 'DIRECT',
            'payer'               => [
                'name'  => $payer['name'] ?? 'Customer',
                'email' => $payer['email'] ?? '',
            ],
            'card' => [
                'card_id' => $cardId,
            ],
            'order_id'         => $orderId,
            'description'      => 'WITHMIA Subscription Renewal',
            'notification_url' => $notificationUrl,
        ];

        if (!empty($metadata)) {
            $payload['metadata'] = $metadata;
        }

        return $this->fullApiPost('/secure_payments', $payload);
    }

    /**
     * Get a payment by ID from the Full API.
     */
    public function getPaymentFull(string $paymentId): array
    {
        return $this->fullApiGet("/payments/{$paymentId}");
    }

    /* ═══════════════════════════════════════════
       HELPERS
       ═══════════════════════════════════════════ */

    /**
     * Determine the country code from currency.
     */
    public function countryFromCurrency(string $currency): string
    {
        return match (strtoupper($currency)) {
            'CLP' => 'CL',
            'BRL' => 'BR',
            'MXN' => 'MX',
            'ARS' => 'AR',
            'COP' => 'CO',
            'PEN' => 'PE',
            'UYU' => 'UY',
            'PYG' => 'PY',
            'BOB' => 'BO',
            'USD' => 'US',
            default => 'CL',
        };
    }

    /**
     * Verify a webhook notification from dLocal.
     *
     * dLocal sends a HMAC-SHA256 signature in the X-Idempotency-Key
     * and X-Signature headers.
     */
    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        $expected = hash_hmac('sha256', $payload, $this->secretKey);
        return hash_equals($expected, $signature);
    }

    /**
     * Map dLocal payment status to our internal status.
     *
     * dLocal statuses: PENDING, PAID, REJECTED, CANCELLED, EXPIRED, AUTHORIZED
     */
    public function mapStatus(string $dlocalStatus): string
    {
        return match (strtoupper($dlocalStatus)) {
            'PAID', 'AUTHORIZED' => 'active',
            'PENDING'            => 'suspended',
            'REJECTED'           => 'cancelled',
            'CANCELLED'          => 'cancelled',
            'EXPIRED'            => 'cancelled',
            default              => 'suspended',
        };
    }

    /* ═══════════════════════════════════════════
       HTTP
       ═══════════════════════════════════════════ */

    /**
     * Make an authenticated GET request to dLocal API.
     */
    private function get(string $endpoint): array
    {
        $response = Http::timeout(15)
            ->withHeaders($this->authHeaders())
            ->get($this->apiUrl . $endpoint);

        if (!$response->successful()) {
            Log::error('dLocal API GET error', [
                'endpoint' => $endpoint,
                'status'   => $response->status(),
                'body'     => $response->body(),
            ]);
            throw new \RuntimeException("dLocal API error: {$response->status()} - {$response->body()}");
        }

        return $response->json();
    }

    /**
     * Make an authenticated POST request to dLocal API.
     */
    private function post(string $endpoint, array $payload = []): array
    {
        $response = Http::timeout(15)
            ->withHeaders($this->authHeaders())
            ->post($this->apiUrl . $endpoint, $payload);

        if (!$response->successful()) {
            Log::error('dLocal API POST error', [
                'endpoint' => $endpoint,
                'status'   => $response->status(),
                'body'     => $response->body(),
            ]);
            throw new \RuntimeException("dLocal API error: {$response->status()} - {$response->body()}");
        }

        return $response->json();
    }

    /**
     * Build authentication headers for dLocal API.
     *
     * dLocalGo uses Bearer token authentication with API key.
     */
    private function authHeaders(): array
    {
        return [
            'Authorization' => "Bearer {$this->apiKey}",
            'Content-Type'  => 'application/json',
            'Accept'        => 'application/json',
        ];
    }

    /* ═══════════════════════════════════════════
       FULL API HTTP (HMAC-SHA256 Auth)
       Used by Smart Fields + Recurring
       ═══════════════════════════════════════════ */

    /**
     * Make an authenticated GET to the dLocal Full API.
     */
    private function fullApiGet(string $endpoint): array
    {
        $date = gmdate('Y-m-d\TH:i:s.v\Z');
        $body = '';
        $signature = hash_hmac('sha256', $this->xLogin . $date . $body, $this->fullSecretKey);

        $response = Http::timeout(30)
            ->withHeaders([
                'X-Date'        => $date,
                'X-Login'       => $this->xLogin,
                'X-Trans-Key'   => $this->xTransKey,
                'Authorization' => "V2-HMAC-SHA256, Signature: {$signature}",
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ])
            ->get($this->fullApiUrl . $endpoint);

        if (!$response->successful()) {
            Log::error('dLocal Full API GET error', [
                'endpoint' => $endpoint,
                'status'   => $response->status(),
                'body'     => $response->body(),
            ]);
            throw new \RuntimeException("dLocal Full API error: {$response->status()} - {$response->body()}");
        }

        return $response->json();
    }

    /**
     * Make an authenticated POST to the dLocal Full API.
     *
     * Uses HMAC-SHA256 signature: hmac_sha256(X-Login + X-Date + body, secret_key)
     */
    private function fullApiPost(string $endpoint, array $payload = []): array
    {
        $date = gmdate('Y-m-d\TH:i:s.v\Z');
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $signature = hash_hmac('sha256', $this->xLogin . $date . $body, $this->fullSecretKey);

        $response = Http::timeout(30)
            ->withHeaders([
                'X-Date'        => $date,
                'X-Login'       => $this->xLogin,
                'X-Trans-Key'   => $this->xTransKey,
                'Authorization' => "V2-HMAC-SHA256, Signature: {$signature}",
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ])
            ->withBody($body, 'application/json')
            ->post($this->fullApiUrl . $endpoint);

        if (!$response->successful()) {
            Log::error('dLocal Full API POST error', [
                'endpoint' => $endpoint,
                'status'   => $response->status(),
                'body'     => $response->body(),
            ]);
            throw new \RuntimeException("dLocal Full API error: {$response->status()} - {$response->body()}");
        }

        return $response->json();
    }
}
