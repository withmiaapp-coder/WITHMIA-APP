<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Services\QdrantService;
use Illuminate\Console\Command;

class RefreshCompanyKnowledge extends Command
{
    protected $signature = 'qdrant:refresh-company-knowledge {--company= : Specific company ID to refresh} {--all : Refresh all companies}';
    protected $description = 'Re-insert company onboarding info as granular chunks in Qdrant';

    public function handle(QdrantService $qdrantService): int
    {
        $companyId = $this->option('company');
        $all = $this->option('all');

        if (!$companyId && !$all) {
            $this->error('Specify --company=ID or --all');
            return 1;
        }

        $query = Company::query();
        if ($companyId) {
            $query->where('id', $companyId);
        }

        $companies = $query->get();
        $success = 0;
        $failed = 0;

        foreach ($companies as $company) {
            $collectionName = $company->settings['qdrant_collection'] ?? null;

            if (!$collectionName) {
                $this->warn("⏭ Company #{$company->id} ({$company->name}): no Qdrant collection — skipped");
                continue;
            }

            $this->info("🔄 Refreshing: {$company->name} (ID={$company->id}) → {$collectionName}");

            $result = $qdrantService->upsertCompanyKnowledge($collectionName, $company);

            if ($result['success']) {
                $this->info("  ✅ Created {$result['points_created']} granular chunks");
                $success++;
            } else {
                $this->error("  ❌ Failed: " . ($result['error'] ?? 'Unknown'));
                $failed++;
            }
        }

        // Clean up any old UUID-based granular_knowledge points (from hardcoded fix)
        if ($companyId) {
            $company = $companies->first();
            if ($company) {
                $collectionName = $company->settings['qdrant_collection'] ?? null;
                if ($collectionName) {
                    $this->info("🧹 Cleaning up old UUID granular_knowledge points...");
                    try {
                        // Delete by filter: source = granular_knowledge
                        $qdrantUrl = config('qdrant.url') ?: config('services.qdrant.url');
                        $qdrantKey = config('qdrant.api_key') ?: config('services.qdrant.api_key');

                        $response = \Illuminate\Support\Facades\Http::withHeaders([
                            'api-key' => $qdrantKey,
                            'Content-Type' => 'application/json',
                        ])->post("{$qdrantUrl}/collections/{$collectionName}/points/delete", [
                            'filter' => [
                                'must' => [
                                    ['key' => 'source', 'match' => ['value' => 'granular_knowledge']],
                                ],
                            ],
                        ]);

                        if ($response->successful()) {
                            $this->info("  ✅ Old granular_knowledge points cleaned up");
                        } else {
                            $this->warn("  ⚠ Could not clean up old points: " . $response->body());
                        }
                    } catch (\Exception $e) {
                        $this->warn("  ⚠ Cleanup error: " . $e->getMessage());
                    }
                }
            }
        }

        $this->newLine();
        $this->info("Done! Success: {$success}, Failed: {$failed}");

        return $failed > 0 ? 1 : 0;
    }
}
