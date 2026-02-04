<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use App\Models\User;
use App\Models\Company;
use Illuminate\Support\Str;

class DashboardController extends Controller
{
    public function show($companySlug = null)
    {
        $user = Auth::user();

        // Si no se proporciona un slug, usar el slug de la empresa del usuario
        if (!$companySlug) {
            $companySlug = $user->company_slug ?? Str::slug($user->name ?? 'mi-empresa');
            return redirect("/dashboard/{$companySlug}");
        }

        // Buscar la empresa: primero por company_slug del usuario, luego por user_id
        $company = null;
        
        // Prioridad 1: Buscar por company_slug del usuario (para usuarios invitados)
        if ($user->company_slug) {
            $company = Company::where('slug', $user->company_slug)->first();
        }
        
        // Prioridad 2: Buscar por user_id (para el dueño de la empresa)
        if (!$company) {
            $company = Company::where('user_id', $user->id)->first();
        }

        if (!$company) {
            // Si no existe Company, usar datos del User
            $company = (object) [
                'name' => $user->company_name ?? 'Mi Empresa',
                'description' => $user->company_description ?? '',
                'website' => $user->company_website ?? '',
                'settings' => []
            ];
        }

        // Asegurarse de que company->settings existe y es un array
        if (!isset($company->settings) || !is_array($company->settings)) {
            $company->settings = [];
        }

        // Obtener datos del onboarding con verificaciones seguras
        $onboardingData = [
            'company_name' => $company->name ?? $user->company_name ?? '',
            'company_description' => $company->description ?? $user->company_description ?? '',
            'website' => $company->website ?? $user->company_website ?? '',
            'client_type' => $user->use_case ?? $company->settings['onboarding']['client_type'] ?? '',
            'monthly_conversations' => $user->monthly_volume ?? $company->settings['onboarding']['monthly_conversations'] ?? '0',
            'tools' => isset($company->settings['onboarding']['current_tools']) && is_array($company->settings['onboarding']['current_tools'])
                ? $company->settings['onboarding']['current_tools'] : [],
            'current_tools' => isset($company->settings['onboarding']['current_tools']) && is_array($company->settings['onboarding']['current_tools'])
                ? $company->settings['onboarding']['current_tools'] : [],
            'discovered_via' => isset($company->settings['onboarding']['discovered_via']) && is_array($company->settings['onboarding']['discovered_via'])
                ? $company->settings['onboarding']['discovered_via'] : [],
            'logo_url' => $company->logo_url ?? null,
            'assistant_name' => $company->assistant_name ?? 'WITHMIA'
        ];

        // Estadisticas basicas (por ahora mockeadas, despues se conectaran con datos reales)
        $stats = [
            'conversations' => rand(50, 500),
            'leads' => rand(10, 100),
            'conversion_rate' => rand(15, 45),
            'active_tools' => count($onboardingData['tools'] ?? [])
        ];

        // 🚀 INFORMACIÓN CHATWOOT - MEJORADA con inbox_id y url dinámicos
        $inboxId = $user->chatwoot_inbox_id ?? $company->chatwoot_inbox_id ?? 1;
        $chatwootUrl = config('chatwoot.url') ?? env('CHATWOOT_URL') ?? env('CHATWOOT_API_BASE_URL');
        
        $chatwootStatus = [
            'provisioned' => $company->chatwoot_provisioned ?? false,
            'account_id' => $company->chatwoot_account_id ?? 1,
            'inbox_id' => $inboxId, // ✅ inbox_id dinámico
            'url' => $chatwootUrl, // ✅ NUEVO: url dinámico desde config
            'provisioned_at' => $company->chatwoot_provisioned_at ?? null,
            'available' => !empty($chatwootUrl),
            'auto_provision' => true
        ];

        // Logging mejorado para debug
        \Log::debug('Dashboard Data Debug:', [
            'user_id' => $user->id,
            'inbox_id' => $inboxId,
            'chatwoot_status' => $chatwootStatus
        ]);

        // 🚀 PREFETCH: Cargar teams y agents directamente de BD (sin cache)
        $prefetchedTeams = [];
        $prefetchedAgents = [];
        
        if ($company->chatwoot_account_id ?? false) {
            $accountId = $company->chatwoot_account_id;
            
            try {
                $chatwootDb = \Illuminate\Support\Facades\DB::connection('chatwoot');
                
                // 🚀 BD DIRECTA: Obtener equipos
                $teams = $chatwootDb->table('teams')
                    ->where('account_id', $accountId)
                    ->select('id', 'name', 'description', 'allow_auto_assign', 'account_id')
                    ->orderBy('name')
                    ->get();
                
                if ($teams->isNotEmpty()) {
                    // Obtener miembros de todos los equipos en una sola query
                    $teamIds = $teams->pluck('id')->toArray();
                    $allMembers = $chatwootDb->table('team_members')
                        ->join('users', 'team_members.user_id', '=', 'users.id')
                        ->whereIn('team_members.team_id', $teamIds)
                        ->select('team_members.team_id', 'users.id', 'users.name', 'users.display_name', 'users.email')
                        ->get();
                    
                    // Pre-cargar usuarios locales
                    $allEmails = $allMembers->pluck('email')->filter()->unique()->toArray();
                    $localUsers = !empty($allEmails)
                        ? \App\Models\User::whereIn('email', $allEmails)->get()->keyBy('email')
                        : collect();
                    
                    $membersByTeam = $allMembers->groupBy('team_id');
                    
                    $prefetchedTeams = $teams->map(function ($team) use ($membersByTeam, $localUsers) {
                        $members = $membersByTeam->get($team->id, collect());
                        return [
                            'id' => $team->id,
                            'name' => $team->name,
                            'description' => $team->description,
                            'allow_auto_assign' => $team->allow_auto_assign,
                            'account_id' => $team->account_id,
                            'members' => $members->map(function ($m) use ($localUsers) {
                                $localUser = $localUsers->get($m->email);
                                return [
                                    'id' => $m->id,
                                    'name' => $localUser->full_name ?? $m->display_name ?? $m->name,
                                    'email' => $m->email
                                ];
                            })->toArray()
                        ];
                    })->toArray();
                }
                
                // 🚀 BD DIRECTA: Obtener agentes
                $chatwootAgents = $chatwootDb->table('account_users')
                    ->join('users', 'account_users.user_id', '=', 'users.id')
                    ->where('account_users.account_id', $accountId)
                    ->select('users.id', 'users.name', 'users.display_name', 'users.email', 'account_users.role', 'users.availability')
                    ->get();
                
                $agentEmails = $chatwootAgents->pluck('email')->filter()->toArray();
                $agentLocalUsers = !empty($agentEmails)
                    ? \App\Models\User::whereIn('email', $agentEmails)->get()->keyBy('email')
                    : collect();
                
                $prefetchedAgents = $chatwootAgents->map(function ($agent) use ($agentLocalUsers) {
                    $localUser = $agentLocalUsers->get($agent->email);
                    return [
                        'id' => $agent->id,
                        'name' => $localUser->full_name ?? $agent->display_name ?? $agent->name,
                        'email' => $agent->email,
                        'role' => $agent->role,
                        'availability_status' => $agent->availability ?? 'offline'
                    ];
                })->toArray();
                
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Error prefetching teams/agents: ' . $e->getMessage());
            }
        }

        return Inertia::render('MainDashboard', [
            'user' => $user->toArray(),
            'company' => is_object($company) ? (array)$company : $company,
            'companySlug' => $companySlug,
            'onboardingData' => $onboardingData,
            'stats' => $stats,
            'chatwoot' => $chatwootStatus,
            'prefetchedTeams' => $prefetchedTeams,
            'prefetchedAgents' => $prefetchedAgents
        ]);
    }

    // Metodo para generar slug de empresa
    public function generateSlug($companyName)
    {
        return Str::slug($companyName ?? '');
    }
}
