<?php

namespace App\Traits;

use Illuminate\Support\Facades\Log;

/**
 * Trait unificado para resolver configuración de Chatwoot
 * Evita duplicación de código entre ChatwootController y EvolutionApiController
 */
trait ResolvesChatwootConfig
{
    protected ?int $chatwootUserId = null;
    protected ?string $chatwootAccountId = null;
    protected ?int $chatwootInboxId = null;
    protected ?string $chatwootToken = null;
    protected ?string $chatwootBaseUrl = null;

    /**
     * Resolver configuración de Chatwoot para un usuario
     * Con cache de 3-5 minutos para evitar recálculos
     */
    protected function resolveChatwootConfig($user, int $cacheTtl = 180): array
    {
        if (!$user) {
            return $this->getDefaultChatwootConfig();
        }

        $cacheKey = "chatwoot_config_resolved_{$user->id}";
        
        return cache()->remember($cacheKey, $cacheTtl, function () use ($user) {
            $company = $user->company;
            
            $accountId = $company && $company->chatwoot_account_id
                ? $company->chatwoot_account_id
                : config('chatwoot.account_id', '1');

            $inboxId = $user->chatwoot_inbox_id ?: null;

            // PRIORIDAD: 1. Token de company, 2. Token de usuario, 3. Token platform
            if ($company && $company->chatwoot_api_key) {
                $token = $company->chatwoot_api_key;
            } elseif ($user->chatwoot_agent_token) {
                $token = $user->chatwoot_agent_token;
            } else {
                $token = config('services.chatwoot.api_token');
            }

            return [
                'user_id' => $user->id,
                'account_id' => $accountId,
                'inbox_id' => $inboxId,
                'token' => $token,
                'base_url' => config('services.chatwoot.base_url', 'http://localhost:3000'),
                'company_slug' => $company ? $company->slug : null,
                'company_name' => $company ? $company->name : null,
                'email' => $user->email,
            ];
        });
    }

    /**
     * Configuración por defecto cuando no hay usuario
     */
    protected function getDefaultChatwootConfig(): array
    {
        return [
            'user_id' => null,
            'account_id' => config('chatwoot.account_id', '1'),
            'inbox_id' => null,
            'token' => config('services.chatwoot.api_token'),
            'base_url' => config('services.chatwoot.base_url', 'http://localhost:3000'),
            'company_slug' => null,
            'company_name' => null,
            'email' => null,
        ];
    }

    /**
     * Aplicar configuración resuelta a las propiedades del controlador
     */
    protected function applyChatwootConfig(array $config): void
    {
        $this->chatwootUserId = $config['user_id'];
        $this->chatwootAccountId = $config['account_id'];
        $this->chatwootInboxId = $config['inbox_id'];
        $this->chatwootToken = $config['token'];
        $this->chatwootBaseUrl = $config['base_url'];
    }

    /**
     * Invalidar cache de configuración para un usuario
     */
    public static function clearConfigCache(int $userId): void
    {
        cache()->forget("chatwoot_config_resolved_{$userId}");
        cache()->forget("chatwoot_config_user_{$userId}");
        cache()->forget("chatwoot_init_user_{$userId}");
    }

    /**
     * Obtener nombre del inbox para un usuario/company
     */
    protected function getInboxName($user): string
    {
        $company = $user->company;
        
        if ($user->company_slug) {
            return "WhatsApp {$user->company_slug}";
        }
        
        if ($company && $company->name) {
            return "WhatsApp {$company->name}";
        }
        
        return "WhatsApp Default";
    }
}
