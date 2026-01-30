<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Company;
use App\Mail\OnboardingCompletedNotificationMail;
use App\Mail\OnboardingCompletedMail;
use App\Services\ChatwootProvisioningService;
use App\Services\QdrantService;
use App\Services\N8nService;
use App\Jobs\PostOnboardingSetupJob;
use App\Jobs\CreateQdrantCollectionJob;
use App\Jobs\CreateN8nWorkflowsJob;

class OnboardingController extends Controller
{
    protected $chatwootProvisioningService;
    protected $qdrantService;
    protected $n8nService;

    public function __construct(
        ChatwootProvisioningService $chatwootProvisioningService,
        QdrantService $qdrantService,
        N8nService $n8nService
    )
    {
        $this->chatwootProvisioningService = $chatwootProvisioningService;
        $this->qdrantService = $qdrantService;
        $this->n8nService = $n8nService;
        $this->middleware('auth')->only(['show', 'index']);
    }

    public function show(Request $request)
    {
        $user = auth()->user();
        if ($user->company_slug) {
            $authToken = $request->query('auth_token');
            $url = route('dashboard.company', ['companySlug' => $user->company_slug]);
            if ($authToken) {
                $url .= '?auth_token=' . $authToken;
            }
            return redirect($url);
        }
        $company = $this->getOrCreateCompany($user);
        return Inertia::render('onboarding', [
            'currentStep' => $user->onboarding_step ?? 1,
            'user' => $user,
            'company' => $company
        ]);
    }

    public function index(Request $request)
    {
        $user = auth()->user();
        if ($user->company_slug) {
            $authToken = $request->query('auth_token');
            $url = route('dashboard.company', ['companySlug' => $user->company_slug]);
            if ($authToken) {
                $url .= '?auth_token=' . $authToken;
            }
            return redirect($url);
        }
        return Inertia::render('onboarding');
    }

    public function store(Request $request)
    {
        // IMMEDIATE LOG - debe aparecer siempre
        \Log::info('🔴🔴🔴 OnboardingController@store ENTRANDO - step: ' . $request->input('step'));
        error_log('🔴🔴🔴 OnboardingController@store ENTRANDO - step: ' . $request->input('step'));
        
        try {
            $isJsonRequest = $request->expectsJson() || $request->wantsJson() || $request->ajax() || 
                            $request->header('Content-Type') === 'application/json' || 
                            $request->header('Accept') === 'application/json' || 
                            $request->header('X-Requested-With') === 'XMLHttpRequest';

            \Log::info('OnboardingController@store START', [
                'step' => $request->input('step'),
                'is_json' => $isJsonRequest,
                'auth_check' => auth()->check(),
                'user_id' => auth()->id(),
                'has_auth_token_query' => $request->query('auth_token') ? 'yes' : 'no',
                'has_auth_token_header' => $request->header('X-Railway-Auth-Token') ? 'yes' : 'no',
            ]);

            if (!auth()->check()) {
                \Log::error('User not authenticated in onboarding');
                if ($isJsonRequest) {
                    return response()->json(['success' => false, 'error' => 'Usuario no autenticado'], 401);
                }
                return response()->file(public_path('login.html'));
            }
            
            $user = auth()->user();

            if (!$user) {
                if ($isJsonRequest) {
                    return response()->json(['success' => false, 'error' => 'Usuario no autenticado'], 401);
                }
                return response()->file(public_path('login.html'));
            }

            if ($user->company_slug) {
                if ($isJsonRequest) {
                    return response()->json([
                        'success' => true,
                        'redirect' => route('dashboard.company', ['companySlug' => $user->company_slug])
                    ]);
                } else {
                    return redirect()->route('dashboard.company', ['companySlug' => $user->company_slug]);
                }
            }

            $step = $request->input('step', 0);
            
            \Log::info("OnboardingController@store - Processing step: {$step} for user: {$user->id}");

            switch ($step) {
                case 1: $this->saveUserData($request, $user); break;
                case 2: $this->saveCompanyData($request, $user); break;
                case 3: $this->saveWebsiteData($request, $user); break;
                case 4: $this->saveUsageData($request, $user); break;
                case 5: $this->saveVolumeData($request, $user); break;
                case 6: $this->saveDiscoveryDataInternal($request, $user); break;
                case 7:
                    \Log::info("OnboardingController@store - STEP 7 - About to call processOnboardingCompletion");
                    $this->saveToolsData($request, $user);
                    $completionResult = $this->processOnboardingCompletion($request, $user);
                    \Log::info("OnboardingController@store - STEP 7 - processOnboardingCompletion returned", ['result' => $completionResult]);
                    $user->refresh();
                    break;
            }

            if ($step < 7) {
                $nextStep = $step + 1;
                $user->update(['onboarding_step' => $nextStep]);
            }

            $isCompleted = ($step == 7);
            $completionData = [];
            
            if ($isCompleted) {
                // Usar los datos del completion que ya incluyen el auth_token
                $completionData = $completionResult ?? [
                    'company_slug' => $user->company_slug,
                    'dashboard_url' => route('dashboard.company', ['companySlug' => $user->company_slug]) . '?auth_token=' . $user->auth_token
                ];
            }

            if ($isJsonRequest) {
                $responseData = [
                    'success' => true,
                    'next_step' => $isCompleted ? 'complete' : ($step + 1),
                    'message' => $isCompleted ? 'Onboarding completado!' : 'Paso guardado correctamente',
                    'debug_info' => [
                        'authenticated' => auth()->check(),
                        'user_id' => $user ? $user->id : null,
                        'step_processed' => $step
                    ]
                ];
                
                if ($isCompleted) {
                    // Devolver JSON con la URL del dashboard para que el frontend redirija
                    $dashboardUrl = $completionData['dashboard_url'] ?? route('dashboard.company', ['companySlug' => $user->company_slug]) . '?auth_token=' . $user->auth_token;
                    $responseData['dashboard_url'] = $dashboardUrl;
                    $responseData['company_slug'] = $user->company_slug;
                }
                
                return response()->json($responseData);
            }

            if ($isCompleted) {
                // Usar la URL con token ya generada y mostrar pantalla de carga
                return view('auth-loading', ['redirect' => $completionData['dashboard_url']]);
            }

            return back()->with([
                'success' => true,
                'next_step' => $step < 7 ? $step + 1 : 'complete',
                'message' => $step == 7 ? 'Onboarding completado!' : 'Paso guardado correctamente',
                'debug_info' => [
                    'authenticated' => true,
                    'user_id' => $user->id,
                    'step_processed' => $step
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('OnboardingController@store exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            if ($isJsonRequest) {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage(),
                    'debug_info' => [
                        'authenticated' => auth()->check(),
                        'user_id' => auth()->id()
                    ]
                ], 500);
            }

            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function saveDiscoveryData(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $validatedData = $request->validate([
            'step_1_data' => 'nullable',
            'step_2_data' => 'nullable',
            'step_3_data' => 'nullable',
            'step_4_data' => 'nullable',
            'step_5_data' => 'nullable',
            'step_6_data' => 'nullable',
            'step_7_data' => 'nullable',
            'complete_onboarding' => 'nullable|boolean'
        ]);

        foreach ($validatedData as $key => $value) {
            if ($key !== 'complete_onboarding' && $value !== null) {
                $user->update([$key => $value]);
            }
        }

        if ($validatedData['complete_onboarding'] ?? false) {
            return $this->completeOnboarding($request);
        }

        return back();
    }

    private function saveUserData(Request $request, User $user)
    {
        \Log::info('saveUserData START', [
            'user_id' => $user->id,
            'request_data' => $request->all()
        ]);

        try {
            $validated = $request->validate([
                'full_name' => 'required|string|max:255',
                'phone' => 'required|string|max:20',
            ]);

            \Log::info('saveUserData validation passed', ['validated' => $validated]);

            $user->update([
                'full_name' => $request->full_name,
                'phone' => $request->phone,
            ]);

            \Log::info('saveUserData update completed', [
                'user_id' => $user->id,
                'full_name' => $user->full_name,
                'phone' => $user->phone
            ]);
        } catch (\Exception $e) {
            \Log::error('saveUserData EXCEPTION', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    private function saveCompanyData(Request $request, User $user)
    {
        $request->validate([
            'company_name' => 'required|string|max:255',
            'company_description' => 'nullable|string|max:1000'
        ]);

        $company = $this->getOrCreateCompany($user);
        $company->update([
            'name' => $request->company_name,
            'description' => $request->company_description
        ]);
    }

    private function saveWebsiteData(Request $request, User $user)
    {
        $company = $this->getOrCreateCompany($user);
        $company->update([
            'website' => $request->website,
            'settings' => array_merge($company->settings ?? [], [
                'onboarding' => array_merge($company->settings['onboarding'] ?? [], [
                    'has_website' => $request->has_website,
                    'found_via_search' => $request->found_via_search
                ])
            ])
        ]);
    }

    private function saveUsageData(Request $request, User $user)
    {
        $company = $this->getOrCreateCompany($user);
        $company->update([
            'client_type' => $request->client_type,
            'settings' => array_merge($company->settings ?? [], [
                'onboarding' => array_merge($company->settings['onboarding'] ?? [], [
                    'client_type' => $request->client_type
                ])
            ])
        ]);
    }

    private function saveVolumeData(Request $request, User $user)
    {
        $company = $this->getOrCreateCompany($user);
        $company->update([
            'settings' => array_merge($company->settings ?? [], [
                'onboarding' => array_merge($company->settings['onboarding'] ?? [], [
                    'monthly_conversations' => $request->monthly_conversations
                ])
            ])
        ]);
    }

    private function saveDiscoveryDataInternal(Request $request, User $user)
    {
        $company = $this->getOrCreateCompany($user);
        
        // Guardar discovered_via, discovered_other y también tools (que vienen en el mismo paso)
        $settings = $company->settings ?? [];
        $onboarding = $settings['onboarding'] ?? [];
        
        $onboarding['discovered_via'] = $request->discovered_via ?? [];
        $onboarding['discovered_other'] = $request->discovered_other ?? '';
        $onboarding['tools'] = $request->tools ?? [];
        $onboarding['other_tools'] = $request->other_tools ?? '';
        
        $settings['onboarding'] = $onboarding;
        
        $company->update(['settings' => $settings]);
        
        \Log::info('saveDiscoveryDataInternal completed', [
            'company_id' => $company->id,
            'discovered_via' => $onboarding['discovered_via'],
            'tools' => $onboarding['tools']
        ]);
    }

    private function saveToolsData(Request $request, User $user)
    {
        $company = $this->getOrCreateCompany($user);
        
        $settings = $company->settings ?? [];
        $onboarding = $settings['onboarding'] ?? [];
        
        $onboarding['tools'] = $request->tools ?? [];
        $onboarding['other_tools'] = $request->other_tools ?? '';
        
        $settings['onboarding'] = $onboarding;
        
        $company->update(['settings' => $settings]);
        
        \Log::info('saveToolsData completed', [
            'company_id' => $company->id,
            'tools' => $onboarding['tools']
        ]);
    }

    private function processOnboardingCompletion(Request $request, User $user): array
    {
        Log::info("processOnboardingCompletion INICIADO para user: {$user->id} - {$user->email}");

        $companyName = $request->company_name ?? $user->full_name ?? $user->name ?? 'empresa';
        $uniqueSlug = $this->generateUniqueCompanySlug($companyName);
        
        Log::info("Slug generado: {$uniqueSlug}");

        $user->update(['company_slug' => $uniqueSlug]);
        Log::info("Usuario actualizado con slug");

        $company = $this->getOrCreateCompany($user, $uniqueSlug);

        if ($company->slug !== $uniqueSlug) {
            $company->update(['slug' => $uniqueSlug]);
            Log::info("Slug de empresa actualizado a: {$uniqueSlug}");
        }

        // 🌍 Asignar timezone automáticamente según el país del teléfono
        $phoneCountry = $request->phone_country ?? '+56';
        $timezone = $this->getTimezoneFromPhoneCountry($phoneCountry);
        $company->update(['timezone' => $timezone]);
        Log::info("Timezone asignado: {$timezone} (país: {$phoneCountry})");

        Log::info("Empresa obtenida/creada: ID {$company->id}");

        // 📦 Crear colección Qdrant
        try {
            Log::info("📦 Creating Qdrant collection for: {$uniqueSlug}");
            CreateQdrantCollectionJob::dispatchSync($company->id, $uniqueSlug);
            Log::info("✅ Qdrant collection created for: {$uniqueSlug}");
        } catch (\Exception $e) {
            Log::error("Error creating Qdrant: " . $e->getMessage());
        }

        // 🚀 Crear workflows n8n (RAG + Training)
        try {
            Log::info("🚀 Creating n8n workflows for: {$uniqueSlug}");
            CreateN8nWorkflowsJob::dispatchSync($company->id, $uniqueSlug);
            Log::info("✅ N8n workflows created for: {$uniqueSlug}");
        } catch (\Exception $e) {
            Log::error("Error creating n8n workflows: " . $e->getMessage());
        }

        // 📧 Enviar correos (no bloquea)
        try {
            PostOnboardingSetupJob::dispatchSync(
                $user->id,
                $company->id,
                $uniqueSlug,
                request()->ip() ?? '0.0.0.0'
            );
            Log::info("PostOnboardingSetupJob completado para: {$uniqueSlug}");
        } catch (\Exception $e) {
            Log::error("Error dispatching PostOnboardingSetupJob: " . $e->getMessage());
        }

        return [
            'completed' => true,
            'company_slug' => $uniqueSlug,
            'dashboard_url' => route('dashboard.company', ['companySlug' => $uniqueSlug]) . '?auth_token=' . $user->auth_token
        ];
    }

    private function completeOnboarding(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $companyName = $request->company_name ?? $user->full_name ?? $user->name ?? 'empresa';
        $uniqueSlug = $this->generateUniqueCompanySlug($companyName);

        $user->update(['company_slug' => $uniqueSlug]);
        $company = $this->getOrCreateCompany($user, $uniqueSlug);

        // Marcar onboarding como completado inmediatamente
        $user->update([
            'onboarding_completed' => true,
            'onboarding_completed_at' => now()
        ]);

        // 🚀 Ejecutar Job SINCRÓNICAMENTE para asegurar que workflows se creen
        try {
            Log::info("Ejecutando PostOnboardingSetupJob sincrónicamente para: {$uniqueSlug}");
            
            \App\Jobs\PostOnboardingSetupJob::dispatchSync(
                $user->id,
                $company->id,
                $uniqueSlug,
                $request->ip() ?? '0.0.0.0'
            );
            
            Log::info("PostOnboardingSetupJob completado para: {$uniqueSlug}");
        } catch (\Exception $e) {
            Log::error("Error en PostOnboardingSetupJob: " . $e->getMessage());
            // Continuar aunque falle - el usuario ya tiene su dashboard
        }

        Log::info("Onboarding completado para {$user->email}, redirigiendo a dashboard");

        return redirect()->route('dashboard.company', ['companySlug' => $uniqueSlug]);
    }

    private function generateUniqueCompanySlug($companyName): string
    {
        $baseSlug = Str::slug($companyName);
        if (empty($baseSlug)) {
            $baseSlug = 'empresa';
        }

        do {
            $randomCode = strtolower(Str::random(6));
            $uniqueSlug = $baseSlug . '-' . $randomCode;
        } while (Company::where('slug', $uniqueSlug)->exists());

        return $uniqueSlug;
    }

    private function getOrCreateCompany(User $user, $slug = null)
    {
        return Company::firstOrCreate(
            ['user_id' => $user->id],
            [
                'name' => $user->full_name ?? $user->name ?? 'Mi Empresa',
                'slug' => $slug ?? $this->generateUniqueCompanySlug($user->full_name ?? $user->name ?? 'Mi Empresa'),
                'is_active' => true,
                'settings' => []
            ]
        );
    }

    /**
     * Mapea el código de país del teléfono a la zona horaria correspondiente
     */
    private function getTimezoneFromPhoneCountry(string $phoneCountry): string
    {
        $timezoneMap = [
            '+56' => 'America/Santiago',           // Chile
            '+57' => 'America/Bogota',             // Colombia
            '+52' => 'America/Mexico_City',        // México
            '+51' => 'America/Lima',               // Perú
            '+54' => 'America/Argentina/Buenos_Aires', // Argentina
            '+55' => 'America/Sao_Paulo',          // Brasil
            '+58' => 'America/Caracas',            // Venezuela
            '+593' => 'America/Guayaquil',         // Ecuador
            '+591' => 'America/La_Paz',            // Bolivia
            '+598' => 'America/Montevideo',        // Uruguay
            '+595' => 'America/Asuncion',          // Paraguay
            '+506' => 'America/Costa_Rica',        // Costa Rica
            '+502' => 'America/Guatemala',         // Guatemala
            '+504' => 'America/Tegucigalpa',       // Honduras
            '+503' => 'America/El_Salvador',       // El Salvador
            '+505' => 'America/Managua',           // Nicaragua
            '+507' => 'America/Panama',            // Panamá
            '+1809' => 'America/Santo_Domingo',    // República Dominicana
            '+53' => 'America/Havana',             // Cuba
            '+1787' => 'America/Puerto_Rico',      // Puerto Rico
            '+34' => 'Europe/Madrid',              // España
            '+351' => 'Europe/Lisbon',             // Portugal
            '+33' => 'Europe/Paris',               // Francia
            '+49' => 'Europe/Berlin',              // Alemania
            '+39' => 'Europe/Rome',                // Italia
            '+44' => 'Europe/London',              // Reino Unido
            '+31' => 'Europe/Amsterdam',           // Países Bajos
            '+1' => 'America/New_York',            // Estados Unidos/Canadá (default EST)
        ];

        return $timezoneMap[$phoneCountry] ?? 'UTC';
    }

    // NOTA: El método createRagWorkflow fue eliminado porque era código muerto.
    // La creación del workflow RAG se hace en PostOnboardingSetupJob.
    // Si necesitas crear un workflow RAG manualmente, usa KnowledgeController@createCompanyWorkflow
}
