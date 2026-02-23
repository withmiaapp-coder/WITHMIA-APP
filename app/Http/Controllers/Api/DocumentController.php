<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Company;
use App\Models\KnowledgeDocument;
use App\Services\QdrantService;
use App\Services\N8nService;
use App\Http\Controllers\Controller;

class DocumentController extends Controller
{
    private N8nService $n8nService;
    private QdrantService $qdrantService;

    public function __construct(N8nService $n8nService, QdrantService $qdrantService)
    {
        $this->n8nService = $n8nService;
        $this->qdrantService = $qdrantService;
    }

    /**
     * Ensure Qdrant collection exists for company, create if not
     */
    private function ensureQdrantCollection($companySlug)
    {
        $collectionName = $this->qdrantService->getCollectionName($companySlug);
        
        try {
            // Check if collection exists using service
            if ($this->qdrantService->collectionExists($collectionName)) {
                return true;
            }
            
            // Collection doesn't exist, create it using service
            $result = $this->qdrantService->createCompanyCollection($companySlug);
            
            if ($result['success']) {
                return true;
            } else {
                Log::error("Failed to create Qdrant collection: " . ($result['error'] ?? 'Unknown error'));
                return false;
            }
            
        } catch (\Exception $e) {
            Log::error("Error ensuring Qdrant collection {$collectionName}: " . $e->getMessage());
            return false;
        }
    }

    public function getDocuments(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['success' => false, 'error' => 'No company found'], 404);
            }

            $category = $request->query('category');

            $query = KnowledgeDocument::where('company_id', $company->id);

            if ($category) {
                $query->where('category', $category);
            }

            $perPage = min((int) $request->query('per_page', 50), 100);
            $documents = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'documents' => $documents->items(),
                'pagination' => [
                    'total' => $documents->total(),
                    'per_page' => $documents->perPage(),
                    'current_page' => $documents->currentPage(),
                    'last_page' => $documents->lastPage(),
                ],
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
    public function deleteDocument(Request $request, $documentId): JsonResponse
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

            // Verify document belongs to user's company
            $document = KnowledgeDocument::where('id', $documentId)
                ->where('company_id', $company->id)
                ->first();

            if (!$document) {
                return response()->json([
                    'success' => false,
                    'error' => 'Documento no encontrado'
                ], 404);
            }

            // Delete vectors from Qdrant using payload filter (robust - doesn't depend on stored IDs)
            try {
                $companySlug = $company->slug ?? 'company_' . $company->id;
                $collectionName = $document->qdrant_collection ?? "company_{$companySlug}_knowledge";
                $qdrantUrl = rtrim(config('qdrant.url'), '/');
                $qdrantApiKey = config('qdrant.api_key');

                // Delete by payload filter: filename + company_slug
                // This is more robust than relying on stored vector IDs
                $qdrantResponse = Http::withHeaders([
                    'api-key' => $qdrantApiKey,
                ])->post("{$qdrantUrl}/collections/{$collectionName}/points/delete", [
                    'filter' => [
                        'must' => [
                            ['key' => 'filename', 'match' => ['value' => $document->filename]],
                            ['key' => 'company_slug', 'match' => ['value' => $companySlug]],
                        ]
                    ]
                ]);

                if (!$qdrantResponse->successful()) {
                    Log::warning("Failed to delete from Qdrant by filter: " . $qdrantResponse->body());
                    
                    // Fallback: try deleting by stored vector IDs
                    if (!empty($document->qdrant_vector_ids)) {
                        $vectorIds = json_decode($document->qdrant_vector_ids, true);
                        if (is_array($vectorIds) && count($vectorIds) > 0) {
                            $fallbackResponse = Http::withHeaders([
                                'api-key' => $qdrantApiKey,
                            ])->post("{$qdrantUrl}/collections/{$collectionName}/points/delete", [
                                'points' => $vectorIds
                            ]);
                            Log::info("Qdrant fallback delete by IDs: " . ($fallbackResponse->successful() ? 'success' : 'failed'));
                        }
                    }
                } else {
                    Log::info("Deleted vectors from Qdrant by filter for document: {$document->filename}", [
                        'collection' => $collectionName,
                        'response' => $qdrantResponse->json(),
                    ]);
                }
            } catch (\Exception $e) {
                Log::warning('Error deleting from Qdrant: ' . $e->getMessage());
                // Continue even if Qdrant deletion fails
            }            // Delete ALL DB records with same filename for this company (cleanup duplicates)
            $deletedCount = KnowledgeDocument::where('company_id', $company->id)
                ->where('filename', $document->filename)
                ->delete();
            
            if ($deletedCount > 1) {
                Log::info("Cleaned up {$deletedCount} duplicate records for {$document->filename}");
            }

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
    public function storeDocumentMetadata(Request $request): JsonResponse
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

            $document = KnowledgeDocument::updateOrCreate(
                [
                    'company_id' => $company->id,
                    'filename' => $validated['filename'],
                ],
                [
                    'title' => pathinfo($validated['filename'], PATHINFO_FILENAME),
                    'category' => $validated['category'],
                    'chunks_created' => $validated['chunks_created'] ?? 0,
                    'qdrant_collection' => $validated['qdrant_collection'] ?? "company_{$companySlug}_knowledge",
                    'file_path' => "/documents/{$companySlug}/{$validated['category']}/{$validated['filename']}",
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Metadata guardada correctamente',
                'document_id' => $document->id
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
    public function updateVectorIds(Request $request): JsonResponse
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

            $updated = KnowledgeDocument::where('company_id', $company->id)
                ->where('filename', $validated['filename'])
                ->update([
                    'qdrant_vector_ids' => json_encode($validated['vector_ids']),
                    'chunks_created' => $validated['chunks_created'] ?? 0,
                ]);

            if ($updated) {
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
    public function updateVectorIdsWebhook(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'company_id' => 'required|integer',
                'filename' => 'required|string|max:255',
                'vector_ids' => 'required|array',
                'chunks_created' => 'nullable|integer'
            ]);

            $updated = KnowledgeDocument::where('company_id', $validated['company_id'])
                ->where('filename', $validated['filename'])
                ->update([
                    'qdrant_vector_ids' => json_encode($validated['vector_ids']),
                    'chunks_created' => $validated['chunks_created'] ?? 0,
                ]);

            if ($updated) {
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
    public function chunkStored(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'company_slug' => 'required|string',
                'filename' => 'required|string|max:255',
                'chunk_id' => 'required|string',
                'chunk_index' => 'required|integer'
            ]);

            // Find company by slug
            $company = Company::where('slug', $validated['company_slug'])->first();
            
            if (!$company) {
                Log::warning("Chunk stored - Company not found: {$validated['company_slug']}");
                return response()->json(['success' => false, 'error' => 'Company not found'], 404);
            }

            // Find the LATEST document record (in case of duplicates)
            $document = KnowledgeDocument::where('company_id', $company->id)
                ->where('filename', $validated['filename'])
                ->orderBy('id', 'desc')
                ->first();

            if ($document) {
                // Update existing document - increment chunks and add vector ID
                $rawVectorIds = $document->qdrant_vector_ids;
                $existingVectorIds = is_string($rawVectorIds) ? (json_decode($rawVectorIds, true) ?? []) : (is_array($rawVectorIds) ? $rawVectorIds : []);
                $existingVectorIds[] = $validated['chunk_id'];
                
                KnowledgeDocument::where('id', $document->id)
                    ->update([
                        'qdrant_vector_ids' => json_encode($existingVectorIds),
                        'chunks_created' => $validated['chunk_index'] + 1,
                    ]);
                    
                Log::info("Chunk stored for document {$validated['filename']}, chunk {$validated['chunk_index']}, total IDs: " . count($existingVectorIds));
            } else {
                // Document not found - this shouldn't happen normally
                // Create it anyway to not lose data
                $collectionName = "company_{$validated['company_slug']}_knowledge";
                
                KnowledgeDocument::create([
                    'company_id' => $company->id,
                    'title' => pathinfo($validated['filename'], PATHINFO_FILENAME),
                    'filename' => $validated['filename'],
                    'category' => 'informacion',
                    'chunks_created' => 1,
                    'qdrant_collection' => $collectionName,
                    'qdrant_vector_ids' => json_encode([$validated['chunk_id']]),
                    'file_path' => "/documents/{$validated['company_slug']}/informacion/{$validated['filename']}",
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
    public function proxyToN8n(Request $request): JsonResponse
    {
        Log::info('proxyToN8n called', [
            'filename' => $request->input('filename'),
            'has_file' => $request->has('file'),
        ]);
        
        try {
            $user = Auth::user();
            
            if (!$user) {
                Log::error('proxyToN8n: User not authenticated');
                return response()->json(['success' => false, 'error' => 'Unauthenticated'], 401);
            }
            
            Log::info('proxyToN8n: User authenticated', ['user_id' => $user->id]);
            
            $company = $user->company;
            
            if (!$company) {
                return response()->json(['success' => false, 'error' => 'No company found'], 404);
            }

            $companySlug = $company->slug ?? 'company_' . $company->id;
            $companyName = $company->name ?? $companySlug;

            // Get OpenAI API key - company specific or fallback to global
            $openaiApiKey = $company->settings['openai_api_key'] ?? config('services.openai.api_key');
            
            if (!$openaiApiKey) {
                return response()->json([
                    'success' => false,
                    'error' => 'No hay API key de OpenAI configurada para esta empresa'
                ], 400);
            }

            // Get Qdrant host
            $qdrantHost = $company->settings['qdrant_host'] ?? config('qdrant.url');
            $qdrantApiKey = $company->settings['qdrant_api_key'] ?? config('qdrant.api_key');

            // Check if company has a workflow, if not create one
            $webhookPath = $company->settings['rag_webhook_path'] ?? null;
            $workflowId = $company->settings['rag_workflow_id'] ?? null;

            // Verify workflow still exists in n8n using N8nService
            if ($workflowId) {
                if (!$this->n8nService->workflowExists($workflowId)) {
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
            }

            if (!$webhookPath || !$workflowId) {
                // Search for existing RAG workflow using N8nService
                $existingWorkflow = $this->n8nService->findWorkflowByName("RAG Documents - {$companySlug}");
                
                if ($existingWorkflow) {
                    Log::info("Workflow RAG existente encontrado en N8N: {$existingWorkflow['id']} - {$existingWorkflow['name']}");
                    
                    // Extract webhook path from workflow nodes
                    $existingWebhookPath = null;
                    foreach ($existingWorkflow['nodes'] ?? [] as $node) {
                        if ($node['type'] === 'n8n-nodes-base.webhook') {
                            $existingWebhookPath = $node['parameters']['path'] ?? null;
                            break;
                        }
                    }
                    
                    // Save to company settings
                    $settings = $company->settings ?? [];
                    $settings['rag_workflow_id'] = $existingWorkflow['id'];
                    $settings['rag_webhook_path'] = $existingWebhookPath;
                    $settings['rag_workflow_name'] = $existingWorkflow['name'];
                    $company->settings = $settings;
                    $company->save();
                    
                    $workflowId = $existingWorkflow['id'];
                    $webhookPath = $existingWebhookPath;
                }
            }

            // Solo crear si definitivamente no existe
            if (!$webhookPath || !$workflowId) {
                // Create company-specific workflow
                Log::info("Creando nuevo workflow RAG para {$companySlug} - no se encontró existente");
                $result = $this->createCompanyWorkflow($company, $companySlug, $companyName);
                
                if (!$result['success']) {
                    return response()->json([
                        'success' => false,
                        'error' => 'Error al crear workflow: ' . $result['error']
                    ], 500);
                }
                
                $webhookPath = $result['webhook_path'];
                $workflowId = $result['workflow_id'];
            }

            // Build webhook URL using N8nService
            $webhookUrl = $this->n8nService->getWebhookUrl($webhookPath);

            $validated = $request->validate([
                'category' => 'required|string',
                'filename' => 'required|string',
                'file' => 'required|string', // base64 content
            ]);

            Log::info("Processing RAG request for {$validated['filename']}", [
                'company_slug' => $companySlug,
                'workflow_id' => $workflowId,
                'webhook_url' => $webhookUrl,
            ]);

            // EXTRACT TEXT IN LARAVEL - supports visual PDFs with GPT-4 Vision
            $extractedText = $this->extractTextFromDocument(
                $validated['file'], 
                $validated['filename'],
                $openaiApiKey
            );
            Log::info('proxyToN8n: extracted ' . strlen($extractedText ?? '') . ' chars from ' . $validated['filename']);

            if (!$extractedText || strlen($extractedText) < 50) {
                return response()->json([
                    'success' => false,
                    'error' => 'No se pudo extraer texto del documento. Puede estar vacío o ser solo imágenes sin texto legible.'
                ], 400);
            }

            Log::info('RAG: Text extracted', ['characters' => strlen($extractedText), 'filename' => $validated['filename']]);

            // Prepare payload for n8n
            $payload = [
                'company_slug' => $companySlug,
                'category' => $validated['category'],
                'filename' => $validated['filename'],
                'text' => $extractedText, // Send text, not file
                'openai_api_key' => $openaiApiKey,
                'qdrant_host' => $qdrantHost,
                'qdrant_api_key' => $qdrantApiKey,
            ];

            Log::info("RAG: Sending to n8n webhook", [
                'webhook_url' => $webhookUrl,
                'text_length' => strlen($extractedText),
                'filename' => $validated['filename'],
            ]);

            // Send extracted text to n8n (synchronous - Octane allows 120s)
            $response = Http::timeout(90)->post($webhookUrl, $payload);

            if ($response->successful()) {
                Log::info("RAG: n8n responded successfully for {$validated['filename']}");
                return response()->json([
                    'success' => true,
                    'message' => 'Document sent to n8n for AI processing',
                    'n8n_response' => $response->json()
                ]);
            } else {
                Log::error("RAG: n8n webhook failed for {$validated['filename']}", [
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 500),
                ]);
                return response()->json([
                    'success' => false,
                    'error' => 'n8n webhook failed: ' . $response->status(),
                    'details' => substr($response->body(), 0, 200)
                ], 500);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Throwable $e) {
            Log::error('proxyToN8n ERROR: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => substr($e->getTraceAsString(), 0, 2000),
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Error processing document: ' . $e->getMessage()
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
                // Method 1: Try pdftotext (poppler-utils) - BEST quality
                $tempPdfPath = tempnam(sys_get_temp_dir(), 'pdf_');
                file_put_contents($tempPdfPath, $fileContent);
                
                $pdftotext = shell_exec("which pdftotext 2>/dev/null");
                
                if ($pdftotext && trim($pdftotext)) {
                    // pdftotext is available - use it (MUCH better extraction)
                    $tempTxtPath = $tempPdfPath . '.txt';
                    
                    // -layout preserves layout, -enc UTF-8 ensures proper encoding
                    $cmd = "pdftotext -layout -enc UTF-8 " . escapeshellarg($tempPdfPath) . " " . escapeshellarg($tempTxtPath) . " 2>&1";
                    exec($cmd, $output, $returnCode);
                    
                    if ($returnCode === 0 && file_exists($tempTxtPath)) {
                        $extractedText = file_get_contents($tempTxtPath);
                        unlink($tempTxtPath);
                    }
                    
                    unlink($tempPdfPath);
                }
                
                // Method 2: Fallback to pdfparser if pdftotext failed or not available
                if (strlen($extractedText) < 100) {
                    $parser = new \Smalot\PdfParser\Parser();
                    $pdf = $parser->parseContent($fileContent);
                    
                    // Extract text from ALL pages individually
                    $pages = $pdf->getPages();
                    $allText = [];
                    
                    foreach ($pages as $pageNum => $page) {
                        try {
                            $pageText = $page->getText();
                            if (!empty(trim($pageText))) {
                                $allText[] = $pageText;
                            }
                        } catch (\Exception $e) {
                            Log::warning("Error extracting page " . ($pageNum + 1) . ": " . $e->getMessage());
                        }
                    }
                    
                    $extractedText = implode("\n\n", $allText);
                    
                    // If page-by-page extraction failed, try the whole document
                    if (strlen($extractedText) < 100) {
                        $extractedText = $pdf->getText();
                    }
                }
                
                // Fix UTF-8 encoding issues
                if (!mb_check_encoding($extractedText, 'UTF-8')) {
                    // Try to detect and convert encoding
                    $detectedEncoding = mb_detect_encoding($extractedText, ['UTF-8', 'ISO-8859-1', 'Windows-1252', 'ASCII'], true);
                    if ($detectedEncoding && $detectedEncoding !== 'UTF-8') {
                        $extractedText = mb_convert_encoding($extractedText, 'UTF-8', $detectedEncoding);
                    }
                }
                
                // Fix mojibake (UTF-8 double-encoded text)
                $extractedText = $this->fixUtf8Mojibake($extractedText);
                
                // Clean the text
                $extractedText = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $extractedText);
                $extractedText = preg_replace('/\s+/', ' ', $extractedText);
                $extractedText = trim($extractedText);
                
                // If text is too short, it's likely a visual/scanned PDF - use GPT-4 Vision
                if (strlen($extractedText) < 500) {
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
        // Method 1: Direct string replacement for visible mojibake patterns
        // When pdftotext outputs "Ã³" as actual characters (not bytes), we need string replacement
        $visibleMojibake = [
            // These are the VISIBLE mojibake patterns (as strings, not bytes)
            "\xC3\x83\xC2\xB3" => "\xC3\xB3",  // Ã³ -> ó (4-byte to 2-byte)
            "\xC3\x83\xC2\xA1" => "\xC3\xA1",  // Ã¡ -> á
            "\xC3\x83\xC2\xA9" => "\xC3\xA9",  // Ã© -> é  
            "\xC3\x83\xC2\xAD" => "\xC3\xAD",  // Ã­ -> í
            "\xC3\x83\xC2\xBA" => "\xC3\xBA",  // Ãº -> ú
            "\xC3\x83\xC2\xB1" => "\xC3\xB1",  // Ã± -> ñ
            "\xC3\x83\xC2\xBC" => "\xC3\xBC",  // Ã¼ -> ü
            "\xC3\x83\xC2\x81" => "\xC3\x81",  // Ã -> Á
            "\xC3\x83\xC2\x89" => "\xC3\x89",  // Ã‰ -> É
            "\xC3\x83\xC2\x8D" => "\xC3\x8D",  // Ã -> Í
            "\xC3\x83\xC2\x93" => "\xC3\x93",  // Ã" -> Ó
            "\xC3\x83\xC2\x9A" => "\xC3\x9A",  // Ãš -> Ú
            "\xC3\x83\xC2\x91" => "\xC3\x91",  // Ã' -> Ñ
            "\xC3\x83\xC2\x9C" => "\xC3\x9C",  // Ãœ -> Ü
        ];
        
        $text = str_replace(array_keys($visibleMojibake), array_values($visibleMojibake), $text);
        
        // Method 2: THE KEY FIX - UTF-8 interpreted as Latin-1 then re-encoded to UTF-8
        // This is the most common PDF mojibake pattern
        // The text was UTF-8, but pdftotext read it as Latin-1, then output as UTF-8
        // So we need: UTF-8 -> Latin-1 (decode) -> UTF-8 (what we want)
        $fixed = @mb_convert_encoding($text, 'Windows-1252', 'UTF-8');
        if ($fixed !== false && $fixed !== $text) {
            // Check if conversion produced valid Spanish characters
            $hasSpanishAfter = preg_match('/[áéíóúñüÁÉÍÓÚÑÜ¿¡]/u', $fixed);
            $hadMojibeforeFix = preg_match('/[\xC3][\x80-\xBF][\xC2][\x80-\xBF]/', $text);
            
            if ($hasSpanishAfter || $hadMojibeforeFix) {
                $text = $fixed;
            }
        }
        
        // Method 3: Try utf8_decode for double-encoded UTF-8
        if (preg_match('/\xC3\x83/', $text)) {
            $decoded = @utf8_decode($text);
            if ($decoded && mb_check_encoding($decoded, 'UTF-8')) {
                $text = $decoded;
            }
        }
        
        // Method 4: Clean invalid UTF-8 sequences
        if (!mb_check_encoding($text, 'UTF-8')) {
            $text = @iconv('UTF-8', 'UTF-8//IGNORE', $text) ?: $text;
        }
        
        // Remove control characters but keep printable chars and newlines
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text);
        
        // Final validation for json_encode
        if (@json_encode(['test' => $text]) === false) {
            Log::warning("JSON encode still failing, applying aggressive cleanup");
            $text = @iconv('UTF-8', 'UTF-8//IGNORE', $text) ?: $text;
        }
        
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
        $response = Http::timeout(config('services.timeouts.openai', 180))
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
            return trim($text);
        } else {
            Log::error("GPT-4 Vision API error: " . $response->body());
            throw new \Exception("Error calling GPT-4 Vision: " . $response->status());
        }
    }

    /**
     * Create a company-specific RAG workflow in n8n
     */
    private function createCompanyWorkflow($company, $companySlug, $companyName)
    {
        try {
            // Generate webhook path for this company (simple, predictable pattern)
            $webhookPath = "rag-{$companySlug}";
            $workflowName = "RAG Documents - {$companySlug}";

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
                        'id' => 'webhook-text',
                        'name' => 'Webhook Receive Text',
                        'webhookId' => "rag-{$companySlug}"
                    ],
                    [
                        'parameters' => [
                            'respondWith' => 'json',
                            'responseBody' => '={"success": true, "message": "Processing started", "filename": "{{ $json.body.filename || $json.filename }}"}'
                        ],
                        'type' => 'n8n-nodes-base.respondToWebhook',
                        'typeVersion' => 1.1,
                        'position' => [220, 160],
                        'id' => 'respond-webhook',
                        'name' => 'Respond Immediately'
                    ],
                    [
                        'parameters' => [
                            'jsCode' => $this->getProcessInputCode()
                        ],
                        'type' => 'n8n-nodes-base.code',
                        'typeVersion' => 2,
                        'position' => [220, 300],
                        'id' => 'prepare-data',
                        'name' => 'Prepare Data'
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
                                    ['name' => 'Authorization', 'value' => '=Bearer {{ $json.openai_api_key || $env.OPENAI_API_KEY }}'],
                                    ['name' => 'Content-Type', 'value' => 'application/json']
                                ]
                            ],
                            'sendBody' => true,
                            'specifyBody' => 'json',
                            'jsonBody' => "={\n  \"model\": \"text-embedding-3-small\",\n  \"input\": {{ JSON.stringify(\$json.text) }}\n}",
                            'options' => new \stdClass()
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
                            'url' => '={{ $json.qdrant_host }}/collections/{{ $json.collection_name }}/points',
                            'sendHeaders' => true,
                            'headerParameters' => [
                                'parameters' => [
                                    ['name' => 'Content-Type', 'value' => 'application/json'],
                                    ['name' => 'api-key', 'value' => '={{ $json.qdrant_api_key }}']
                                ]
                            ],
                            'sendBody' => true,
                            'specifyBody' => 'json',
                            'jsonBody' => "={\n  \"points\": [{\n    \"id\": {{ JSON.stringify(\$json.id) }},\n    \"vector\": {{ JSON.stringify(\$json.vector) }},\n    \"payload\": {{ JSON.stringify(\$json.payload) }}\n  }]\n}",
                            'options' => new \stdClass()
                        ],
                        'type' => 'n8n-nodes-base.httpRequest',
                        'typeVersion' => 4.2,
                        'position' => [1100, 300],
                        'id' => 'store-qdrant',
                        'name' => 'Store in Qdrant'
                    ],
                    [
                        'parameters' => [
                            'method' => 'POST',
                            'url' => rtrim(config('app.url', ''), '/') . '/api/knowledge/chunk-stored',
                            'sendHeaders' => true,
                            'headerParameters' => [
                                'parameters' => [
                                    ['name' => 'Content-Type', 'value' => 'application/json'],
                                    ['name' => 'X-N8N-Secret', 'value' => config('n8n.webhook_secret', '')]
                                ]
                            ],
                            'sendBody' => true,
                            'specifyBody' => 'json',
                            'jsonBody' => "={\n  \"company_slug\": {{ JSON.stringify(\$('Prepare for Qdrant').item.json.company_slug) }},\n  \"filename\": {{ JSON.stringify(\$('Prepare for Qdrant').item.json.filename) }},\n  \"chunk_id\": {{ JSON.stringify(\$('Prepare for Qdrant').item.json.id) }},\n  \"chunk_index\": {{ \$('Prepare for Qdrant').item.json.chunk_index }},\n  \"total_chunks\": {{ \$('Prepare for Qdrant').item.json.total_chunks }}\n}",
                            'options' => new \stdClass()
                        ],
                        'type' => 'n8n-nodes-base.httpRequest',
                        'typeVersion' => 4.2,
                        'position' => [1320, 300],
                        'id' => 'notify-laravel',
                        'name' => 'Notify Laravel'
                    ]
                ],
                'connections' => [
                    'Webhook Receive Text' => ['main' => [[
                        ['node' => 'Respond Immediately', 'type' => 'main', 'index' => 0],
                        ['node' => 'Prepare Data', 'type' => 'main', 'index' => 0]
                    ]]],
                    'Prepare Data' => ['main' => [[['node' => 'Split into Chunks', 'type' => 'main', 'index' => 0]]]],
                    'Split into Chunks' => ['main' => [[['node' => 'Generate Embeddings', 'type' => 'main', 'index' => 0]]]],
                    'Generate Embeddings' => ['main' => [[['node' => 'Prepare for Qdrant', 'type' => 'main', 'index' => 0]]]],
                    'Prepare for Qdrant' => ['main' => [[['node' => 'Store in Qdrant', 'type' => 'main', 'index' => 0]]]],
                    'Store in Qdrant' => ['main' => [[['node' => 'Notify Laravel', 'type' => 'main', 'index' => 0]]]]
                ],
                'settings' => ['executionOrder' => 'v1']
            ];

            // Create workflow in n8n using N8nService
            $createResult = $this->n8nService->createWorkflow($workflow);

            if (!$createResult['success']) {
                Log::error("Failed to create n8n workflow", ['error' => $createResult['error'] ?? 'Unknown']);
                return ['success' => false, 'error' => 'Failed to create workflow in n8n'];
            }

            $workflowId = $createResult['data']['id'];

            // Activate the workflow using N8nService
            $activateResult = $this->n8nService->activateWorkflow($workflowId);

            if (!$activateResult['success']) {
                Log::error("❌ Failed to activate workflow", ['error' => $activateResult['error'] ?? 'Unknown']);
            }

            // Save workflow info to company settings
            $settings = $company->settings ?? [];
            $settings['rag_workflow_id'] = $workflowId;
            $settings['rag_webhook_path'] = $webhookPath;
            $settings['rag_workflow_name'] = $workflowName;
            $company->settings = $settings;
            $company->save();

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
// Extract data from body - Laravel sends text already extracted
const body = $input.first().json.body || $input.first().json;

const companySlug = body.company_slug || 'default';
const filename = body.filename || 'document.pdf';
const category = body.category || 'general';
const text = body.text || '';
const openaiApiKey = body.openai_api_key || '';
const qdrantHost = body.qdrant_host || process.env.QDRANT_URL || '';

// Validate text
if (!text || text.length < 50) {
  throw new Error('No text provided or text too short');
}

// Create collection name
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
    qdrant_host: qdrantHost,
    qdrant_api_key: body.qdrant_api_key || ''
  }
};
JS;
    }

    private function getChunkTextCode()
    {
        return <<<'JS'
// Split text into chunks - LIMITED to ~6000 TOKENS (approx 24000 chars)
const input = $input.first().json;
const text = input.text || '';
const companySlug = input.company_slug;
const filename = input.filename;
const category = input.category;
const collectionName = input.collection_name;
const openaiApiKey = input.openai_api_key;
const qdrantHost = input.qdrant_host;

// ~4 chars = 1 token approx. Limit 6000 tokens = 24000 chars
// Use 20000 for safety margin
const maxCharsPerChunk = 20000;
const chunkOverlap = 500;
const chunks = [];

// If text is short, don't split
if (text.length <= maxCharsPerChunk) {
  chunks.push(text);
} else {
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxCharsPerChunk) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      
      if (para.length > maxCharsPerChunk) {
        const sentences = para.split(/(?<=[.!?])\s+/);
        currentChunk = '';
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxCharsPerChunk) {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            if (sentence.length > maxCharsPerChunk) {
              for (let i = 0; i < sentence.length; i += maxCharsPerChunk - chunkOverlap) {
                chunks.push(sentence.substring(i, i + maxCharsPerChunk));
              }
              currentChunk = '';
            } else {
              currentChunk = sentence;
            }
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        }
      } else {
        currentChunk = para;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
}

// Return chunks as separate items
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
    qdrant_host: qdrantHost,
    qdrant_api_key: input.qdrant_api_key || ''
  }
}));
JS;
    }

    private function getPrepareQdrantCode()
    {
        return <<<'JS'
// Process ALL items and prepare data for Qdrant AND Laravel notification
const results = [];
const items = $input.all();

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const embedding = item.json.data[0].embedding;
  const prevData = $('Split into Chunks').all()[i].json;

  // Generate UUID v4 for Qdrant (required format)
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  results.push({
    json: {
      id: uuid,
      vector: embedding,
      payload: {
        text: prevData.text,
        filename: prevData.filename,
        category: prevData.category,
        company_slug: prevData.company_slug,
        chunk_index: prevData.chunk_index,
        total_chunks: prevData.total_chunks
      },
      collection_name: prevData.collection_name,
      qdrant_host: prevData.qdrant_host,
      qdrant_api_key: prevData.qdrant_api_key || '',
      // Add these for easy access in Notify Laravel
      company_slug: prevData.company_slug,
      filename: prevData.filename,
      chunk_index: prevData.chunk_index,
      total_chunks: prevData.total_chunks
    }
  });
}

return results;
JS;
    }

    /**
     * Reset the RAG workflow for the company (deletes and recreates)
     */
    public function resetWorkflow(Request $request): JsonResponse
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

            // Try to delete the old workflow if it exists using N8nService
            $oldWorkflowId = $company->settings['rag_workflow_id'] ?? null;
            if ($oldWorkflowId) {
                $deleteResult = $this->n8nService->deleteWorkflow($oldWorkflowId);
                if (!$deleteResult['success']) {
                    Log::warning("Could not delete old workflow: " . ($deleteResult['error'] ?? 'Unknown'));
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
            
            $result = $this->createCompanyWorkflow($company, $companySlug, $companyName);

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
