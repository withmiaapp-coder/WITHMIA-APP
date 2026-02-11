<?php

namespace App\Traits;

use Illuminate\Support\Facades\Log;

/**
 * Trait unificado para resolver configuración de Chatwoot
 * Evita duplicación de código entre ChatwootController y EvolutionApiController
 * 
 * USO:
 * 1. Usar el trait en el controlador: use ResolvesChatwootConfig;
 * 2. En el middleware/constructor: $this->initializeChatwootFromUser(auth()->user());
 * 3. Acceder a las propiedades: $this->chatwootAccountId, $this->chatwootToken, etc.
 */
trait ResolvesChatwootConfig
{
    protected ?int $chatwootUserId = null;
    protected ?string $chatwootAccountId = null;
    protected ?int $chatwootInboxId = null;
    protected ?string $chatwootToken = null;
    protected ?string $chatwootBaseUrl = null;
    protected ?string $chatwootCompanySlug = null;

    /**
     * Inicializar configuración de Chatwoot desde el usuario autenticado
     * Método principal que reemplaza initializeChatwootConfig() y getChatwootConfigForUser()
     */
    protected function initializeChatwootFromUser($user): void
    {
        $this->chatwootBaseUrl = config('chatwoot.url', 'http://localhost:3000');
        
        if (!$user) {
            $this->chatwootUserId = null;
            $this->chatwootAccountId = config('chatwoot.account_id', '1');
            $this->chatwootToken = config('chatwoot.platform_token');
            $this->chatwootInboxId = null;
            $this->chatwootCompanySlug = null;
            return;
        }

        // 🚀 CACHE: Evitar recálculos en cada request (3 minutos)
        $config = $this->resolveChatwootConfig($user);
        $this->applyChatwootConfig($config);
        
        Log::debug('Chatwoot config initialized via Trait', [
            'user_id' => $this->chatwootUserId,
            'account_id' => $this->chatwootAccountId,
            'inbox_id' => $this->chatwootInboxId,
            'company_slug' => $this->chatwootCompanySlug
        ]);
    }

    /**
     * Resolver configuración de Chatwoot para un usuario
     * Con cache de 3 minutos para evitar recálculos
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

            $inboxId = $user->chatwoot_inbox_id 
                ?: ($company ? $company->chatwoot_inbox_id : null) 
                ?: null;

            // PRIORIDAD: 1. Token de company, 2. Token de usuario, 3. Token platform
            if ($company && $company->chatwoot_api_key) {
                $token = $company->chatwoot_api_key;
            } elseif ($user->chatwoot_agent_token) {
                $token = $user->chatwoot_agent_token;
            } else {
                $token = config('chatwoot.platform_token');
            }

            return [
                'user_id' => $user->id,
                'account_id' => $accountId,
                'inbox_id' => $inboxId,
                'token' => $token,
                'base_url' => config('chatwoot.url', 'http://localhost:3000'),
                'company_slug' => $company ? $company->slug : null,
                'company_name' => $company ? $company->name : null,
                'email' => $user->email,
            ];
        });
    }

    /**
     * Obtener configuración para Evolution API (formato específico)
     * Reemplaza getChatwootConfigForUser() en EvolutionApiController
     */
    protected function getChatwootConfigForEvolution($user): array|bool
    {
        if (!$user) {
            return true; // Usar config global
        }

        $cacheKey = "chatwoot_evolution_config_{$user->id}";
        
        return cache()->remember($cacheKey, 300, function () use ($user) {
            $company = $user->company;
            
            if ($company && $company->chatwoot_account_id) {
                $chatwootUrl = config('chatwoot.url');
                $accountId = $company->chatwoot_account_id;
                
                $inboxName = $user->company_slug 
                    ? "WhatsApp {$user->company_slug}" 
                    : "WhatsApp {$company->name}";
                
                $apiToken = $company->chatwoot_api_key;
                
                if ($apiToken) {
                    return [
                        'account_id' => $accountId,
                        'token' => $apiToken,
                        'url' => $chatwootUrl,
                        'inbox_name' => $inboxName,
                        'auto_create' => true
                    ];
                }
                
                $platformToken = config('chatwoot.platform_token');
                return [
                    'account_id' => $accountId,
                    'token' => $platformToken,
                    'url' => $chatwootUrl,
                    'inbox_name' => $inboxName,
                    'auto_create' => true
                ];
            }

            return true;
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
            'token' => config('chatwoot.platform_token'),
            'base_url' => config('chatwoot.url', 'http://localhost:3000'),
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
        $this->chatwootCompanySlug = $config['company_slug'];
    }

    /**
     * Invalidar cache de configuración para un usuario
     */
    public static function clearConfigCache(int $userId): void
    {
        cache()->forget("chatwoot_config_resolved_{$userId}");
        cache()->forget("chatwoot_evolution_config_{$userId}");
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
