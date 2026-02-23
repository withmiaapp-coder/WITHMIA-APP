<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use App\Models\WhatsAppInstance;
use App\Models\KnowledgeDocument;
use App\Observers\UserObserver;
use App\Observers\WhatsAppInstanceObserver;
use App\Observers\KnowledgeDocumentObserver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ========== UTF-8 Encoding Configuration ==========
        // Set internal encoding to UTF-8
        if (function_exists('mb_internal_encoding')) {
            mb_internal_encoding('UTF-8');
        }
        
        // Set default charset for mb functions
        if (function_exists('mb_http_output')) {
            mb_http_output('UTF-8');
        }
        
        // Set regex encoding
        if (function_exists('mb_regex_encoding')) {
            mb_regex_encoding('UTF-8');
        }
        
        // Force JSON responses to use UTF-8 and not escape unicode
        JsonResponse::macro('withUtf8', function () {
            /** @var JsonResponse $this */
            return $this->setEncodingOptions(
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
            );
        });

        // ========== HTTP Macros para APIs externas ==========
        // 🚀 OPTIMIZACIÓN: Evita repetir headers en cada llamada HTTP
        
        // Macro para Chatwoot API
        Http::macro('chatwoot', function (string $token = null) {
            $token = $token ?? config('chatwoot.platform_token');
            return Http::withHeaders([
                'api_access_token' => $token,
                'Content-Type' => 'application/json',
            ])->timeout(15);
        });

        // Macro para Evolution API
        Http::macro('evolution', function () {
            return Http::withHeaders([
                'apikey' => config('evolution.api_key'),
                'Content-Type' => 'application/json',
            ])->timeout(30);
        });

        // Macro para n8n API
        Http::macro('n8n', function () {
            return Http::withHeaders([
                'X-N8N-API-KEY' => config('n8n.api_key'),
                'Content-Type' => 'application/json',
            ])->timeout(30);
        });
        
        // Set default timezone
        date_default_timezone_set(config('app.timezone', 'UTC'));
        
        // Registrar Observers (siempre activos, compatible con Octane)
        User::observe(UserObserver::class);
        WhatsAppInstance::observe(WhatsAppInstanceObserver::class);
        KnowledgeDocument::observe(KnowledgeDocumentObserver::class);
    }
}