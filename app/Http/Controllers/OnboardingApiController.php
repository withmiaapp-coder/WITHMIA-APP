<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\User;
use App\Models\Company;
use App\Jobs\PostOnboardingSetupJob;
use App\Jobs\CreateQdrantCollectionJob;
use App\Traits\HandlesOnboarding;
use Illuminate\Support\Facades\Validator;

class OnboardingApiController extends Controller
{
    use HandlesOnboarding;
    
    // NO AUTH MIDDLEWARE - for API routes

    public function store(Request $request): JsonResponse
    {
        // Validación básica
        $validator = Validator::make($request->all(), [
            'step' => 'required|integer|between:1,7',
            'full_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'role' => 'nullable|string|max:100',
            'company_name' => 'nullable|string|max:255',
            'industry' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:2000',
            'company_size' => 'nullable|string|max:50',
            'website' => 'nullable|url|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => 'Datos inválidos',
                'errors' => $validator->errors(),
            ], 422);
        }

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
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al guardar el paso'
            ], 500);
        }
    }

    private function saveUserData(Request $request, User $user): void
    {
        $data = $request->only(['full_name', 'phone']);
        if (!empty($data)) {
            $user->update(array_filter($data));
        }
    }

    private function saveCompanyData(Request $request, User $user): void
    {
        $company = $this->getOrCreateCompany($user);
        $data = $request->only(['company_name', 'industry', 'description', 'company_size']);
        
        $updates = [];
        
        if (!empty($data['company_name'])) {
            $updates['name'] = $data['company_name'];
        }
        if (!empty($data['industry'])) {
            $updates['industry'] = $data['industry'];
        }
        if (!empty($data['description'])) {
            $updates['description'] = $data['description'];
        }
        if (!empty($data['company_size'])) {
            $updates['company_size'] = $data['company_size'];
        }
        
        if (!empty($updates)) {
            $company->update($updates);
        }
        
        // Pre-crear colección Qdrant solo si NO tiene una ya
        if (!empty($data['company_name']) && empty($company->settings['qdrant_collection'])) {
            $tempSlug = $company->slug && strlen($company->slug) > 5 
                ? $company->slug 
                : Str::slug($data['company_name']) . '-' . strtolower(Str::random(6));
            
            try {
                Log::debug("📦 Dispatching Qdrant collection creation in step 2 for: {$tempSlug}");
                CreateQdrantCollectionJob::dispatch($company->id, $tempSlug);
            } catch (\Exception $e) {
                Log::error("Error dispatching Qdrant job: " . $e->getMessage());
                // No bloquear el onboarding si falla
            }
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
        $settings = $company->settings ?? [];
        $settings['onboarding'] = array_merge($settings['onboarding'] ?? [], [
            'usage' => $request->input('usage'),
        ]);
        $company->update(['settings' => $settings]);
    }

    private function saveVolumeData(Request $request, User $user): void
    {
        $company = $this->getOrCreateCompany($user);
        $settings = $company->settings ?? [];
        $settings['onboarding'] = array_merge($settings['onboarding'] ?? [], [
            'volume' => $request->input('volume'),
        ]);
        $company->update(['settings' => $settings]);
    }

    private function saveDiscoveryData(Request $request, User $user): void
    {
        $company = $this->getOrCreateCompany($user);
        $settings = $company->settings ?? [];
        $settings['onboarding'] = array_merge($settings['onboarding'] ?? [], [
            'discovery' => $request->input('discovery'),
        ]);
        $company->update(['settings' => $settings]);
    }

    private function saveToolsData(Request $request, User $user): void
    {
        $company = $this->getOrCreateCompany($user);
        $settings = $company->settings ?? [];
        $settings['onboarding'] = array_merge($settings['onboarding'] ?? [], [
            'tools' => $request->input('tools'),
        ]);
        $company->update(['settings' => $settings]);
    }
}