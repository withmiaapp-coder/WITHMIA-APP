<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatwootService
{
    private string $baseUrl;
    private string $platformToken;

    public function __construct()
    {
        $this->baseUrl = config('chatwoot.url', 'https://chatwoot-admin.withmia.com');
        $this->platformToken = config('chatwoot.platform_token');
    }

    public function createAccount(string $name): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->platformToken,
                'Content-Type' => 'application/json'
            ])->post("$this->baseUrl/platform/api/v1/accounts", [
                'name' => $name
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('Failed to create Chatwoot account: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('Chatwoot account creation failed', [
                'error' => $e->getMessage(),
                'name' => $name
            ]);
            throw $e;
        }
    }

    public function createUser(int $accountId, string $name, string $email, string $password): array
    {
        try {
            $response = Http::withHeaders([
                'api_access_token' => $this->platformToken,
                'Content-Type' => 'application/json'
            ])->post("$this->baseUrl/platform/api/v1/accounts/$accountId/users", [
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'role' => 'administrator'
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            throw new \Exception('Failed to create Chatwoot user: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('Chatwoot user creation failed', [
                'error' => $e->getMessage(),
                'account_id' => $accountId,
                'email' => $email
            ]);
            throw $e;
        }
    }
}
