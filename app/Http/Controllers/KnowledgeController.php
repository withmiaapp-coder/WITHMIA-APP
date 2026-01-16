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
        Log::info("proxyToN8n called", [
            'has_user' => Auth::check(),
            'request_method' => $request->method(),
            'has_file' => $request->has('file'),
            'filename' => $request->input('filename'),
        ]);
        
        try {
            $user = Auth::user();
            
            if (!$user) {
                Log::error("proxyToN8n: User not authenticated");
                return response()->json(['success' => false, 'error' => 'Unauthenticated'], 401);
            }
            
            Log::info("proxyToN8n: User authenticated", ['user_id' => $user->id, 'email' => $user->email]);
            
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

            // Verify workflow still exists in n8n
            if ($workflowId && $n8nApiKey) {
                try {
                    $checkResponse = Http::withHeaders([
                        'X-N8N-API-KEY' => $n8nApiKey
                    ])->get("{$n8nUrl}/api/v1/workflows/{$workflowId}");
                    
                    if (!$checkResponse->successful()) {
                        // Workflow was deleted, clear settings
                        Log::info("Workflow {$workflowId} not found in n8n, will create new one");
                        $settings = $company->settings ?? [];
                        unset($settings['rag_workflow_id']);
                        unset($settings['rag_webhook_path']);
                        unset($settings['rag_workflow_name']);
                        $company->settings = $settings;
                        $company->save();
                        
                        $webhookPath = null;
                        $workflowId = null;
                    }
                } catch (\Exception $e) {
                    Log::warning("Could not verify workflow existence: " . $e->getMessage());
                }
            }

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

            Log::info("Processing RAG request for {$validated['filename']}", [
                'company_slug' => $companySlug,
                'workflow_id' => $workflowId
            ]);

            // EXTRACT TEXT IN LARAVEL - supports visual PDFs with GPT-4 Vision
            $extractedText = $this->extractTextFromDocument(
                $validated['file'], 
                $validated['filename'],
                $openaiApiKey
            );

            if (!$extractedText || strlen($extractedText) < 50) {
                return response()->json([
                    'success' => false,
                    'error' => 'No se pudo extraer texto del documento. Puede estar vacío o ser solo imágenes sin texto legible.'
                ], 400);
            }

            Log::info("Text extracted: " . strlen($extractedText) . " characters");

            // Send EXTRACTED TEXT to n8n (not the binary file)
            $response = Http::timeout(120)->post($webhookUrl, [
                'company_slug' => $companySlug,
                'category' => $validated['category'],
                'filename' => $validated['filename'],
                'text' => $extractedText, // Send text, not file
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
     * Extract text from document - supports PDFs (including visual/catalog PDFs), TXT, DOCX
     * Uses GPT-4 Vision for visual PDFs when text extraction yields poor results
     */
    private function extractTextFromDocument($base64Content, $filename, $openaiApiKey)
    {
        // Clean base64
        $cleanBase64 = $base64Content;
        if (strpos($cleanBase64, ',') !== false) {
            $cleanBase64 = explode(',', $cleanBase64)[1];
        }
        
        $fileContent = base64_decode($cleanBase64);
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        $extractedText = '';
        
        try {
            if ($extension === 'pdf') {
                // First try pdfparser for text-based PDFs
                $parser = new \Smalot\PdfParser\Parser();
                $pdf = $parser->parseContent($fileContent);
                $extractedText = $pdf->getText();
                
                // Fix UTF-8 encoding issues
                // PDFs often have text in Latin-1 or Windows-1252 that needs conversion
                if (!mb_check_encoding($extractedText, 'UTF-8')) {
                    // Try to detect and convert encoding
                    $detectedEncoding = mb_detect_encoding($extractedText, ['UTF-8', 'ISO-8859-1', 'Windows-1252', 'ASCII'], true);
                    if ($detectedEncoding && $detectedEncoding !== 'UTF-8') {
                        $extractedText = mb_convert_encoding($extractedText, 'UTF-8', $detectedEncoding);
                        Log::info("Converted PDF text from {$detectedEncoding} to UTF-8");
                    }
                }
                
                // Fix mojibake (UTF-8 double-encoded text)
                $extractedText = $this->fixUtf8Mojibake($extractedText);
                
                // Clean the text
                $extractedText = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $extractedText);
                $extractedText = preg_replace('/\s+/', ' ', $extractedText);
                $extractedText = trim($extractedText);
                
                Log::info("PDF text extraction: " . strlen($extractedText) . " characters");
                
                // If text is too short, it's likely a visual/scanned PDF - use GPT-4 Vision
                if (strlen($extractedText) < 200) {
                    Log::info("PDF has little text, using GPT-4 Vision for visual content");
                    $extractedText = $this->extractWithVision($cleanBase64, $filename, $openaiApiKey, 'pdf');
                }
                
            } elseif (in_array($extension, ['txt', 'md'])) {
                $extractedText = $fileContent;
                
            } elseif ($extension === 'docx') {
                // Extract text from DOCX
                $tempFile = tempnam(sys_get_temp_dir(), 'docx_');
                file_put_contents($tempFile, $fileContent);
                
                $zip = new \ZipArchive();
                if ($zip->open($tempFile) === true) {
                    $xml = $zip->getFromName('word/document.xml');
                    $zip->close();
                    
                    // Strip XML tags
                    $extractedText = strip_tags($xml);
                    $extractedText = preg_replace('/\s+/', ' ', $extractedText);
                    $extractedText = trim($extractedText);
                }
                
                unlink($tempFile);
                
            } elseif (in_array($extension, ['png', 'jpg', 'jpeg', 'webp', 'gif'])) {
                // Images - use Vision directly
                $extractedText = $this->extractWithVision($cleanBase64, $filename, $openaiApiKey, 'image');
            }
            
        } catch (\Exception $e) {
            Log::error("Text extraction error for {$filename}: " . $e->getMessage());
            
            // Fallback to Vision for PDFs
            if ($extension === 'pdf') {
                Log::info("Falling back to GPT-4 Vision after extraction error");
                try {
                    $extractedText = $this->extractWithVision($cleanBase64, $filename, $openaiApiKey, 'pdf');
                } catch (\Exception $e2) {
                    Log::error("Vision fallback also failed: " . $e2->getMessage());
                }
            }
        }
        
        return $extractedText;
    }

    /**
     * Fix UTF-8 mojibake and ensure valid UTF-8 for json_encode
     * Preserves Spanish characters (á, é, í, ó, ú, ñ, etc.)
     */
    private function fixUtf8Mojibake($text)
    {
        // Detect mojibake patterns for Spanish characters
        // When UTF-8 is double-encoded, we get patterns like:
        // á → Ã¡, é → Ã©, í → Ã­, ó → Ã³, ú → Ãº, ñ → Ã±, Ñ → Ã'
        
        // Check for common mojibake patterns (Ã followed by specific bytes)
        $mojibakePatterns = [
            'Ã¡', 'Ã©', 'Ã­', 'Ã³', 'Ãº', 'Ã±', 'Ã'',  // á é í ó ú ñ Ñ
            'Ã¼', 'Ã', 'Ã‰', 'Ã', 'Ã"', 'Ãš',          // ü Á É Í Ó Ú
            'Â°', 'Â¿', 'Â¡',                            // ° ¿ ¡
        ];
        
        $hasMojibake = false;
        foreach ($mojibakePatterns as $pattern) {
            if (strpos($text, $pattern) !== false) {
                $hasMojibake = true;
                Log::info("Detected mojibake pattern: " . bin2hex($pattern));
                break;
            }
        }
        
        if ($hasMojibake) {
            // The text is UTF-8 that was incorrectly re-encoded as UTF-8
            // To fix: interpret the UTF-8 bytes as ISO-8859-1 and you get correct UTF-8
            $fixed = mb_convert_encoding($text, 'ISO-8859-1', 'UTF-8');
            
            // Verify the fix worked
            if ($fixed && mb_check_encoding($fixed, 'UTF-8')) {
                Log::info("Fixed mojibake by decoding to ISO-8859-1, length: " . strlen($fixed));
                $text = $fixed;
            } else {
                Log::warning("Mojibake fix failed, keeping original");
            }
        }
        
        // Ensure text is valid UTF-8 for json_encode
        if (!mb_check_encoding($text, 'UTF-8')) {
            $text = mb_convert_encoding($text, 'UTF-8', 'ISO-8859-1');
            Log::info("Converted non-UTF8 text to UTF-8");
        }
        
        // Remove control characters but keep printable chars
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text);
        
        // Final check for json_encode
        if (@json_encode(['test' => $text]) === false) {
            Log::warning("JSON encode still failing, applying iconv cleanup");
            $text = @iconv('UTF-8', 'UTF-8//IGNORE', $text) ?: $text;
        }
        
        Log::info("UTF-8 processing completed, length: " . strlen($text));
        return $text;
    }

    /**
     * Extract text from visual content using GPT-4 Vision
     */
    private function extractWithVision($base64Content, $filename, $openaiApiKey, $type = 'pdf')
    {
        // For PDFs, we need to tell the user we're processing visual content
        // GPT-4 Vision can read images, so we'll describe what to extract
        
        $mimeType = 'application/pdf';
        if ($type === 'image') {
            $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            $mimeType = "image/{$ext}";
            if ($ext === 'jpg') $mimeType = 'image/jpeg';
        }
        
        // Use GPT-4o (supports vision) to analyze the document
        $response = Http::timeout(180)
            ->withHeaders([
                'Authorization' => "Bearer {$openaiApiKey}",
                'Content-Type' => 'application/json'
            ])
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => 'gpt-4o',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Eres un experto en extraer texto de documentos visuales como catálogos, presentaciones, y PDFs con imágenes. Tu tarea es extraer TODO el texto visible en el documento, incluyendo:
- Títulos y subtítulos
- Descripciones de productos
- Precios y códigos
- Texto en tablas
- Texto en imágenes
- Cualquier información relevante

Responde SOLO con el texto extraído, organizado de forma clara. No agregues comentarios ni explicaciones.'
                    ],
                    [
                        'role' => 'user',
                        'content' => [
                            [
                                'type' => 'text',
                                'text' => "Extrae todo el texto de este documento: {$filename}"
                            ],
                            [
                                'type' => 'image_url',
                                'image_url' => [
                                    'url' => "data:{$mimeType};base64,{$base64Content}",
                                    'detail' => 'high'
                                ]
                            ]
                        ]
                    ]
                ],
                'max_tokens' => 4096,
                'temperature' => 0
            ]);
        
        if ($response->successful()) {
            $data = $response->json();
            $text = $data['choices'][0]['message']['content'] ?? '';
            Log::info("GPT-4 Vision extracted: " . strlen($text) . " characters");
            return trim($text);
        } else {
            Log::error("GPT-4 Vision API error: " . $response->body());
            throw new \Exception("Error calling GPT-4 Vision: " . $response->status());
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

            // Workflow template - SIMPLIFICADO: texto ya extraído en Laravel
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
                            'responseBody' => '={"success": true, "message": "Procesando documento", "filename": "{{ $json.filename }}", "text_length": {{ $json.text_length }}, "company": "' . $companyName . '"}'
                        ],
                        'type' => 'n8n-nodes-base.respondToWebhook',
                        'typeVersion' => 1.1,
                        'position' => [440, 160],
                        'id' => 'respond-webhook',
                        'name' => 'Respond Immediately'
                    ],
                    [
                        'parameters' => [
                            'jsCode' => $this->getChunkTextCode()
                        ],
                        'type' => 'n8n-nodes-base.code',
                        'typeVersion' => 2,
                        'position' => [440, 300],
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
                        'position' => [660, 300],
                        'id' => 'generate-embeddings',
                        'name' => 'Generate Embeddings'
                    ],
                    [
                        'parameters' => [
                            'jsCode' => $this->getPrepareQdrantCode()
                        ],
                        'type' => 'n8n-nodes-base.code',
                        'typeVersion' => 2,
                        'position' => [880, 300],
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
                        'position' => [1100, 300],
                        'id' => 'store-qdrant',
                        'name' => 'Store in Qdrant'
                    ]
                ],
                'connections' => [
                    'Webhook Upload' => ['main' => [[['node' => 'Process Input', 'type' => 'main', 'index' => 0]]]],
                    'Process Input' => ['main' => [[
                        ['node' => 'Respond Immediately', 'type' => 'main', 'index' => 0],
                        ['node' => 'Split into Chunks', 'type' => 'main', 'index' => 0]
                    ]]],
                    'Split into Chunks' => ['main' => [[['node' => 'Generate Embeddings', 'type' => 'main', 'index' => 0]]]],
                    'Generate Embeddings' => ['main' => [[['node' => 'Prepare for Qdrant', 'type' => 'main', 'index' => 0]]]],
                    'Prepare for Qdrant' => ['main' => [[['node' => 'Store in Qdrant', 'type' => 'main', 'index' => 0]]]]
                ],
                'settings' => ['executionOrder' => 'v1']
                // NOTE: 'active' es read-only, se activa después de crear
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

            // SIEMPRE activar el workflow después de crearlo
            // n8n requiere (object)[] para enviar {} como body JSON
            Log::info("Activating workflow {$workflowId}...");
            $activateResponse = Http::withHeaders([
                'X-N8N-API-KEY' => $n8nApiKey,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])->post("{$n8nUrl}/api/v1/workflows/{$workflowId}/activate", (object)[]);

            if ($activateResponse->successful()) {
                Log::info("✅ Workflow {$workflowId} activated successfully");
            } else {
                Log::error("❌ Failed to activate workflow: " . $activateResponse->body());
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
// Extraer datos del body - TEXTO YA VIENE EXTRAÍDO DE LARAVEL
const body = $input.first().json.body || $input.first().json;

const companySlug = body.company_slug || 'default';
const filename = body.filename || 'document.pdf';
const category = body.category || 'general';
const text = body.text || ''; // Texto ya extraído por Laravel
const openaiApiKey = body.openai_api_key || '';
const qdrantHost = body.qdrant_host || 'https://qdrant-production-549b.up.railway.app';

// Crear nombre de colección
const collectionName = 'company_' + companySlug.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() + '_knowledge';

return {
  json: {
    company_slug: companySlug,
    filename: filename,
    category: category,
    collection_name: collectionName,
    text: text,
    text_length: text.length,
    openai_api_key: openaiApiKey,
    qdrant_host: qdrantHost
  }
};
JS;
    }

    private function getChunkTextCode()
    {
        return <<<'JS'
// Dividir texto en chunks optimizados para embeddings
// Tomar datos de Process Input
const processInput = $("Process Input").first().json;
const text = processInput.text || '';
const companySlug = processInput.company_slug;
const filename = processInput.filename;
const category = processInput.category;
const collectionName = processInput.collection_name;
const openaiApiKey = processInput.openai_api_key;
const qdrantHost = processInput.qdrant_host;

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
    collection_name: collectionName,
    openai_api_key: openaiApiKey,
    qdrant_host: qdrantHost
  }
}));
JS;
    }

    private function getPrepareQdrantCode()
    {
        return <<<'JS'
// Procesar TODOS los items de embeddings
const items = $input.all();
const chunkItems = $('Split into Chunks').all();
const results = [];

// Generar UUID válido para Qdrant
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

for (let i = 0; i < items.length; i++) {
  const embedding = items[i].json.data[0].embedding;
  const chunkData = chunkItems[i].json;
  
  results.push({
    json: {
      id: generateUUID(),
      vector: embedding,
      payload: {
        text: chunkData.text,
        filename: chunkData.filename,
        category: chunkData.category,
        company_slug: chunkData.company_slug,
        chunk_index: chunkData.chunk_index,
        total_chunks: chunkData.total_chunks
      },
      collection_name: chunkData.collection_name
    }
  });
}

console.log(`Preparados ${results.length} puntos para Qdrant`);
return results;
JS;
    }

    /**
     * Reset the RAG workflow for the company (deletes and recreates)
     */
    public function resetWorkflow(Request $request)
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

            $n8nUrl = env('N8N_PUBLIC_URL', 'https://n8n-docker-production-4255.up.railway.app');
            $n8nApiKey = env('N8N_API_KEY');

            // Try to delete the old workflow if it exists
            $oldWorkflowId = $company->settings['rag_workflow_id'] ?? null;
            if ($oldWorkflowId && $n8nApiKey) {
                try {
                    Http::withHeaders([
                        'X-N8N-API-KEY' => $n8nApiKey
                    ])->delete("{$n8nUrl}/api/v1/workflows/{$oldWorkflowId}");
                } catch (\Exception $e) {
                    Log::warning("Could not delete old workflow: " . $e->getMessage());
                }
            }

            // Clear workflow settings
            $settings = $company->settings ?? [];
            unset($settings['rag_workflow_id']);
            unset($settings['rag_webhook_path']);
            unset($settings['rag_workflow_name']);
            $company->settings = $settings;
            $company->save();

            // Create new workflow
            $companySlug = $company->slug ?? 'company_' . $company->id;
            $companyName = $company->name ?? $companySlug;
            
            $result = $this->createCompanyWorkflow($company, $companySlug, $companyName, $n8nUrl, $n8nApiKey);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => 'Error creating new workflow: ' . $result['error']
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Workflow reset successfully',
                'workflow_id' => $result['workflow_id'],
                'webhook_path' => $result['webhook_path']
            ]);

        } catch (\Exception $e) {
            Log::error('Error resetting workflow: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error resetting workflow: ' . $e->getMessage()
            ], 500);
        }
    }
}
