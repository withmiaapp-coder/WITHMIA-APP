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
        // Priorizar URL pública para evitar problemas de DNS interno
        // El orden es: QDRANT_URL (pública) > QDRANT_HOST > fallback interno
        $url = env('RAILWAY_SERVICE_QDRANT_URL');
        
        if ($url) {
            // Asegurar que tenga protocolo https
            $this->baseUrl = 'https://' . ltrim($url, 'https://');
        } else {
            $this->baseUrl = env('QDRANT_HOST', 'http://qdrant.railway.internal:6333');
        }
        
        $this->apiKey = env('QDRANT_API_KEY');
        
        Log::info("QdrantService initialized", ['baseUrl' => $this->baseUrl]);
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
                Log::info("Qdrant: Colección ya existe", ['collection' => $collectionName]);
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
                Log::info("Qdrant: Colección creada exitosamente", [
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

        } catch (\Exception $e) {
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
        } catch (\Exception $e) {
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
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Eliminar una colección
     */
    public function deleteCollection(string $collectionName): array
    {
        try {
            $response = $this->request('DELETE', "/collections/{$collectionName}");
            
            Log::info("Qdrant: Colección eliminada", ['collection' => $collectionName]);
            
            return [
                'success' => $response['success'],
                'message' => $response['success'] ? 'Collection deleted' : ($response['error'] ?? 'Error')
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Obtener información de una colección
     */
    public function getCollectionInfo(string $collectionName): array
    {
        try {
            $response = $this->request('GET', "/collections/{$collectionName}");
            
            if ($response['success']) {
                return [
                    'success' => true,
                    'data' => $response['data']['result'] ?? []
                ];
            }

            return ['success' => false, 'error' => $response['error'] ?? 'Collection not found'];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
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
                Log::info("Qdrant: Points upserted successfully", [
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

        } catch (\Exception $e) {
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
            $openaiKey = env('OPENAI_API_KEY');
            
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

        } catch (\Exception $e) {
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

        } catch (\Exception $e) {
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
