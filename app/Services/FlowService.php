<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Flow.cl API Service
 *
 * Handles all interactions with the Flow.cl payment gateway:
 * - Creating subscriptions
 * - Managing add-ons (additional team members)
 * - Processing webhooks
 *
 * @see https://www.flow.cl/docs/api.html
 */
class FlowService
{
    private string $apiKey;
    private string $secretKey;
    private string $apiUrl;

    public function __construct()
    {
        $this->apiKey    = config('billing.flow.api_key') ?? '';
        $this->secretKey = config('billing.flow.secret_key') ?? '';
        $this->apiUrl    = config('billing.flow.api_url') ?? 'https://www.flow.cl/api';
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
     * Create a payment order (returns url + token for redirect).
     *
     * This is the standard Flow.cl integration that always returns
     * a redirect URL for the customer to enter their payment details.
     *
     * @param  string  $commerceOrder  Unique order ID from our system
     * @param  string  $subject        Payment description
     * @param  int     $amount         Amount in CLP
     * @param  string  $email          Customer email
     * @param  string  $urlConfirmation  Webhook URL for payment confirmation
     * @param  string  $urlReturn      URL to redirect after payment
     * @param  array   $optional       Optional extra data (json encoded)
     * @return array  ['url' => '...', 'token' => '...', 'flowOrder' => '...']
     */
    public function createPayment(
        string $commerceOrder,
        string $subject,
        int $amount,
        string $email,
        string $urlConfirmation,
        string $urlReturn,
        array $optional = []
    ): array {
        $params = [
            'commerceOrder'   => $commerceOrder,
            'subject'         => $subject,
            'currency'        => 'CLP',
            'amount'          => $amount,
            'email'           => $email,
            'urlConfirmation' => $urlConfirmation,
            'urlReturn'       => $urlReturn,
        ];

        if (!empty($optional)) {
            $params['optional'] = json_encode($optional);
        }

        return $this->post('/payment/create', $params);
    }

    /**
     * Get payment status by token.
     */
    public function getPaymentStatus(string $token): array
    {
        return $this->get('/payment/getStatus', [
            'token' => $token,
        ]);
    }

    /* ═══════════════════════════════════════════
       SUBSCRIPTIONS
       ═══════════════════════════════════════════ */

    /**
     * Create a new subscription for a customer.
     *
     * @param  string  $planId       Flow plan identifier (e.g. 'withmia-pro-monthly')
     * @param  string  $customerId   Flow customer ID
     * @param  string  $urlReturn    URL to redirect after payment
     * @param  string  $urlConfirm   Webhook URL for payment confirmation
     * @return array   Flow API response with 'url' + 'token' for redirect
     */
    public function createSubscription(
        string $planId,
        string $customerId,
        string $urlReturn,
        string $urlConfirm
    ): array {
        return $this->post('/subscription/create', [
            'planId'     => $planId,
            'customerId' => $customerId,
            'url_return' => $urlReturn,
            'url_confirm' => $urlConfirm,
        ]);
    }

    /**
     * Get subscription details.
     */
    public function getSubscription(string $subscriptionId): array
    {
        return $this->get('/subscription/get', [
            'subscriptionId' => $subscriptionId,
        ]);
    }

    /**
     * Cancel a subscription.
     */
    public function cancelSubscription(string $subscriptionId): array
    {
        return $this->post('/subscription/cancel', [
            'subscriptionId' => $subscriptionId,
        ]);
    }

    /**
     * Add an add-on (extra member) to an existing subscription.
     */
    public function addAddon(string $subscriptionId, string $addonId, int $quantity = 1): array
    {
        return $this->post('/subscription/addAdditional', [
            'subscriptionId' => $subscriptionId,
            'additionalId'   => $addonId,
            'quantity'        => $quantity,
        ]);
    }

    /**
     * Remove an add-on from an existing subscription.
     */
    public function removeAddon(string $subscriptionId, string $addonId, int $quantity = 1): array
    {
        return $this->post('/subscription/removeAdditional', [
            'subscriptionId' => $subscriptionId,
            'additionalId'   => $addonId,
            'quantity'        => $quantity,
        ]);
    }

    /* ═══════════════════════════════════════════
       CUSTOMERS
       ═══════════════════════════════════════════ */

    /**
     * Create a Flow customer.
     */
    public function createCustomer(string $name, string $email, string $externalId = ''): array
    {
        return $this->post('/customer/create', [
            'name'       => $name,
            'email'      => $email,
            'externalId' => $externalId,
        ]);
    }

    /**
     * Get a customer by email.
     */
    public function getCustomerByEmail(string $email): ?array
    {
        try {
            return $this->get('/customer/getByEmail', [
                'email' => $email,
            ]);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Register a customer's payment method (credit card).
     *
     * Returns 'url' + 'token' to redirect the customer to Flow's
     * card registration page.  After successful registration,
     * Flow can auto-charge subscriptions linked to this customer.
     *
     * @return array  ['url' => '...', 'token' => '...']
     */
    public function registerCustomer(string $customerId, string $urlReturn): array
    {
        return $this->post('/customer/register', [
            'customerId' => $customerId,
            'url_return' => $urlReturn,
        ]);
    }

    /**
     * Get customer registration status.
     */
    public function getCustomerRegisterStatus(string $token): array
    {
        return $this->get('/customer/getRegisterStatus', [
            'token' => $token,
        ]);
    }

    /**
     * Find or create a Flow customer, handling duplicate externalId gracefully.
     *
     * Flow's getByEmail can fail (error 105) even when the customer exists.
     * If createCustomer also fails due to duplicate externalId, we retry
     * with a unique suffix so the checkout can proceed.
     */
    public function findOrCreateCustomer(string $name, string $email, string $externalId): array
    {
        // 1. Try to find existing customer by email
        $customer = $this->getCustomerByEmail($email);
        if ($customer && ($customer['customerId'] ?? null)) {
            Log::info('Flow customer found by email', ['customerId' => $customer['customerId']]);
            return $customer;
        }

        // 2. Try to create new customer
        try {
            $customer = $this->createCustomer($name, $email, $externalId);
            Log::info('Flow customer created', ['customerId' => $customer['customerId'] ?? null]);
            return $customer;
        } catch (\RuntimeException $e) {
            // 3. If customer already exists with this externalId, retry with unique suffix
            if (str_contains($e->getMessage(), 'externalId') || str_contains($e->getMessage(), 'already')) {
                Log::warning('Flow customer duplicate externalId, retrying with unique ID', [
                    'email'      => $email,
                    'externalId' => $externalId,
                ]);
                $uniqueId = $externalId . '_' . time();
                $customer = $this->createCustomer($name, $email, $uniqueId);
                Log::info('Flow customer created with unique ID', [
                    'customerId' => $customer['customerId'] ?? null,
                    'externalId' => $uniqueId,
                ]);
                return $customer;
            }
            throw $e;
        }
    }

    /* ═══════════════════════════════════════════
       SIGNATURE & HTTP
       ═══════════════════════════════════════════ */

    /**
     * Sign parameters with HMAC SHA256 as required by Flow API.
     */
    private function sign(array $params): string
    {
        // Sort params alphabetically by key
        ksort($params);

        // Build the string to sign: key=value concatenated
        $toSign = '';
        foreach ($params as $key => $value) {
            $toSign .= $key . $value;
        }

        return hash_hmac('sha256', $toSign, $this->secretKey);
    }

    /**
     * Make a signed GET request to Flow API.
     */
    private function get(string $endpoint, array $params = []): array
    {
        $params['apiKey'] = $this->apiKey;
        $params['s'] = $this->sign($params);

        $response = Http::timeout(15)
            ->get($this->apiUrl . $endpoint, $params);

        if (!$response->successful()) {
            Log::error('Flow API GET error', [
                'endpoint' => $endpoint,
                'status'   => $response->status(),
                'body'     => $response->body(),
            ]);
            throw new \RuntimeException("Flow API error: {$response->status()} - {$response->body()}");
        }

        return $response->json();
    }

    /**
     * Make a signed POST request to Flow API.
     */
    private function post(string $endpoint, array $params = []): array
    {
        $params['apiKey'] = $this->apiKey;
        $params['s'] = $this->sign($params);

        $response = Http::timeout(15)
            ->asForm()
            ->post($this->apiUrl . $endpoint, $params);

        if (!$response->successful()) {
            Log::error('Flow API POST error', [
                'endpoint' => $endpoint,
                'status'   => $response->status(),
                'body'     => $response->body(),
            ]);
            throw new \RuntimeException("Flow API error: {$response->status()} - {$response->body()}");
        }

        return $response->json();
    }

    /**
     * Verify a webhook signature from Flow.
     */
    public function verifyWebhookSignature(array $data): bool
    {
        if (!isset($data['s'])) {
            return false;
        }

        $signature = $data['s'];
        unset($data['s']);

        $expected = $this->sign($data);

        return hash_equals($expected, $signature);
    }
}
