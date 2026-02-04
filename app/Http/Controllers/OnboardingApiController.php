<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\User;
use App\Models\Company;
use App\Jobs\PostOnboardingSetupJob;
use App\Jobs\CreateQdrantCollectionJob;
use App\Jobs\CreateN8nWorkflowsJob;
use OpenAI;

class OnboardingApiController extends Controller
{
    // NO AUTH MIDDLEWARE - for API routes

    public function store(Request $request): JsonResponse
    {
        Log::debug('OnboardingApiController@store received', [
            'step' => $request->input('step'),
            'all_data' => $request->all()
        ]);

        try {
            // Autenticar por auth_token del header o cookie
            $authToken = $request->header('X-Railway-Auth-Token') 
                        ?? $request->cookie('auth_token')
                        ?? $request->input('auth_token');
            
            $user = null;
            
            // Primero intentar auth normal
            if (auth()->check()) {
                $user = auth()->user();
            }
            
            // Si no, buscar por auth_token
            if (!$user && $authToken) {
                $user = User::where('auth_token', $authToken)->first();
            }
            
            if (!$user) {
                Log::error('OnboardingApiController: No user found');
                return response()->json([
                    'success' => false,
                    'error' => 'Usuario no autenticado'
                ], 401);
            }

            $step = (int) $request->input('step', 0);
            
            Log::debug("OnboardingApiController processing step {$step} for user {$user->id}");

            // Guardar datos del step según corresponda
            switch ($step) {
                case 1:
                    $this->saveUserData($request, $user);
                    break;
                case 2:
                    $this->saveCompanyData($request, $user);
                    break;
                case 3:
                    $this->saveWebsiteData($request, $user);
                    break;
                case 4:
                    $this->saveUsageData($request, $user);
                    break;
                case 5:
                    $this->saveVolumeData($request, $user);
                    break;
                case 6:
                    $this->saveDiscoveryData($request, $user);
                    break;
                case 7:
                    $this->saveToolsData($request, $user);
                    $completionData = $this->processOnboardingCompletion($request, $user);
                    
                    return response()->json([
                        'success' => true,
                        'next_step' => 'complete',
                        'message' => 'Onboarding completado!',
                        'company_slug' => $completionData['company_slug'],
                        'dashboard_url' => $completionData['dashboard_url']
                    ]);
            }

            // Actualizar step del usuario
            if ($step < 7) {
                $user->update(['onboarding_step' => $step + 1]);
            }

            return response()->json([
                'success' => true,
                'next_step' => $step < 7 ? $step + 1 : 'complete',
                'message' => 'Paso guardado correctamente'
            ]);

        } catch (\Exception $e) {
            Log::error('OnboardingApiController error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function saveUserData(Request $request, User $user): void
    {
        $data = $request->only(['full_name', 'phone', 'role']);
        if (!empty($data)) {
            $user->update(array_filter($data));
        }
    }

    private function saveCompanyData(Request $request, User $user): void
    {
        $company = $this->getOrCreateCompany($user);
        $data = $request->only(['company_name', 'industry', 'description', 'company_size']);
        
        if (!empty($data['company_name'])) {
            $company->update(['name' => $data['company_name']]);
            
            // 📦 Generar slug temporal y crear colección Qdrant AHORA (rápido, ~100ms)
            // Esto se hace aquí para que cuando llegue al paso 7, ya esté listo
            $tempSlug = Str::slug($data['company_name']) . '-' . strtolower(Str::random(6));
            
            try {
                Log::debug("📦 Pre-creating Qdrant collection in step 2 for: {$tempSlug}");
                CreateQdrantCollectionJob::dispatchSync($company->id, $tempSlug);
            } catch (\Exception $e) {
                Log::error("Error pre-creating Qdrant: " . $e->getMessage());
                // No bloquear el onboarding si falla
            }
        }
        if (!empty($data['industry'])) {
            $company->update(['industry' => $data['industry']]);
        }
        if (!empty($data['description'])) {
            $company->update(['description' => $data['description']]);
        }
        if (!empty($data['company_size'])) {
            $company->update(['company_size' => $data['company_size']]);
        }
    }

    private function saveWebsiteData(Request $request, User $user): void
    {
        $company = $this->getOrCreateCompany($user);
        $website = $request->input('website');
        if ($website) {
            $company->update(['website' => $website]);
        }
    }

    private function saveUsageData(Request $request, User $user): void
    {
        $company = $this->getOrCreateCompany($user);
        $onboarding = $company->onboarding_data ?? [];
        $onboarding['usage'] = $request->input('usage');
        $company->update(['onboarding_data' => $onboarding]);
    }

    private function saveVolumeData(Request $request, User $user): void
    {
        $company = $this->getOrCreateCompany($user);
        $onboarding = $company->onboarding_data ?? [];
        $onboarding['volume'] = $request->input('volume');
        $company->update(['onboarding_data' => $onboarding]);
    }

    private function saveDiscoveryData(Request $request, User $user): void
    {
        $company = $this->getOrCreateCompany($user);
        $onboarding = $company->onboarding_data ?? [];
        $onboarding['discovery'] = $request->input('discovery');
        $company->update(['onboarding_data' => $onboarding]);
    }

    private function saveToolsData(Request $request, User $user): void
    {
        $company = $this->getOrCreateCompany($user);
        $onboarding = $company->onboarding_data ?? [];
        $onboarding['tools'] = $request->input('tools');
        $company->update(['onboarding_data' => $onboarding]);
    }

    private function processOnboardingCompletion(Request $request, User $user): array
    {
        Log::debug("OnboardingApiController::processOnboardingCompletion for user: {$user->id}");

        $companyName = $request->input('company_name') ?? $user->full_name ?? $user->name ?? 'empresa';
        $uniqueSlug = $this->generateUniqueCompanySlug($companyName);
        
        Log::debug("Generated slug: {$uniqueSlug}");

        $user->update([
            'company_slug' => $uniqueSlug,
            'onboarding_completed' => true,
            'onboarding_completed_at' => now()
        ]);

        $company = $this->getOrCreateCompany($user, $uniqueSlug);
        if ($company->slug !== $uniqueSlug) {
            $company->update(['slug' => $uniqueSlug]);
        }

        // � Asegurar que Qdrant collection existe (si no se creó en paso 2)
        if (empty($company->settings['qdrant_collection'])) {
            try {
                Log::debug("📦 Creating Qdrant collection (was missing): {$uniqueSlug}");
                CreateQdrantCollectionJob::dispatchSync($company->id, $uniqueSlug);
            } catch (\Exception $e) {
                Log::error("Error creating Qdrant: " . $e->getMessage());
            }
        }

        // 🚀 Crear workflows n8n (RAG + Training) - ESTO ES LO IMPORTANTE
        try {
            Log::debug("🚀 Creating n8n workflows for: {$uniqueSlug}");
            CreateN8nWorkflowsJob::dispatchSync($company->id, $uniqueSlug);
            Log::debug("✅ N8n workflows created for: {$uniqueSlug}");
        } catch (\Exception $e) {
            Log::error("Error creating n8n workflows: " . $e->getMessage());
        }

        // 📧 Enviar correos en background (no bloquea)
        try {
            PostOnboardingSetupJob::dispatch(
                $user->id,
                $company->id,
                $uniqueSlug,
                $request->ip() ?? '0.0.0.0'
            )->onConnection('sync');
        } catch (\Exception $e) {
            Log::error("Error sending emails: " . $e->getMessage());
        }

        $dashboardUrl = route('dashboard.company', ['companySlug' => $uniqueSlug]) . '?auth_token=' . $user->auth_token;

        return [
            'completed' => true,
            'company_slug' => $uniqueSlug,
            'dashboard_url' => $dashboardUrl
        ];
    }

    private function getOrCreateCompany(User $user, ?string $slug = null): Company
    {
        $company = $user->company;
        
        if (!$company) {
            $company = Company::create([
                'user_id' => $user->id,
                'name' => $user->full_name ?? $user->name ?? 'Mi Empresa',
                'slug' => $slug ?? Str::random(10),
            ]);
            $user->update(['company_id' => $company->id]);
        }
        
        return $company;
    }

    private function generateUniqueCompanySlug(string $companyName): string
    {
        $baseSlug = Str::slug($companyName);
        if (empty($baseSlug)) {
            $baseSlug = 'empresa';
        }
        
        // Agregar random suffix para unicidad
        $randomSuffix = strtolower(Str::random(6));
        return "{$baseSlug}-{$randomSuffix}";
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
                'description' => $request->input('description'),
                'trace' => $e->getTraceAsString()
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
            $apiKey = env('OPENAI_API_KEY');
            
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
                'description' => $description,
                'trace' => $e->getTraceAsString()
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