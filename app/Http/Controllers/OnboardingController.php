<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use OpenAI;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use App\Models\User;
use App\Models\Company;
use App\Services\ChatwootProvisioningService;
use App\Jobs\PostOnboardingSetupJob;
use App\Traits\HandlesOnboarding;

class OnboardingController extends Controller
{
    use HandlesOnboarding;
    protected $chatwootProvisioningService;

    public function __construct(ChatwootProvisioningService $chatwootProvisioningService)
    {
        $this->chatwootProvisioningService = $chatwootProvisioningService;
        $this->middleware('auth')->only(['show', 'index']);
    }

    public function show(Request $request): RedirectResponse|InertiaResponse
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

    public function index(Request $request): RedirectResponse|InertiaResponse
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

    public function store(Request $request): JsonResponse
    {
        Log::debug('OnboardingController: store', ['step' => $request->input('step')]);
        
        try {
            $isJsonRequest = $request->expectsJson() || $request->wantsJson() || $request->ajax() || 
                            $request->header('Content-Type') === 'application/json' || 
                            $request->header('Accept') === 'application/json' || 
                            $request->header('X-Requested-With') === 'XMLHttpRequest';

            Log::debug('OnboardingController@store START', [
                'step' => $request->input('step'),
                'is_json' => $isJsonRequest,
                'auth_check' => auth()->check(),
                'user_id' => auth()->id(),
                'has_auth_token_query' => $request->query('auth_token') ? 'yes' : 'no',
                'has_auth_token_header' => $request->header('X-Railway-Auth-Token') ? 'yes' : 'no',
            ]);

            if (!auth()->check()) {
                Log::error('User not authenticated in onboarding');
                if ($isJsonRequest) {
                    return response()->json(['success' => false, 'error' => 'Usuario no autenticado'], 401);
                }
                return view('login');
            }
            
            $user = auth()->user();

            if (!$user) {
                if ($isJsonRequest) {
                    return response()->json(['success' => false, 'error' => 'Usuario no autenticado'], 401);
                }
                return view('login');
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
            
            Log::debug("OnboardingController@store - Processing step: {$step} for user: {$user->id}");

            switch ($step) {
                case 1: $this->saveUserData($request, $user); break;
                case 2: $this->saveCompanyData($request, $user); break;
                case 3: $this->saveWebsiteData($request, $user); break;
                case 4: $this->saveUsageData($request, $user); break;
                case 5: $this->saveVolumeData($request, $user); break;
                case 6: $this->saveDiscoveryDataInternal($request, $user); break;
                case 7:
                    Log::debug("OnboardingController@store - STEP 7 - About to call processOnboardingCompletion");
                    $this->saveToolsData($request, $user);
                    $completionResult = $this->processOnboardingCompletion($request, $user);
                    Log::debug("OnboardingController@store - STEP 7 - processOnboardingCompletion returned", ['result' => $completionResult]);
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

                // If user came from pricing with a plan, redirect to billing instead of dashboard
                $pendingPlan = session()->pull('pending_plan');
                if ($pendingPlan && in_array($pendingPlan, ['pro-monthly', 'pro-annual'])) {
                    $completionData['dashboard_url'] = route('dashboard.company', ['companySlug' => $user->company_slug])
                        . '?auth_token=' . $user->auth_token . '&section=subscription&plan=' . $pendingPlan;
                }
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
            Log::error('OnboardingController@store exception', [
                'message' => $e->getMessage()
            ]);

            if ($isJsonRequest) {
                return response()->json([
                    'success' => false,
                    'error' => 'Error al guardar el paso',
                    'debug_info' => [
                        'authenticated' => auth()->check(),
                        'user_id' => auth()->id()
                    ]
                ], 500);
            }

            return back()->withErrors(['error' => 'Error al guardar el paso']);
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
        try {
            $validated = $request->validate([
                'full_name' => 'required|string|max:255',
                'phone' => 'required|string|max:20',
            ]);

            $user->update([
                'full_name' => $request->full_name,
                'phone' => $request->phone,
            ]);
        } catch (\Exception $e) {
            Log::error('saveUserData EXCEPTION', ['error' => $e->getMessage()]);
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
        
        Log::debug('saveDiscoveryDataInternal completed', [
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
        
        Log::debug('saveToolsData completed', [
            'company_id' => $company->id,
            'tools' => $onboarding['tools']
        ]);
    }

    // processOnboardingCompletion, generateUniqueCompanySlug, getOrCreateCompany, getTimezoneFromPhoneCountry
    // are now provided by HandlesOnboarding trait

    /**
     * Completar onboarding — delega a HandlesOnboarding::processOnboardingCompletion()
     * para evitar duplicación de lógica.
     */
    private function completeOnboarding(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $result = $this->processOnboardingCompletion($request, $user);

        Log::debug("Onboarding completado para {$user->email}, redirigiendo a dashboard");

        return redirect()->route('dashboard.company', ['companySlug' => $result['company_slug']]);
    }

    public function improveDescription(Request $request): JsonResponse
    {
        try {
            // Debug logging
            Log::debug('Improve description request', [
                'all_input' => $request->all(),
                'json_input' => $request->json()->all(),
                'raw_content' => $request->getContent()
            ]);

            $description = $request->input('description', '');

            if (empty($description)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Descripción no puede estar vacía',
                    'debug' => [
                        'received_description' => $description,
                        'all_input' => $request->all()
                    ]
                ]);
            }

            // Usar OpenAI real para mejorar la descripción
            $improvedDescription = $this->improveWithOpenAI($description);

            Log::debug('Description improved with OpenAI', [
                'original' => $description,
                'improved' => $improvedDescription
            ]);

            return response()->json([
                'success' => true,
                'improved_description' => $improvedDescription
            ]);

        } catch (\Exception $e) {
            Log::error('Error improving description:', [
                'error' => $e->getMessage(),
                'description' => $request->input('description')
            ]);

            // Fallback to simple improvement if OpenAI fails
            $description = $request->input('description', '');
            $fallbackDescription = $this->simpleFallback($description);

            return response()->json([
                'success' => true,
                'improved_description' => $fallbackDescription,
                'note' => 'Used fallback method due to OpenAI error'
            ]);
        }
    }

    /**
     * Mejora la descripción usando OpenAI
     */
    private function improveWithOpenAI($description)
    {
        try {
            // Crear cliente OpenAI con API key desde .env
            $apiKey = config('services.openai.api_key');
            
            if (empty($apiKey)) {
                throw new \Exception('OpenAI API key not configured');
            }

            $client = OpenAI::client($apiKey);

            $result = $client->chat()->create([
                'model' => 'gpt-4o-mini',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Eres un experto en marketing y redacción comercial. Tu tarea es mejorar descripciones de empresas haciéndolas más profesionales, atractivas y claras. Mantén el mismo sentido pero hazlas más impactantes.'
                    ],
                    [
                        'role' => 'user',
                        'content' => "Mejora esta descripción de empresa: \"$description\". Hazla más profesional y atractiva, pero mantén la esencia. Responde solo con la descripción mejorada, sin explicaciones adicionales."
                    ]
                ],
                'max_tokens' => 200,
                'temperature' => 0.7,
            ]);

            return trim($result->choices[0]->message->content);

        } catch (\Exception $e) {
            Log::error('OpenAI API error', [
                'error' => $e->getMessage(),
                'description' => $description
            ]);
            
            // Return fallback if OpenAI fails
            return $this->simpleFallback($description);
        }
    }

    /**
     * Fallback simple si OpenAI falla
     */
    private function simpleFallback($description)
    {
        $improved = trim($description);
        $improved = ucfirst($improved);
        
        if (!empty($improved) && !str_ends_with($improved, '.')) {
            $improved .= '.';
        }
        
        return $improved;
    }
}
