<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\Company;
use App\Services\ChatwootService;
use Illuminate\Support\Str;

class DashboardController extends Controller
{
    public function show($companySlug = null): \Inertia\Response|\Illuminate\Http\RedirectResponse
    {
        $user = Auth::user();

        // Si no se proporciona un slug, usar el slug de la empresa del usuario
        if (!$companySlug) {
            $companySlug = $user->company_slug ?? Str::slug($user->name ?? 'mi-empresa');
            // Preservar query params (e.g., ?section=support) en la redirección
            $query = request()->getQueryString();
            $url = "/dashboard/{$companySlug}" . ($query ? "?{$query}" : '');
            return redirect($url);
        }

        // Buscar la empresa: primero por company_slug del usuario, luego por user_id
        $company = null;
        
        // Prioridad 1: Buscar por company_slug del usuario (para usuarios invitados)
        if ($user->company_slug) {
            $company = Company::findBySlugCached($user->company_slug);
        }
        
        // Prioridad 2: Buscar por user_id (para el dueño de la empresa)
        if (!$company) {
            $company = Company::where('user_id', $user->id)->first();
        }

        if (!$company) {
            // Si no existe Company, crear objeto placeholder
            $company = (object) [
                'name' => 'Mi Empresa',
                'description' => '',
                'website' => '',
                'settings' => []
            ];
        }

        // Asegurarse de que company->settings existe y es un array
        if (!isset($company->settings) || !is_array($company->settings)) {
            $company->settings = [];
        }

        // Obtener datos del onboarding con verificaciones seguras
        $onboardingData = [
            'company_name' => $company->name ?? '',
            'company_description' => $company->description ?? '',
            'website' => $company->website ?? '',
            'client_type' => $company->settings['onboarding']['client_type'] ?? '',
            'monthly_conversations' => $company->settings['onboarding']['monthly_conversations'] ?? '0',
            'tools' => isset($company->settings['onboarding']['current_tools']) && is_array($company->settings['onboarding']['current_tools'])
                ? $company->settings['onboarding']['current_tools'] : [],
            'current_tools' => isset($company->settings['onboarding']['current_tools']) && is_array($company->settings['onboarding']['current_tools'])
                ? $company->settings['onboarding']['current_tools'] : [],
            'discovered_via' => isset($company->settings['onboarding']['discovered_via']) && is_array($company->settings['onboarding']['discovered_via'])
                ? $company->settings['onboarding']['discovered_via'] : [],
            'logo_url' => $company->logo_url ?? null,
            'assistant_name' => $company->assistant_name ?? 'WITHMIA'
        ];

        // Estadísticas básicas
        $stats = [
            'conversations' => 0,
            'leads' => 0,
            'conversion_rate' => 0,
            'active_tools' => count($onboardingData['tools'] ?? [])
        ];

        // 🚀 INFORMACIÓN CHATWOOT - MEJORADA con inbox_id y url dinámicos
        $inboxId = $user->chatwoot_inbox_id ?? $company->chatwoot_inbox_id ?? 1;
        $chatwootUrl = config('chatwoot.url');
        
        $chatwootStatus = [
            'provisioned' => $company->chatwoot_provisioned ?? false,
            'account_id' => $company->chatwoot_account_id ?? null,
            'inbox_id' => $inboxId, // ✅ inbox_id dinámico
            'url' => $chatwootUrl, // ✅ NUEVO: url dinámico desde config
            'provisioned_at' => $company->chatwoot_provisioned_at ?? null,
            'available' => !empty($chatwootUrl),
            'auto_provision' => true
        ];



        // 🚀 PREFETCH: Cargar teams y agents directamente de BD
        $prefetchedTeams = [];
        $prefetchedAgents = [];
        
        if ($company->chatwoot_account_id ?? false) {
            $prefetch = app(ChatwootService::class)->prefetchTeamsAndAgents($company->chatwoot_account_id);
            $prefetchedTeams = $prefetch['teams'];
            $prefetchedAgents = $prefetch['agents'];
        }

        return Inertia::render('MainDashboard', [
            'user' => $user->toArray(),
            'company' => is_object($company) ? (array)$company : $company,
            'companySlug' => $companySlug,
            'onboardingData' => $onboardingData,
            'stats' => $stats,
            'chatwoot' => $chatwootStatus,
            'prefetchedTeams' => $prefetchedTeams,
            'prefetchedAgents' => $prefetchedAgents,
            'isSuperAdmin' => $user->isSuperAdmin(),
        ]);
    }

    // Metodo para generar slug de empresa
    public function generateSlug($companyName): string
    {
        return Str::slug($companyName ?? '');
    }
}
