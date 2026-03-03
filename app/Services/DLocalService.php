<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * dLocal (dLocalGo) Payment Service
 *
 * Gateway backup for Flow.cl — enables international payments
 * across all LATAM currencies (BRL, MXN, ARS, COP, PEN, CLP, etc.)
 *
 * Uses dLocalGo Simple Checkout API:
 * @see https://docs.dlocal.com/reference/api-reference
 */
class DLocalService
{
    private string $apiKey;
    private string $secretKey;
    private string $apiUrl;

    public function __construct()
    {
        $this->apiKey    = config('services.dlocal.api_key') ?? '';
        $this->secretKey = config('services.dlocal.secret_key') ?? '';
        $this->apiUrl    = rtrim(config('services.dlocal.api_url') ?? 'https://api.dlocalgo.com', '/');
    }

    /**
     * Check if the service is properly configured.
     */
    public function isConfigured(): bool
    {
        return !empty($this->apiKey) && !empty($this->secretKey);
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
       HELPERS
       ═══════════════════════════════════════════ */

    /**
     * Determine the country code from currency.
     */
    private function countryFromCurrency(string $currency): string
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
}
