<?php

namespace App\Jobs;

use App\Models\Company;
use App\Services\QdrantService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Job para crear la colección Qdrant de forma asíncrona
 * Se dispara en el paso 2 del onboarding cuando se crea la empresa
 */
class CreateQdrantCollectionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 30;

    protected int $companyId;
    protected string $companySlug;

    public function __construct(int $companyId, string $companySlug)
    {
        $this->companyId = $companyId;
        $this->companySlug = $companySlug;
        
        // Ejecutar en cola 'sync' para que sea inmediato sin worker
        $this->onConnection('sync');
    }

    public function handle(QdrantService $qdrantService): void
    {
        $company = Company::find($this->companyId);
        
        if (!$company) {
            Log::warning("CreateQdrantCollectionJob: Company not found", ['id' => $this->companyId]);
            return;
        }

        // Si ya tiene colección, no crear otra
        if (!empty($company->settings['qdrant_collection'])) {
            Log::debug("Qdrant collection already exists for: {$this->companySlug}");
            return;
        }

        try {
            Log::debug("📦 Creating Qdrant collection for: {$this->companySlug}");
            
            $result = $qdrantService->createCompanyCollection($this->companySlug);
            
            if ($result['success']) {
                $collectionName = $result['collection'];
                Log::debug("✅ Qdrant collection created: {$collectionName}");
                
                $company->update([
                    'settings' => array_merge($company->settings ?? [], [
                        'qdrant_collection' => $collectionName
                    ])
                ]);

                // Insertar información de la empresa como punto #1
                $this->insertCompanyInfo($qdrantService, $collectionName, $company);
            } else {
                Log::error("❌ Failed to create Qdrant collection: " . ($result['error'] ?? 'Unknown'));
            }
        } catch (\Exception $e) {
            Log::error("❌ Exception creating Qdrant collection: " . $e->getMessage());
        }
    }

    /**
     * Inserta la información de la empresa como punto #1 en Qdrant
     */
    private function insertCompanyInfo(QdrantService $qdrantService, string $collectionName, Company $company): void
    {
        try {
            // Construir el texto con toda la información de la empresa
            $companyInfoParts = [];
            
            // Nombre de la empresa (campo: name)
            if (!empty($company->name)) {
                $companyInfoParts[] = "Nombre de la Empresa: {$company->name}";
            }
            
            // Descripción de la empresa (campo: description)
            if (!empty($company->description)) {
                $companyInfoParts[] = "Descripción de la Empresa: {$company->description}";
            }
            
            // Sitio web
            if (!empty($company->website)) {
                $companyInfoParts[] = "Sitio Web: {$company->website}";
            }
            
            // Nombre del asistente (si existe)
            if (!empty($company->assistant_name)) {
                $companyInfoParts[] = "Nombre del Asistente: {$company->assistant_name}";
            }
            
            if (empty($companyInfoParts)) {
                Log::debug("No company info to insert for: {$this->companySlug}");
                return;
            }

            $companyInfoText = implode("\n\n", $companyInfoParts);
            
            // Insertar en Qdrant (usar entero como ID, Qdrant no acepta strings)
            $pointId = $company->id; // Usar el ID numérico de la company
            
            $insertResult = $qdrantService->upsertPoints($collectionName, [
                [
                    'id' => $pointId,
                    'vector' => $qdrantService->generateEmbedding($companyInfoText),
                    'payload' => [
                        'text' => $companyInfoText,
                        'source' => 'company_onboarding',
                        'type' => 'company_information',
                        'company_id' => $company->id,
                        'created_at' => now()->toIso8601String(),
                    ]
                ]
            ]);

            if ($insertResult['success']) {
                Log::debug("✅ Company information inserted as point #1 in Qdrant for: {$this->companySlug}");
            } else {
                Log::error("❌ Failed to insert company info: " . ($insertResult['error'] ?? 'Unknown'));
            }
        } catch (\Exception $e) {
            Log::error("❌ Exception inserting company info to Qdrant: " . $e->getMessage());
        }
    }
}
