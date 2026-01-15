<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class KnowledgeController extends Controller
{
    private $qdrantHost;

    public function __construct()
    {
        $this->qdrantHost = rtrim(env('QDRANT_HOST', 'http://localhost:6333'), '/');
    }

    /**
     * Ensure Qdrant collection exists for company, create if not
     */
    private function ensureQdrantCollection($companySlug)
    {
        $collectionName = "company_{$companySlug}_knowledge";
        
        try {
            // Check if collection exists
            $response = Http::get("{$this->qdrantHost}/collections/{$collectionName}");
            
            if ($response->successful()) {
                Log::info("Qdrant collection {$collectionName} already exists");
                return true;
            }
            
            // Collection doesn't exist, create it
            Log::info("Creating Qdrant collection: {$collectionName}");
            
            $createResponse = Http::put("{$this->qdrantHost}/collections/{$collectionName}", [
                'vectors' => [
                    'size' => 1536,  // OpenAI text-embedding-3-small dimension
                    'distance' => 'Cosine'
                ]
            ]);
            
            if ($createResponse->successful()) {
                Log::info("Successfully created Qdrant collection: {$collectionName}");
                return true;
            } else {
                Log::error("Failed to create Qdrant collection: " . $createResponse->body());
                return false;
            }
            
        } catch (\Exception $e) {
            Log::error("Error ensuring Qdrant collection {$collectionName}: " . $e->getMessage());
            return false;
        }
    }
    /**
     * Get current user's company onboarding data
     */
    public function getOnboardingData(Request $request)
    {
        try {
            $user = Auth::user();
            Log::info('getOnboardingData - User ID: ' . $user->id . ', Company Slug: ' . $user->company_slug);
            
            $company = $user->company;
            
            if (!$company) {
                Log::error('getOnboardingData - No company found for user ' . $user->id);
                return response()->json([
                    'success' => false,
                    'error' => 'No se encontró información de la empresa'
                ], 404);
            }

            $responseData = [
                'company_name' => $company->name ?? '',
                'company_description' => $company->description ?? '',
                'has_website' => !empty($company->website),
                'website' => $company->website ?? '',
                'client_type' => $company->client_type ?? null
            ];
            
            Log::info('getOnboardingData - Response:', $responseData);

            return response()->json([
                'success' => true,
                'data' => $responseData
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching onboarding data: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
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
                'client_type' => 'nullable|in:interno,externo'
            ]);

            // Map fields to company table columns
            $updateData = [];
            if (isset($validated['company_name'])) $updateData['name'] = $validated['company_name'];
            if (isset($validated['company_description'])) $updateData['description'] = $validated['company_description'];
            if (isset($validated['website'])) $updateData['website'] = $validated['website'];
            if (isset($validated['client_type'])) $updateData['client_type'] = $validated['client_type'];

            $company->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Datos actualizados correctamente',
                'data' => [
                    'company_name' => $company->name,
                    'company_description' => $company->description,
                    'has_website' => !empty($company->website),
                    'website' => $company->website,
                    'client_type' => $company->client_type
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
     * Get documents for current user/company filtered by category
     */
    public function getDocuments(Request $request)
    {
        try {
            $user = Auth::user();
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['success' => false, 'error' => 'No company found'], 404);
            }

            $category = $request->query('category');

            $query = DB::table('knowledge_documents')
                ->where('company_id', $company->id);

            if ($category) {
                $query->where('category', $category);
            }

            $documents = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'documents' => $documents
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching documents: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener documentos'
            ], 500);
        }
    }

    /**
     * Delete a document
     */
    public function deleteDocument(Request $request, $documentId)
    {
        try {
            $user = Auth::user();
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['success' => false, 'error' => 'No company found'], 404);
            }

            // Verify document belongs to user's company
            $document = DB::table('knowledge_documents')
                ->where('id', $documentId)
                ->where('company_id', $company->id)
                ->first();

            if (!$document) {
                return response()->json([
                    'success' => false,
                    'error' => 'Documento no encontrado'
                ], 404);
            }

            // Delete vectors from Qdrant using stored vector IDs
            try {
                $companySlug = $company->slug ?? 'company_' . $company->id;
                $collectionName = $document->qdrant_collection ?? "company_{$companySlug}_knowledge";
                $qdrantUrl = rtrim(env('QDRANT_HOST', 'http://localhost:6333'), '/');

                // Get vector IDs from qdrant_vector_ids column (JSON array)
                if (!empty($document->qdrant_vector_ids)) {
                    $vectorIds = json_decode($document->qdrant_vector_ids, true);
                    
                    if (is_array($vectorIds) && count($vectorIds) > 0) {
                        // Delete points by IDs
                        $ch = curl_init("{$qdrantUrl}/collections/{$collectionName}/points/delete");
                        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
                        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                            'points' => $vectorIds
                        ]));
                        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

                        $qdrantResponse = curl_exec($ch);
                        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                        curl_close($ch);

                        if ($httpCode != 200 && $httpCode != 201) {
                            Log::warning("Failed to delete from Qdrant: " . $qdrantResponse);
                        } else {
                            Log::info("Deleted " . count($vectorIds) . " vectors from Qdrant for document: " . $document->filename);
                        }
                    }
                } else {
                    Log::warning("No vector IDs stored for document: " . $document->filename);
                }
            } catch (\Exception $e) {
                Log::warning('Error deleting from Qdrant: ' . $e->getMessage());
                // Continue even if Qdrant deletion fails
            }            // Delete from database
            DB::table('knowledge_documents')->where('id', $documentId)->delete();

            return response()->json([
                'success' => true,
                'message' => 'Documento eliminado correctamente'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al eliminar documento'
            ], 500);
        }
    }

    /**
     * Store document metadata after successful upload to N8N
     * This endpoint is called by the frontend AFTER the N8N webhook succeeds
     */
    public function storeDocumentMetadata(Request $request)
    {
        try {
            $user = Auth::user();
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['success' => false, 'error' => 'No company found'], 404);
            }

            // Use company slug for Qdrant collection naming
            $companySlug = $company->slug ?? 'company_' . $company->id;

            // Ensure Qdrant collection exists for this company
            $this->ensureQdrantCollection($companySlug);

            $validated = $request->validate([
                'filename' => 'required|string|max:255',
                'category' => 'required|in:historia,producto,informacion,desarrollo',
                'chunks_created' => 'nullable|integer',
                'qdrant_collection' => 'nullable|string'
            ]);

            $documentId = DB::table('knowledge_documents')->insertGetId([
                'company_id' => $company->id,
                'filename' => $validated['filename'],
                'category' => $validated['category'],
                'chunks_created' => $validated['chunks_created'] ?? 0,
                'qdrant_collection' => $validated['qdrant_collection'] ?? "company_{$companySlug}_knowledge",
                'file_path' => "/documents/{$companySlug}/{$validated['category']}/{$validated['filename']}",
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Metadata guardada correctamente',
                'document_id' => $documentId
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error storing document metadata: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al guardar metadata'
            ], 500);
        }
    }

    /**
     * Update vector IDs after N8N processing is complete
     * This is called in the background when n8n finishes processing
     */
    public function updateVectorIds(Request $request)
    {
        try {
            $user = Auth::user();
            $company = $user->company;

            if (!$company) {
                return response()->json(['success' => false, 'error' => 'No company found'], 404);
            }

            $validated = $request->validate([
                'filename' => 'required|string|max:255',
                'vector_ids' => 'required|array',
                'chunks_created' => 'nullable|integer'
            ]);

            $updated = DB::table('knowledge_documents')
                ->where('company_id', $company->id)
                ->where('filename', $validated['filename'])
                ->update([
                    'qdrant_vector_ids' => json_encode($validated['vector_ids']),
                    'chunks_created' => $validated['chunks_created'] ?? 0,
                    'updated_at' => now()
                ]);

            if ($updated) {
                Log::info("Updated vector IDs for document: {$validated['filename']}, IDs count: " . count($validated['vector_ids']));
                return response()->json([
                    'success' => true,
                    'message' => 'Vector IDs actualizados correctamente'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'Documento no encontrado'
                ], 404);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating vector IDs: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar vector IDs'
            ], 500);
        }
    }

    /**
     * Update vector IDs from n8n webhook (no authentication required, uses secret token)
     * This endpoint is called by n8n after processing is complete
     */
    public function updateVectorIdsWebhook(Request $request)
    {
        try {
            // Verify secret token
            $token = $request->header('X-N8N-Secret') ?? $request->input('secret_token');
            if ($token !== 'withmia_n8n_secret_2024') {
                return response()->json(['success' => false, 'error' => 'Invalid token'], 401);
            }

            $validated = $request->validate([
                'company_id' => 'required|integer',
                'filename' => 'required|string|max:255',
                'vector_ids' => 'required|array',
                'chunks_created' => 'nullable|integer'
            ]);

            $updated = DB::table('knowledge_documents')
                ->where('company_id', $validated['company_id'])
                ->where('filename', $validated['filename'])
                ->update([
                    'qdrant_vector_ids' => json_encode($validated['vector_ids']),
                    'chunks_created' => $validated['chunks_created'] ?? 0,
                    'updated_at' => now()
                ]);

            if ($updated) {
                Log::info("N8N updated vector IDs for document: {$validated['filename']}, IDs count: " . count($validated['vector_ids']));
                return response()->json([
                    'success' => true,
                    'message' => 'Vector IDs actualizados correctamente'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'Documento no encontrado'
                ], 404);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating vector IDs from n8n: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar vector IDs'
            ], 500);
        }
    }
}
