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
            
            Log::info('deleteDocument called', [
                'documentId' => $documentId,
                'user' => $user ? $user->id : null,
                'auth_check' => Auth::check(),
                'has_token' => $request->header('X-Railway-Auth-Token') ? 'yes' : 'no'
            ]);
            
            if (!$user) {
                return response()->json(['success' => false, 'error' => 'Unauthenticated'], 401);
            }
            
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

    /**
     * Store chunk notification from n8n (no authentication required)
     * Called by n8n after each chunk is stored in Qdrant
     */
    public function chunkStored(Request $request)
    {
        try {
            $validated = $request->validate([
                'company_slug' => 'required|string',
                'filename' => 'required|string|max:255',
                'chunk_id' => 'required|string',
                'chunk_index' => 'required|integer'
            ]);

            // Find company by slug
            $company = DB::table('companies')->where('slug', $validated['company_slug'])->first();
            
            if (!$company) {
                Log::warning("Chunk stored - Company not found: {$validated['company_slug']}");
                return response()->json(['success' => false, 'error' => 'Company not found'], 404);
            }

            // Find or create document record
            $document = DB::table('knowledge_documents')
                ->where('company_id', $company->id)
                ->where('filename', $validated['filename'])
                ->first();

            if ($document) {
                // Update existing document - increment chunks and add vector ID
                $existingVectorIds = $document->qdrant_vector_ids ? json_decode($document->qdrant_vector_ids, true) : [];
                $existingVectorIds[] = $validated['chunk_id'];
                
                DB::table('knowledge_documents')
                    ->where('id', $document->id)
                    ->update([
                        'qdrant_vector_ids' => json_encode($existingVectorIds),
                        'chunks_created' => $validated['chunk_index'] + 1,
                        'updated_at' => now()
                    ]);
                    
                Log::info("Chunk stored for document {$validated['filename']}, chunk {$validated['chunk_index']}");
            } else {
                // Document not found - this shouldn't happen normally
                // Create it anyway to not lose data
                $collectionName = "company_{$validated['company_slug']}_knowledge";
                
                DB::table('knowledge_documents')->insert([
                    'company_id' => $company->id,
                    'filename' => $validated['filename'],
                    'category' => 'informacion', // Valid values: historia, producto, informacion, desarrollo
                    'chunks_created' => 1,
                    'qdrant_collection' => $collectionName,
                    'qdrant_vector_ids' => json_encode([$validated['chunk_id']]),
                    'file_path' => "/documents/{$validated['company_slug']}/informacion/{$validated['filename']}",
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                Log::info("Created new document record for {$validated['filename']}");
            }

            return response()->json([
                'success' => true,
                'message' => 'Chunk stored notification received'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error processing chunk stored notification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error processing notification'
            ], 500);
        }
    }

    /**
     * Proxy request to n8n RAG webhook to avoid CORS issues
     * Creates a company-specific workflow if it doesn't exist
     */
    public function proxyToN8n(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json(['success' => false, 'error' => 'Unauthenticated'], 401);
            }
            
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['success' => false, 'error' => 'No company found'], 404);
            }

            $companySlug = $company->slug ?? 'company_' . $company->id;
            $companyName = $company->name ?? $companySlug;
            
            // Get n8n configuration
            $n8nUrl = env('N8N_PUBLIC_URL', 'https://n8n-docker-production-4255.up.railway.app');
            $n8nApiKey = env('N8N_API_KEY');

            // Get OpenAI API key - company specific or fallback to global
            $openaiApiKey = $company->settings['openai_api_key'] ?? env('OPENAI_API_KEY');
            
            if (!$openaiApiKey) {
                return response()->json([
                    'success' => false,
                    'error' => 'No hay API key de OpenAI configurada para esta empresa'
                ], 400);
            }

            // Get Qdrant host
            $qdrantHost = $company->settings['qdrant_host'] ?? env('QDRANT_HOST', 'https://qdrant-production-549b.up.railway.app');

            // Check if company has a workflow, if not create one
            $webhookPath = $company->settings['rag_webhook_path'] ?? null;
            $workflowId = $company->settings['rag_workflow_id'] ?? null;

            if (!$webhookPath || !$workflowId) {
                // Create company-specific workflow
                $result = $this->createCompanyWorkflow($company, $companySlug, $companyName, $n8nUrl, $n8nApiKey);
                
                if (!$result['success']) {
                    return response()->json([
                        'success' => false,
                        'error' => 'Error al crear workflow: ' . $result['error']
                    ], 500);
                }
                
                $webhookPath = $result['webhook_path'];
                $workflowId = $result['workflow_id'];
            }

            $webhookUrl = "{$n8nUrl}/webhook/{$webhookPath}";

            $validated = $request->validate([
                'category' => 'required|string',
                'filename' => 'required|string',
                'file' => 'required|string', // base64 content
            ]);

            Log::info("Proxying RAG request to n8n for {$validated['filename']}", [
                'company_slug' => $companySlug,
                'webhook_url' => $webhookUrl,
                'workflow_id' => $workflowId
            ]);

            // Send to n8n webhook with company-specific credentials
            $response = Http::timeout(120)->post($webhookUrl, [
                'company_slug' => $companySlug,
                'category' => $validated['category'],
                'filename' => $validated['filename'],
                'file' => $validated['file'],
                'openai_api_key' => $openaiApiKey,
                'qdrant_host' => $qdrantHost,
            ]);

            if ($response->successful()) {
                Log::info("n8n RAG webhook responded successfully for {$validated['filename']}");
                return response()->json([
                    'success' => true,
                    'message' => 'Document sent to n8n for AI processing',
                    'n8n_response' => $response->json()
                ]);
            } else {
                Log::error("n8n RAG webhook failed: " . $response->body());
                return response()->json([
                    'success' => false,
                    'error' => 'n8n webhook failed',
                    'details' => $response->body()
                ], 500);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error proxying to n8n: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error sending to n8n: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a company-specific RAG workflow in n8n
     */
    private function createCompanyWorkflow($company, $companySlug, $companyName, $n8nUrl, $n8nApiKey)
    {
        try {
            // Generate unique webhook path for this company
            $webhookPath = "rag-{$companySlug}-" . substr(md5($companySlug . time()), 0, 8);
            $workflowName = "RAG Documents - {$companyName}";

            // Workflow template with company-specific name and webhook path
            $workflow = [
                'name' => $workflowName,
                'nodes' => [
                    [
                        'parameters' => [
                            'httpMethod' => 'POST',
                            'path' => $webhookPath,
                            'responseMode' => 'responseNode',
                            'options' => new \stdClass()
                        ],
                        'type' => 'n8n-nodes-base.webhook',
                        'typeVersion' => 2,
                        'position' => [0, 300],
                        'id' => 'webhook-upload',
                        'name' => 'Webhook Upload',
                        'webhookId' => "rag-{$companySlug}"
                    ],
                    [
                        'parameters' => [
                            'jsCode' => $this->getProcessInputCode()
                        ],
                        'type' => 'n8n-nodes-base.code',
                        'typeVersion' => 2,
                        'position' => [220, 300],
                        'id' => 'process-input',
                        'name' => 'Process Input'
                    ],
                    [
                        'parameters' => [
                            'respondWith' => 'json',
                            'responseBody' => '={"success": true, "message": "Processing started with AI", "filename": "{{ $json.filename }}", "company": "' . $companyName . '"}'
                        ],
                        'type' => 'n8n-nodes-base.respondToWebhook',
                        'typeVersion' => 1.1,
                        'position' => [440, 160],
                        'id' => 'respond-webhook',
                        'name' => 'Respond Immediately'
                    ],
                    [
                        'parameters' => [
                            'method' => 'POST',
                            'url' => 'https://api.openai.com/v1/chat/completions',
                            'sendHeaders' => true,
                            'headerParameters' => [
                                'parameters' => [
                                    ['name' => 'Authorization', 'value' => '=Bearer {{ $json.openai_api_key }}']
                                ]
                            ],
                            'sendBody' => true,
                            'specifyBody' => 'json',
                            'jsonBody' => $this->getAIExtractJsonBody(),
                            'options' => ['timeout' => 120000]
                        ],
                        'type' => 'n8n-nodes-base.httpRequest',
                        'typeVersion' => 4.2,
                        'position' => [440, 300],
                        'id' => 'ai-extract-text',
                        'name' => 'AI Extract Text (GPT-4)'
                    ],
                    [
                        'parameters' => [
                            'jsCode' => $this->getProcessAIResponseCode()
                        ],
                        'type' => 'n8n-nodes-base.code',
                        'typeVersion' => 2,
                        'position' => [660, 300],
                        'id' => 'process-ai-response',
                        'name' => 'Process AI Response'
                    ],
                    [
                        'parameters' => [
                            'jsCode' => $this->getChunkTextCode()
                        ],
                        'type' => 'n8n-nodes-base.code',
                        'typeVersion' => 2,
                        'position' => [880, 300],
                        'id' => 'chunk-text',
                        'name' => 'Split into Chunks'
                    ],
                    [
                        'parameters' => [
                            'method' => 'POST',
                            'url' => 'https://api.openai.com/v1/embeddings',
                            'sendHeaders' => true,
                            'headerParameters' => [
                                'parameters' => [
                                    ['name' => 'Authorization', 'value' => '=Bearer {{ $("Process Input").first().json.openai_api_key }}']
                                ]
                            ],
                            'sendBody' => true,
                            'specifyBody' => 'json',
                            'jsonBody' => "={\n  \"model\": \"text-embedding-3-small\",\n  \"input\": {{ JSON.stringify(\$json.text) }}\n}"
                        ],
                        'type' => 'n8n-nodes-base.httpRequest',
                        'typeVersion' => 4.2,
                        'position' => [1100, 300],
                        'id' => 'generate-embeddings',
                        'name' => 'Generate Embeddings'
                    ],
                    [
                        'parameters' => [
                            'jsCode' => $this->getPrepareQdrantCode()
                        ],
                        'type' => 'n8n-nodes-base.code',
                        'typeVersion' => 2,
                        'position' => [1320, 300],
                        'id' => 'prepare-qdrant',
                        'name' => 'Prepare for Qdrant'
                    ],
                    [
                        'parameters' => [
                            'method' => 'PUT',
                            'url' => '={{ $("Process Input").first().json.qdrant_host }}/collections/{{ $json.collection_name }}/points',
                            'sendBody' => true,
                            'specifyBody' => 'json',
                            'jsonBody' => "={\n  \"points\": [{\n    \"id\": {{ JSON.stringify(\$json.id) }},\n    \"vector\": {{ JSON.stringify(\$json.vector) }},\n    \"payload\": {{ JSON.stringify(\$json.payload) }}\n  }]\n}",
                            'options' => ['timeout' => 30000]
                        ],
                        'type' => 'n8n-nodes-base.httpRequest',
                        'typeVersion' => 4.2,
                        'position' => [1540, 300],
                        'id' => 'store-qdrant',
                        'name' => 'Store in Qdrant'
                    ]
                ],
                'connections' => [
                    'Webhook Upload' => ['main' => [[['node' => 'Process Input', 'type' => 'main', 'index' => 0]]]],
                    'Process Input' => ['main' => [[
                        ['node' => 'Respond Immediately', 'type' => 'main', 'index' => 0],
                        ['node' => 'AI Extract Text (GPT-4)', 'type' => 'main', 'index' => 0]
                    ]]],
                    'AI Extract Text (GPT-4)' => ['main' => [[['node' => 'Process AI Response', 'type' => 'main', 'index' => 0]]]],
                    'Process AI Response' => ['main' => [[['node' => 'Split into Chunks', 'type' => 'main', 'index' => 0]]]],
                    'Split into Chunks' => ['main' => [[['node' => 'Generate Embeddings', 'type' => 'main', 'index' => 0]]]],
                    'Generate Embeddings' => ['main' => [[['node' => 'Prepare for Qdrant', 'type' => 'main', 'index' => 0]]]],
                    'Prepare for Qdrant' => ['main' => [[['node' => 'Store in Qdrant', 'type' => 'main', 'index' => 0]]]]
                ],
                'settings' => ['executionOrder' => 'v1']
            ];

            // Create workflow in n8n
            $response = Http::withHeaders([
                'X-N8N-API-KEY' => $n8nApiKey,
                'Content-Type' => 'application/json'
            ])->post("{$n8nUrl}/api/v1/workflows", $workflow);

            if (!$response->successful()) {
                Log::error("Failed to create n8n workflow: " . $response->body());
                return ['success' => false, 'error' => 'Failed to create workflow in n8n'];
            }

            $workflowData = $response->json();
            $workflowId = $workflowData['id'];

            // Activate the workflow
            $activateResponse = Http::withHeaders([
                'X-N8N-API-KEY' => $n8nApiKey
            ])->post("{$n8nUrl}/api/v1/workflows/{$workflowId}/activate");

            if (!$activateResponse->successful()) {
                Log::warning("Failed to activate workflow: " . $activateResponse->body());
            }

            // Save workflow info to company settings
            $settings = $company->settings ?? [];
            $settings['rag_workflow_id'] = $workflowId;
            $settings['rag_webhook_path'] = $webhookPath;
            $settings['rag_workflow_name'] = $workflowName;
            $company->settings = $settings;
            $company->save();

            Log::info("Created RAG workflow for company {$companySlug}", [
                'workflow_id' => $workflowId,
                'webhook_path' => $webhookPath,
                'workflow_name' => $workflowName
            ]);

            return [
                'success' => true,
                'workflow_id' => $workflowId,
                'webhook_path' => $webhookPath
            ];

        } catch (\Exception $e) {
            Log::error("Error creating company workflow: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function getProcessInputCode()
    {
        return <<<'JS'
// Extraer datos del body
const body = $input.first().json.body || $input.first().json;

const companySlug = body.company_slug || 'default';
const filename = body.filename || 'document.pdf';
const category = body.category || 'general';
const fileBase64 = body.file || '';
const openaiApiKey = body.openai_api_key || '';
const qdrantHost = body.qdrant_host || 'https://qdrant-production-549b.up.railway.app';

// Limpiar el base64 (quitar data:... prefix si existe)
let cleanBase64 = fileBase64;
if (cleanBase64.includes(',')) {
  cleanBase64 = cleanBase64.split(',')[1];
}

// Crear nombre de colección
const collectionName = 'company_' + companySlug.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() + '_knowledge';

// Detectar tipo de archivo
const ext = filename.split('.').pop().toLowerCase();
let mimeType = 'application/octet-stream';
if (ext === 'pdf') mimeType = 'application/pdf';
else if (ext === 'txt') mimeType = 'text/plain';
else if (ext === 'md') mimeType = 'text/markdown';
else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

return {
  json: {
    company_slug: companySlug,
    filename: filename,
    category: category,
    collection_name: collectionName,
    file_base64: cleanBase64,
    mime_type: mimeType,
    file_extension: ext,
    openai_api_key: openaiApiKey,
    qdrant_host: qdrantHost
  }
};
JS;
    }

    private function getAIExtractJsonBody()
    {
        return <<<'JSON'
={
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "Eres un asistente experto en extracción de texto de documentos. Tu tarea es extraer TODO el texto del documento proporcionado de forma limpia y estructurada. Mantén la estructura del documento (títulos, párrafos, listas). NO resumas, extrae el texto COMPLETO. Si el documento está en base64, decodifícalo mentalmente. Responde SOLO con el texto extraído, sin comentarios adicionales."
    },
    {
      "role": "user",
      "content": "Extrae todo el texto de este documento {{ $json.filename }} (tipo: {{ $json.mime_type }}).\n\nContenido en base64:\n{{ $json.file_base64.substring(0, 100000) }}"
    }
  ],
  "max_tokens": 16000,
  "temperature": 0
}
JSON;
    }

    private function getProcessAIResponseCode()
    {
        return <<<'JS'
// Obtener el texto extraído por la IA
const aiResponse = $input.first().json;
const prevData = $('Process Input').first().json;

let extractedText = '';

try {
  extractedText = aiResponse.choices[0].message.content || '';
} catch (e) {
  throw new Error('No se pudo obtener respuesta de la IA: ' + JSON.stringify(aiResponse));
}

// Limpiar el texto
let cleanText = extractedText
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// Verificar que tenemos texto válido
if (!cleanText || cleanText.length < 20) {
  throw new Error('La IA no pudo extraer texto suficiente del documento.');
}

console.log(`Texto extraído por IA: ${cleanText.length} caracteres`);

return {
  json: {
    company_slug: prevData.company_slug,
    filename: prevData.filename,
    category: prevData.category,
    collection_name: prevData.collection_name,
    text: cleanText,
    text_length: cleanText.length
  }
};
JS;
    }

    private function getChunkTextCode()
    {
        return <<<'JS'
// Dividir texto en chunks optimizados para embeddings
const text = $input.first().json.text || '';
const companySlug = $input.first().json.company_slug;
const filename = $input.first().json.filename;
const category = $input.first().json.category;
const collectionName = $input.first().json.collection_name;

// Tamaño óptimo para embeddings: ~1500 tokens = ~6000 caracteres
const maxCharsPerChunk = 6000;
const chunks = [];

if (text.length <= maxCharsPerChunk) {
  chunks.push(text);
} else {
  // Dividir por párrafos
  const paragraphs = text.split(/\n\n+|(?<=\.)\s+(?=[A-Z])/);
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxCharsPerChunk) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + para;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
}

console.log(`Documento dividido en ${chunks.length} chunks`);

return chunks.map((chunk, index) => ({
  json: {
    text: chunk,
    chunk_index: index,
    total_chunks: chunks.length,
    company_slug: companySlug,
    filename: filename,
    category: category,
    collection_name: collectionName
  }
}));
JS;
    }

    private function getPrepareQdrantCode()
    {
        return <<<'JS'
const item = $input.first();
const embedding = item.json.data[0].embedding;
const prevData = $('Split into Chunks').item.json;

// Generar ID único
const uniqueId = `${prevData.filename.replace(/[^a-z0-9]/gi, '_')}_chunk${prevData.chunk_index}_${Date.now()}`;

return {
  json: {
    id: uniqueId,
    vector: embedding,
    payload: {
      text: prevData.text,
      filename: prevData.filename,
      category: prevData.category,
      company_slug: prevData.company_slug,
      chunk_index: prevData.chunk_index,
      total_chunks: prevData.total_chunks
    },
    collection_name: prevData.collection_name
  }
};
JS;
    }
}
