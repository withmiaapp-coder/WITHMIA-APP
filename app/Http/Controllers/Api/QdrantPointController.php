<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Services\QdrantService;
use App\Traits\HasCompanyAccess;

class QdrantPointController extends Controller
{
    use HasCompanyAccess;

    private QdrantService $qdrantService;

    public function __construct(QdrantService $qdrantService)
    {
        $this->qdrantService = $qdrantService;
    }

    public function getQdrantPoints(Request $request)
    {
        try {
            $company = $this->getAuthenticatedCompany();

            $collectionName = $this->qdrantService->getCollectionName($company->slug);
            
            // Auto-crear colección si no existe
            if (!$this->qdrantService->collectionExists($collectionName)) {
                Log::info("Qdrant: Auto-creating collection for {$company->slug}");
                $createResult = $this->qdrantService->createCompanyCollection($company->slug);
                if ($createResult['success']) {
                    // Guardar en settings de la empresa
                    $company->update([
                        'settings' => array_merge($company->settings ?? [], [
                            'qdrant_collection' => $collectionName
                        ])
                    ]);
                } else {
                    Log::error("Qdrant: Failed to auto-create collection", ['error' => $createResult['error'] ?? 'unknown']);
                }
            }
            
            $limit = $request->get('limit', 50);
            $offset = $request->get('offset');
            
            $result = $this->qdrantService->getPoints($collectionName, $limit, $offset);
            
            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'Error fetching points',
                    'points' => []
                ]);
            }

            return response()->json([
                'success' => true,
                'points' => $result['points'],
                'next_offset' => $result['next_offset'],
                'collection' => $collectionName
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting Qdrant points: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener puntos',
                'points' => []
            ]);
        }
    }

    /**
     * Get a single Qdrant point
     */
    public function getQdrantPoint($pointId)
    {
        try {
            $company = $this->getAuthenticatedCompany();

            $collectionName = $this->qdrantService->getCollectionName($company->slug);
            
            $result = $this->qdrantService->getPoint($collectionName, $pointId);
            
            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'Point not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'point' => $result['point']
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting Qdrant point: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener punto'
            ], 500);
        }
    }

    /**
     * Update a Qdrant point's payload
     */
    public function updateQdrantPoint(Request $request, $pointId)
    {
        try {
            $company = $this->getAuthenticatedCompany();

            $collectionName = $this->qdrantService->getCollectionName($company->slug);
            
            // Convert to proper type: integer if numeric, otherwise keep as string (UUID)
            if (is_numeric($pointId)) {
                $pointId = (int) $pointId;
            }
            
            $payload = $request->get('payload', []);
            
            $result = $this->qdrantService->updatePointPayload($collectionName, $pointId, $payload);
            
            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'Error updating point'
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Point updated successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Error updating Qdrant point: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al actualizar punto'
            ], 500);
        }
    }

    /**
     * Delete a single Qdrant point
     */
    public function deleteQdrantPoint($pointId)
    {
        try {
            $company = $this->getAuthenticatedCompany();

            $collectionName = $this->qdrantService->getCollectionName($company->slug);
            
            // Convert to proper type: integer if numeric, otherwise keep as string (UUID)
            if (is_numeric($pointId)) {
                $pointId = (int) $pointId;
            }
            
            $result = $this->qdrantService->deletePoints($collectionName, [$pointId]);
            
            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'Error deleting point'
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Point deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting Qdrant point: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al eliminar punto'
            ], 500);
        }
    }

    /**
     * Delete multiple Qdrant points
     */
    public function deleteQdrantPoints(Request $request)
    {
        try {
            $company = $this->getAuthenticatedCompany();

            $pointIds = $request->get('point_ids', []);
            
            if (empty($pointIds)) {
                return response()->json([
                    'success' => false,
                    'error' => 'No point IDs provided'
                ], 400);
            }

            $collectionName = $this->qdrantService->getCollectionName($company->slug);
            
            $result = $this->qdrantService->deletePoints($collectionName, $pointIds);
            
            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'Error deleting points'
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => count($pointIds) . ' points deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting Qdrant points: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al eliminar puntos'
            ], 500);
        }
    }
}
