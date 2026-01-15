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

    public function show()
    {
        $user = auth()->user();
        if ($user->company_slug) {
            return redirect()->route('dashboard.company', ['companySlug' => $user->company_slug]);
        }
        $company = $this->getOrCreateCompany($user);
        return Inertia::render('onboarding', [
            'currentStep' => $user->onboarding_step ?? 1,
            'user' => $user,
            'company' => $company
        ]);
    }

    public function index()
    {
        $user = auth()->user();
        if ($user->company_slug) {
            return redirect()->route('dashboard.company', ['companySlug' => $user->company_slug]);
        }
        return Inertia::render('onboarding');
    }

    public function store(Request $request)
    {
        try {
            $isJsonRequest = $request->expectsJson() || $request->wantsJson() || $request->ajax() || 
                            $request->header('Content-Type') === 'application/json' || 
                            $request->header('Accept') === 'application/json' || 
                            $request->header('X-Requested-With') === 'XMLHttpRequest';

            \Log::info('OnboardingController@store START', [
                'step' => $request->input('step'),
                'all_input' => $request->all(),
                'is_json' => $isJsonRequest,
                'auth_check' => auth()->check(),
                'user_id' => auth()->id()
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

            switch ($step) {
                case 1: $this->saveUserData($request, $user); break;
                case 2: $this->saveCompanyData($request, $user); break;
                case 3: $this->saveWebsiteData($request, $user); break;
                case 4: $this->saveUsageData($request, $user); break;
                case 5: $this->saveVolumeData($request, $user); break;
                case 6: $this->saveDiscoveryData($request, $user); break;
                case 7:
                    $this->saveToolsData($request, $user);
                    $this->processOnboardingCompletion($request, $user);
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
                $user->refresh();
                
                // URL del dashboard usando el company_slug
                $dashboardUrl = route('dashboard.company', ['companySlug' => $user->company_slug]);
                
                $completionData = [
                    'company_slug' => $user->company_slug,
                    'dashboard_url' => $dashboardUrl
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
                    $responseData = array_merge($responseData, $completionData);
                }
                
                return response()->json($responseData);
            }

            if ($isCompleted) {
                // Usar la URL con token ya generada
                return redirect($completionData['dashboard_url']);
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
        $company->update([
            'settings' => array_merge($company->settings ?? [], [
                'onboarding' => array_merge($company->settings['onboarding'] ?? [], [
                    'discovered_via' => $request->discovered_via,
                    'discovered_other' => $request->discovered_other
                ])
            ])
        ]);
    }

    private function saveToolsData(Request $request, User $user)
    {
        $company = $this->getOrCreateCompany($user);
        $company->update([
            'settings' => array_merge($company->settings ?? [], [
                'onboarding' => array_merge($company->settings['onboarding'] ?? [], [
                    'current_tools' => $request->current_tools,
                    'other_tools' => $request->other_tools
                ])
            ])
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

        Log::info("Empresa obtenida/creada: ID {$company->id}");

        try {
            Log::info("Iniciando creacion automatica de cuenta Chatwoot para: {$user->email}");
            $chatwootResult = $this->chatwootProvisioningService->provisionCompanyAccount($company, $user);
            Log::info("Cuenta Chatwoot creada exitosamente para: {$user->email}", [
                'account_id' => $chatwootResult['account']['id'] ?? null,
                'inbox_id' => $chatwootResult['inbox']['id'] ?? null
            ]);
        } catch (\Exception $e) {
            Log::error("Error creando cuenta Chatwoot para {$user->email}: " . $e->getMessage());
        }

        // Crear colección de Qdrant para la base de conocimiento de la empresa
        try {
            Log::info("Creando colección Qdrant para: {$uniqueSlug}");
            $qdrantResult = $this->qdrantService->createCompanyCollection($uniqueSlug);
            
            if ($qdrantResult['success']) {
                $collectionName = $qdrantResult['collection'];
                Log::info("Colección Qdrant creada: {$collectionName}", $qdrantResult);
                
                // Guardar nombre de colección en la empresa
                $company->update([
                    'settings' => array_merge($company->settings ?? [], [
                        'qdrant_collection' => $collectionName
                    ])
                ]);
            } else {
                Log::error("Error creando colección Qdrant para {$uniqueSlug}: " . ($qdrantResult['error'] ?? 'Unknown'));
            }
        } catch (\Exception $e) {
            Log::error("Excepción creando colección Qdrant para {$uniqueSlug}: " . $e->getMessage());
        }

        // Crear workflow RAG para procesar documentos de la empresa
        try {
            Log::info("Creando workflow RAG para: {$uniqueSlug}");
            $ragResult = $this->createRagWorkflow($company, $uniqueSlug);
            
            if ($ragResult['success']) {
                Log::info("Workflow RAG creado para {$uniqueSlug}", [
                    'workflow_id' => $ragResult['workflow_id'] ?? null
                ]);
                
                // Guardar ID del workflow RAG
                $company->update([
                    'settings' => array_merge($company->settings ?? [], [
                        'rag_workflow_id' => $ragResult['workflow_id'] ?? null,
                        'rag_webhook_url' => $ragResult['webhook_url'] ?? null
                    ])
                ]);
            } else {
                Log::error("Error creando workflow RAG para {$uniqueSlug}: " . ($ragResult['error'] ?? 'Unknown'));
            }
        } catch (\Exception $e) {
            Log::error("Excepción creando workflow RAG para {$uniqueSlug}: " . $e->getMessage());
        }

        // Enviar correos de forma no bloqueante (try-catch para evitar que falle el onboarding)
        try {
            if (class_exists('App\Mail\OnboardingCompletedNotificationMail')) {
                Mail::to("a.diaz@withmia.com")->send(new OnboardingCompletedNotificationMail($user, request()->ip(), $company));
                Mail::to($user->email)->send(new OnboardingCompletedMail($user));
                Log::info("Correos de onboarding enviados para: {$user->email}");
            }
        } catch (\Exception $mailException) {
            // No bloquear el onboarding si falla el correo
            Log::error("Error enviando correos de onboarding: " . $mailException->getMessage());
        }

        return [
            'completed' => true,
            'company_slug' => $uniqueSlug,
            'dashboard_url' => route('dashboard.company', ['companySlug' => $uniqueSlug])
        ];
    }

    private function completeOnboarding(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $companyName = $request->company_name ?? $user->full_name ?? $user->name ?? 'empresa';
        $uniqueSlug = $this->generateUniqueCompanySlug($companyName);

        $user->update(['company_slug' => $uniqueSlug]);
        $company = $this->getOrCreateCompany($user, $uniqueSlug);

        try {
            Log::info("Iniciando creacion automatica de cuenta Chatwoot para: {$user->email}");
            $chatwootResult = $this->chatwootProvisioningService->provisionCompanyAccount($company, $user);
            Log::info("Cuenta Chatwoot creada exitosamente para: {$user->email}", [
                'account_id' => $chatwootResult['account']['id'] ?? null,
                'inbox_id' => $chatwootResult['inbox']['id'] ?? null
            ]);

            if (isset($chatwootResult['account']['id'])) {
                $company->update([
                    'chatwoot_account_id' => $chatwootResult['account']['id'],
                    'chatwoot_provisioned' => true,
                    'chatwoot_provisioned_at' => now()
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Error creando cuenta Chatwoot para {$user->email}: " . $e->getMessage());
        }

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
     * Crear workflow RAG para procesar documentos de una empresa
     */
    private function createRagWorkflow(Company $company, string $companySlug): array
    {
        try {
            $templatePath = base_path('workflows/rag-documents-updated.json');
            
            if (!file_exists($templatePath)) {
                Log::error("Template RAG no encontrado: {$templatePath}");
                return ['success' => false, 'error' => 'Template not found'];
            }

            // Cargar y parsear template
            $content = file_get_contents($templatePath);
            $content = preg_replace('/^\xEF\xBB\xBF/', '', $content); // Limpiar BOM
            $templateWorkflow = json_decode($content, true);

            if (!$templateWorkflow) {
                Log::error("Error parseando template RAG: " . json_last_error_msg());
                return ['success' => false, 'error' => 'Invalid template JSON'];
            }

            // Personalizar workflow para esta empresa
            $collectionName = $this->qdrantService->getCollectionName($companySlug);
            $webhookPath = "rag-{$companySlug}";
            $newWebhookId = Str::uuid()->toString();

            // Actualizar nodos
            foreach ($templateWorkflow['nodes'] as &$node) {
                // Actualizar webhook path
                if ($node['type'] === 'n8n-nodes-base.webhook') {
                    $node['parameters']['path'] = $webhookPath;
                    $node['webhookId'] = $newWebhookId;
                }
            }

            // Cambiar nombre del workflow
            $templateWorkflow['name'] = "RAG Documents - {$companySlug}";
            
            // Remover campos que n8n no acepta en creación
            unset($templateWorkflow['id']);
            unset($templateWorkflow['versionId']);
            unset($templateWorkflow['meta']);
            unset($templateWorkflow['tags']);
            unset($templateWorkflow['active']); // read-only field

            // Crear workflow en n8n
            $result = $this->n8nService->createWorkflow($templateWorkflow);

            if ($result['success']) {
                $workflowId = $result['data']['id'] ?? null;
                $webhookUrl = env('N8N_PUBLIC_URL', 'https://n8n-production-dace.up.railway.app') . "/webhook/{$webhookPath}";

                // Activar workflow
                if ($workflowId) {
                    $this->n8nService->activateWorkflow($workflowId);
                    Log::info("Workflow RAG activado: {$workflowId}");
                }

                return [
                    'success' => true,
                    'workflow_id' => $workflowId,
                    'webhook_url' => $webhookUrl,
                    'collection_name' => $collectionName
                ];
            }

            return [
                'success' => false,
                'error' => $result['error'] ?? 'Unknown error creating workflow'
            ];

        } catch (\Exception $e) {
            Log::error("Excepción en createRagWorkflow: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
