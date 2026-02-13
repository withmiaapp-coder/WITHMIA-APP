<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class QdrantService
{
    private string $baseUrl;
    private ?string $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('qdrant.url');
        $this->apiKey = config('qdrant.api_key');
    }

    /**
     * Crear una colección única para una empresa
     * 
     * @param string $companySlug Slug único de la empresa
     * @param int $vectorSize Tamaño del vector (1536 para OpenAI text-embedding-3-small)
     * @return array
     */
    public function createCompanyCollection(string $companySlug, int $vectorSize = 1536): array
    {
        $collectionName = $this->getCollectionName($companySlug);
        
        try {
            // Verificar si la colección ya existe
            if ($this->collectionExists($collectionName)) {
                return [
                    'success' => true,
                    'collection' => $collectionName,
                    'message' => 'Collection already exists',
                    'created' => false
                ];
            }

            // Crear la colección
            $response = $this->request('PUT', "/collections/{$collectionName}", [
                'vectors' => [
                    'size' => $vectorSize,
                    'distance' => 'Cosine'
                ],
                'optimizers_config' => [
                    'default_segment_number' => 2
                ],
                'replication_factor' => 1
            ]);

            if ($response['success']) {
                return [
                    'success' => true,
                    'collection' => $collectionName,
                    'message' => 'Collection created successfully',
                    'created' => true
                ];
            }

            return [
                'success' => false,
                'error' => $response['error'] ?? 'Unknown error'
            ];

        } catch (\Throwable $e) {
            Log::error("Qdrant: Error creando colección", [
                'collection' => $collectionName,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Verificar si una colección existe
     */
    public function collectionExists(string $collectionName): bool
    {
        try {
            $response = $this->request('GET', "/collections/{$collectionName}");
            return $response['success'] && isset($response['data']['result']);
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Obtener todas las colecciones
     */
    public function getCollections(): array
    {
        try {
            $response = $this->request('GET', '/collections');
            
            if ($response['success']) {
                return [
                    'success' => true,
                    'collections' => $response['data']['result']['collections'] ?? []
                ];
            }

            return ['success' => false, 'error' => $response['error'] ?? 'Unknown error'];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'Failed to list collections'];
        }
    }

    /**
     * Eliminar una colección
     */
    public function deleteCollection(string $collectionName): array
    {
        try {
            $response = $this->request('DELETE', "/collections/{$collectionName}");
            
            return [
                'success' => $response['success'],
                'message' => $response['success'] ? 'Collection deleted' : ($response['error'] ?? 'Error')
            ];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'Failed to delete collection'];
        }
    }

    /**
     * Obtener puntos de una colección con scroll
     */
    public function getPoints(string $collectionName, int $limit = 100, ?string $offset = null): array
    {
        try {
            $data = [
                'limit' => $limit,
                'with_payload' => true,
                'with_vector' => false
            ];
            
            if ($offset) {
                $data['offset'] = $offset;
            }

            $response = $this->request('POST', "/collections/{$collectionName}/points/scroll", $data);
            
            if ($response['success']) {
                return [
                    'success' => true,
                    'points' => $response['data']['result']['points'] ?? [],
                    'next_offset' => $response['data']['result']['next_page_offset'] ?? null
                ];
            }

            return ['success' => false, 'error' => $response['error'] ?? 'Error fetching points'];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'Failed to get points'];
        }
    }

    /**
     * Obtener un punto específico por ID
     */
    public function getPoint(string $collectionName, string $pointId): array
    {
        try {
            $response = $this->request('POST', "/collections/{$collectionName}/points", [
                'ids' => [$pointId],
                'with_payload' => true,
                'with_vector' => false
            ]);
            
            if ($response['success'] && !empty($response['data']['result'])) {
                return [
                    'success' => true,
                    'point' => $response['data']['result'][0] ?? null
                ];
            }

            return ['success' => false, 'error' => 'Point not found'];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'Failed to get point'];
        }
    }

    /**
     * Actualizar el payload de un punto
     */
    public function updatePointPayload(string $collectionName, int|string $pointId, array $payload): array
    {
        try {
            // Ensure proper type for Qdrant API
            if (is_numeric($pointId)) {
                $pointId = (int) $pointId;
            }
            
            $response = $this->request('POST', "/collections/{$collectionName}/points/payload", [
                'points' => [$pointId],
                'payload' => $payload
            ]);
            
            if ($response['success']) {
                return [
                    'success' => true,
                    'message' => 'Point updated successfully'
                ];
            }

            return ['success' => false, 'error' => $response['error'] ?? 'Error updating point'];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'Failed to update point'];
        }
    }

    /**
     * Eliminar puntos de una colección
     */
    public function deletePoints(string $collectionName, array $pointIds): array
    {
        try {
            $response = $this->request('POST', "/collections/{$collectionName}/points/delete", [
                'points' => $pointIds
            ]);
            
            if ($response['success']) {
                return [
                    'success' => true,
                    'message' => 'Points deleted successfully'
                ];
            }

            return ['success' => false, 'error' => $response['error'] ?? 'Error deleting points'];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'Failed to delete points'];
        }
    }

    /**
     * Obtener el nombre de la colección para una empresa
     */
    public function getCollectionName(string $companySlug): string
    {
        // Normalizar el slug para el nombre de colección
        $normalized = preg_replace('/[^a-z0-9_-]/', '_', strtolower($companySlug));
        return "company_{$normalized}_knowledge";
    }

    /**
     * Semantic search: generate embedding for query and search Qdrant
     */
    public function semanticSearch(string $collectionName, string $query, int $topK = 10, float $scoreThreshold = 0.0): array
    {
        try {
            $vector = $this->generateEmbedding($query);

            $body = [
                'vector' => $vector,
                'limit' => $topK,
                'with_payload' => true,
                'with_vector' => false,
            ];

            if ($scoreThreshold > 0) {
                $body['score_threshold'] = $scoreThreshold;
            }

            $response = $this->request('POST', "/collections/{$collectionName}/points/search", $body);

            if ($response['success']) {
                $results = [];
                foreach ($response['data']['result'] ?? [] as $point) {
                    $results[] = [
                        'text' => $point['payload']['text'] ?? '',
                        'score' => $point['score'] ?? 0,
                        'source' => $point['payload']['source'] ?? '',
                        'id' => $point['id'] ?? null,
                    ];
                }
                return ['success' => true, 'results' => $results];
            }

            return ['success' => false, 'results' => [], 'error' => $response['error'] ?? 'Unknown'];

        } catch (\Throwable $e) {
            Log::error("Qdrant: Error in semantic search", [
                'collection' => $collectionName,
                'query' => $query,
                'error' => $e->getMessage(),
            ]);
            return ['success' => false, 'results' => [], 'error' => $e->getMessage()];
        }
    }

    /**
     * Insertar/actualizar puntos en una colección
     */
    public function upsertPoints(string $collectionName, array $points): array
    {
        try {
            $response = $this->request('PUT', "/collections/{$collectionName}/points", [
                'points' => $points
            ]);

            if ($response['success']) {
                return [
                    'success' => true,
                    'message' => 'Points upserted successfully'
                ];
            }

            return [
                'success' => false,
                'error' => $response['error'] ?? 'Unknown error'
            ];

        } catch (\Throwable $e) {
            Log::error("Qdrant: Error upserting points", [
                'collection' => $collectionName,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Generar embedding usando OpenAI
     */
    public function generateEmbedding(string $text): array
    {
        try {
            $openaiKey = config('services.openai.api_key');
            
            if (!$openaiKey) {
                throw new \Exception('OpenAI API key not configured');
            }

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $openaiKey,
                'Content-Type' => 'application/json'
            ])->timeout(30)->post('https://api.openai.com/v1/embeddings', [
                'input' => $text,
                'model' => 'text-embedding-3-small'
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['data'][0]['embedding'];
            }

            throw new \Exception("OpenAI API error: " . $response->body());

        } catch (\Throwable $e) {
            Log::error("Error generating embedding", ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Upsert company knowledge as GRANULAR chunks for better semantic search.
     *
     * Instead of one monolithic point, creates separate points for:
     * - Identity (assistant name, company name)
     * - Website / contact info
     * - Company description / what the company does
     * - Client type / schedule info
     *
     * This ensures each chunk's embedding closely matches specific user queries.
     * Works for ANY company, not hardcoded.
     *
     * @param string $collectionName Qdrant collection name
     * @param \App\Models\Company $company The company model
     * @param string|null $assistantName Override assistant name (or null to use company->assistant_name)
     * @return array{success: bool, points_created: int, error?: string}
     */
    public function upsertCompanyKnowledge(string $collectionName, $company, ?string $assistantName = null): array
    {
        try {
            $name = $assistantName ?? $company->assistant_name ?? 'MIA';
            $companyName = $company->name ?? 'la empresa';
            $baseId = $company->id * 100; // Reserve a range of IDs per company (100, 101, 102...)

            // Delete the old monolithic point (company->id) if it exists
            try {
                $this->deletePoints($collectionName, [$company->id]);
            } catch (\Throwable $e) {
                // Ignore — might not exist
            }

            // Also delete any previous granular points from this method
            $oldGranularIds = [];
            for ($i = 0; $i < 10; $i++) {
                $oldGranularIds[] = $baseId + $i;
            }
            try {
                $this->deletePoints($collectionName, $oldGranularIds);
            } catch (\Throwable $e) {
                // Ignore
            }

            // Build granular chunks
            $chunks = [];

            // Chunk 1: Identity
            $chunks[] = [
                'id' => $baseId + 1,
                'text' => "El nombre de la empresa es {$companyName}. El asistente virtual se llama {$name} y es el asistente de {$companyName}. Cuando me pregunten cómo me llamo, debo responder que me llamo {$name}.",
            ];

            // Chunk 2: Website
            if (!empty($company->website)) {
                $chunks[] = [
                    'id' => $baseId + 2,
                    'text' => "La página web de {$companyName} es {$company->website} - Este es el sitio web oficial de la empresa donde se puede encontrar información sobre servicios, planes y contacto.",
                ];
            }

            // Chunk 3: Description / What the company does
            if (!empty($company->description)) {
                $chunks[] = [
                    'id' => $baseId + 3,
                    'text' => "{$companyName}: {$company->description}",
                ];
            }

            // Chunk 4: Client type
            if (!empty($company->client_type)) {
                $clientTypeText = $company->client_type === 'interno'
                    ? "Atendemos clientes internos, es decir, miembros del equipo de {$companyName}."
                    : "Atendemos clientes externos, es decir, los clientes finales de {$companyName}.";
                $chunks[] = [
                    'id' => $baseId + 4,
                    'text' => $clientTypeText,
                ];
            }

            // Chunk 5: Full combined info (lower weight but useful for general questions)
            $fullParts = [];
            $fullParts[] = "Información general de {$companyName}:";
            $fullParts[] = "Asistente: {$name}";
            if (!empty($company->website)) $fullParts[] = "Web: {$company->website}";
            if (!empty($company->description)) $fullParts[] = "Descripción: {$company->description}";
            if (!empty($company->client_type)) {
                $fullParts[] = "Tipo de cliente: " . ($company->client_type === 'interno' ? 'Interno' : 'Externo');
            }
            $chunks[] = [
                'id' => $baseId + 5,
                'text' => implode("\n", $fullParts),
            ];

            // Generate embeddings and build points
            $points = [];
            foreach ($chunks as $chunk) {
                $points[] = [
                    'id' => $chunk['id'],
                    'vector' => $this->generateEmbedding($chunk['text']),
                    'payload' => [
                        'text' => $chunk['text'],
                        'source' => 'company_onboarding',
                        'type' => 'company_information',
                        'company_id' => $company->id,
                        'updated_at' => now()->toIso8601String(),
                    ],
                ];
            }

            // Upsert all points
            $result = $this->upsertPoints($collectionName, $points);

            if ($result['success']) {
                Log::info("✅ Company knowledge upserted as " . count($points) . " granular chunks", [
                    'company_id' => $company->id,
                    'collection' => $collectionName,
                    'chunks' => count($points),
                ]);
                return ['success' => true, 'points_created' => count($points)];
            }

            return ['success' => false, 'points_created' => 0, 'error' => $result['error'] ?? 'Unknown'];

        } catch (\Throwable $e) {
            Log::error("❌ Error upserting company knowledge", [
                'company_id' => $company->id ?? null,
                'error' => $e->getMessage(),
            ]);
            return ['success' => false, 'points_created' => 0, 'error' => $e->getMessage()];
        }
    }

    /**
     * Hacer una petición HTTP a Qdrant
     */
    private function request(string $method, string $endpoint, array $data = []): array
    {
        try {
            $headers = [
                'Content-Type' => 'application/json; charset=utf-8',
                'Accept' => 'application/json',
                'Accept-Charset' => 'utf-8'
            ];

            if ($this->apiKey) {
                $headers['api-key'] = $this->apiKey;
            }

            $url = rtrim($this->baseUrl, '/') . $endpoint;

            $http = Http::withHeaders($headers)->timeout(30);

            $response = match (strtoupper($method)) {
                'GET' => $http->get($url),
                'POST' => $http->post($url, $data),
                'PUT' => $http->put($url, $data),
                'DELETE' => $http->delete($url),
                default => throw new \Exception("Unsupported HTTP method: {$method}")
            };

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json()
                ];
            }

            Log::error("Qdrant request failed", [
                'method' => $method,
                'endpoint' => $endpoint,
                'status' => $response->status(),
                'body' => $response->body()
            ]);

            return [
                'success' => false,
                'error' => "HTTP {$response->status()}: " . $response->body()
            ];

        } catch (\Throwable $e) {
            Log::error("Qdrant request exception", [
                'method' => $method,
                'endpoint' => $endpoint,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}
