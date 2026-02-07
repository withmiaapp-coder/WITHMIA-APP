<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;
use App\Services\QdrantService;
use App\Models\Company;

class CompanyProfileController extends Controller
{
    private QdrantService $qdrantService;

    public function __construct(QdrantService $qdrantService)
    {
        $this->qdrantService = $qdrantService;
    }

    /**
     * Fetch current user's company onboarding data
     */
    public function getOnboardingData(Request $request)
    {
        try {
            $user = Auth::user();
            Log::debug('getOnboardingData - User ID: ' . $user->id . ', Company Slug: ' . $user->company_slug);
            
            // Buscar empresa: primero por relación, luego por slug directo
            $company = $user->company;
            
            if (!$company && $user->company_slug) {
                $company = Company::findBySlugCached($user->company_slug);
            }
            
            if (!$company) {
                Log::error('getOnboardingData - No company found for user ' . $user->id);
                return response()->json([
                    'success' => true,
                    'data' => [
                        'company_name' => 'Mi Empresa',
                        'company_description' => '',
                        'has_website' => false,
                        'website' => '',
                        'client_type' => null,
                        'logo_url' => null,
                        'assistant_name' => 'WITHMIA'
                    ]
                ]);
            }

            $responseData = [
                'company_name' => $company->name ?? '',
                'company_description' => $company->description ?? '',
                'has_website' => !empty($company->website),
                'website' => $company->website ?? '',
                'client_type' => $company->client_type ?? null,
                'logo_url' => $company->logo_url ?? null,
                'assistant_name' => $company->assistant_name ?? 'WITHMIA'
            ];
            
            Log::debug('getOnboardingData - Response:', $responseData);

            return response()->json([
                'success' => true,
                'data' => $responseData
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching onboarding data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener datos de onboarding'
            ], 500);
        }
    }

    /**
     * Update current user's company onboarding data
     */
    public function updateOnboardingData(Request $request)
    {
        try {
            $user = Auth::user();
            $company = $user->company;
            
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'error' => 'No se encontró información de la empresa'
                ], 404);
            }

            $validated = $request->validate([
                'company_name' => 'nullable|string|max:255',
                'company_description' => 'nullable|string|max:2000',
                'has_website' => 'nullable|boolean',
                'website' => 'nullable|url|max:500',
                'client_type' => 'nullable|in:interno,externo',
                'assistant_name' => 'nullable|string|max:100'
            ]);

            // Map fields to company table columns
            $updateData = [];
            if (isset($validated['company_name'])) $updateData['name'] = $validated['company_name'];
            if (isset($validated['company_description'])) $updateData['description'] = $validated['company_description'];
            if (isset($validated['website'])) $updateData['website'] = $validated['website'];
            if (isset($validated['client_type'])) $updateData['client_type'] = $validated['client_type'];
            if (isset($validated['assistant_name'])) $updateData['assistant_name'] = $validated['assistant_name'];

            $company->update($updateData);

            // Actualizar información de la empresa en Qdrant
            $this->updateCompanyInfoInQdrant($company);

            return response()->json([
                'success' => true,
                'message' => 'Datos actualizados correctamente',
                'data' => [
                    'company_name' => $company->name,
                    'company_description' => $company->description,
                    'has_website' => !empty($company->website),
                    'website' => $company->website,
                    'client_type' => $company->client_type,
                    'assistant_name' => $company->assistant_name ?? 'WITHMIA'
                ]
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating onboarding data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar datos'
            ], 500);
        }
    }

    /**
     * Upload company logo (converts to base64 data URL)
     */
    public function uploadCompanyLogo(Request $request)
    {
        try {
            $user = Auth::user();
            $company = $user->company;
            
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'error' => 'No se encontró información de la empresa'
                ], 404);
            }

            $request->validate([
                'logo' => 'required|image|max:2048' // Max 2MB
            ]);

            $file = $request->file('logo');
            
            // Convert image to base64 data URL (persists in database, survives deploys)
            $imageData = file_get_contents($file->getRealPath());
            $mimeType = $file->getMimeType();
            $base64 = base64_encode($imageData);
            $logoUrl = 'data:' . $mimeType . ';base64,' . $base64;
            
            // Update company logo_url with base64 data
            $company->update(['logo_url' => $logoUrl]);

            Log::debug('Logo uploaded successfully as base64', [
                'company_id' => $company->id,
                'mime_type' => $mimeType,
                'size_bytes' => strlen($imageData)
            ]);

            return response()->json([
                'success' => true,
                'logo_url' => $logoUrl,
                'message' => 'Logo subido correctamente'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Archivo inválido',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error uploading company logo: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al subir el logo'
            ], 500);
        }
    }

    /**
     * Actualizar información de la empresa directamente en Qdrant (sobrescribe, no duplica)
     */
    private function updateCompanyInfoInQdrant($company)
    {
        try {
            $qdrantService = app(QdrantService::class);
            
            // Obtener el nombre de la colección
            $collectionName = $company->settings['qdrant_collection'] ?? null;
            
            if (!$collectionName) {
                Log::warning('No Qdrant collection found for company', ['company_id' => $company->id]);
                return;
            }

            // Construir el texto con toda la información de la empresa
            $companyInfoParts = [];
            
            $assistantName = $company->assistant_name ?? 'MIA';
            
            // Información explícita sobre la identidad del asistente
            $companyInfoParts[] = "IDENTIDAD DEL ASISTENTE:\n- Mi nombre es {$assistantName}\n- Cuando me pregunten cómo me llamo, debo responder que me llamo {$assistantName}\n- Soy el asistente virtual de {$company->name}";
            
            if (!empty($company->name)) {
                $companyInfoParts[] = "Nombre de la Empresa: {$company->name}";
            }
            
            if (!empty($company->website)) {
                $companyInfoParts[] = "Sitio Web: {$company->website}";
            }
            
            if (!empty($company->description)) {
                $companyInfoParts[] = "Descripción de la Empresa: {$company->description}";
            }

            if (!empty($company->client_type)) {
                $clientTypeText = $company->client_type === 'interno' ? 'Interno - Para tus clientes finales' : 'Externo - Para tus clientes finales';
                $companyInfoParts[] = "Tipo de Cliente: {$clientTypeText}";
            }
            
            if (empty($companyInfoParts)) {
                Log::debug("No company info to update in Qdrant for company {$company->id}");
                return;
            }

            $companyInfoText = implode("\n\n", $companyInfoParts);
            
            // UPSERT en Qdrant (mismo ID = sobrescribe, no duplica)
            // Usar ID numérico porque Qdrant no acepta strings como ID
            $pointId = $company->id;
            
            $insertResult = $qdrantService->upsertPoints($collectionName, [
                [
                    'id' => $pointId,
                    'vector' => $qdrantService->generateEmbedding($companyInfoText),
                    'payload' => [
                        'text' => $companyInfoText,
                        'source' => 'company_onboarding',
                        'type' => 'company_information',
                        'company_id' => $company->id,
                        'updated_at' => now()->toIso8601String(),
                    ]
                ]
            ]);

            if ($insertResult['success']) {
                Log::debug("✅ Company information updated in Qdrant (upsert with same ID)", [
                    'company_id' => $company->id,
                    'collection' => $collectionName
                ]);
            } else {
                Log::error("❌ Failed to update company info in Qdrant: " . ($insertResult['error'] ?? 'Unknown'));
            }
        } catch (\Exception $e) {
            Log::error("❌ Exception updating company info in Qdrant: " . $e->getMessage());
        }
    }

    /**
     * Proxy Google Custom Search to keep API key server-side.
     */
    public function googleSearch(Request $request)
    {
        $request->validate([
            'q' => 'required|string|min:2|max:200',
        ]);

        $apiKey = config('services.google.cse_api_key');
        $engineId = config('services.google.cse_engine_id');

        if (!$apiKey || !$engineId) {
            return response()->json(['success' => false, 'items' => []], 200);
        }

        try {
            $response = Http::get('https://www.googleapis.com/customsearch/v1', [
                'key' => $apiKey,
                'cx' => $engineId,
                'q' => $request->input('q'),
                'num' => 5,
            ]);

            $data = $response->json();
            $items = collect($data['items'] ?? [])->map(fn($item) => [
                'title' => $item['title'] ?? '',
                'description' => $item['snippet'] ?? '',
                'domain' => $item['link'] ?? '',
            ])->all();

            return response()->json(['success' => true, 'items' => $items]);
        } catch (\Exception $e) {
            Log::warning('Google search proxy failed', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'items' => []], 200);
        }
    }
}
