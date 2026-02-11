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
        
        Log::debug("QdrantService initialized", ['baseUrl' => $this->baseUrl]);
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
                Log::debug("Qdrant: Colección ya existe", ['collection' => $collectionName]);
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
                Log::debug("Qdrant: Colección creada exitosamente", [
                    'collection' => $collectionName,
                    'company_slug' => $companySlug
                ]);
                
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
            
            Log::debug("Qdrant: Colección eliminada", ['collection' => $collectionName]);
            
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
                Log::debug("Qdrant: Points deleted", [
                    'collection' => $collectionName,
                    'count' => count($pointIds)
                ]);
                
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
     * Insertar/actualizar puntos en una colección
     */
    public function upsertPoints(string $collectionName, array $points): array
    {
        try {
            $response = $this->request('PUT', "/collections/{$collectionName}/points", [
                'points' => $points
            ]);

            if ($response['success']) {
                Log::debug("Qdrant: Points upserted successfully", [
                    'collection' => $collectionName,
                    'count' => count($points)
                ]);
                
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
