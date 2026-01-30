<?php

namespace App\Console\Commands;

use App\Jobs\CreateQdrantCollectionJob;
use App\Models\Company;
use App\Services\QdrantService;
use Illuminate\Console\Command;

/**
 * Comando para recrear la colección de Qdrant de una empresa
 * Útil cuando la colección fue eliminada accidentalmente
 */
class RecreateQdrantCollection extends Command
{
    protected $signature = 'qdrant:recreate 
                            {company_slug : El slug de la empresa (ej: withmia-evp7rj)}
                            {--force : Forzar recreación aunque ya exista la colección}';

    protected $description = 'Recrear la colección de Qdrant de una empresa e insertar la información de la empresa';

    public function handle(QdrantService $qdrantService): int
    {
        $companySlug = $this->argument('company_slug');
        $force = $this->option('force');

        $this->info("🔍 Buscando empresa con slug: {$companySlug}");

        // Buscar la empresa por el slug directamente
        $company = Company::where('slug', $companySlug)->first();

        if (!$company) {
            // Intentar buscar por el company_slug del usuario admin
            $user = \App\Models\User::where('company_slug', $companySlug)
                ->where('role', 'admin')
                ->first();
            
            if ($user) {
                $company = $user->company;
            }
        }

        if (!$company) {
            // Intentar buscar directamente por settings
            $company = Company::where('settings->company_slug', $companySlug)->first();
        }

        if (!$company) {
            $this->error("❌ No se encontró empresa con slug: {$companySlug}");
            $this->line("");
            $this->line("Empresas disponibles:");
            Company::all()->each(function ($c) {
                $this->line("  - ID: {$c->id}, Nombre: {$c->name}, Slug: {$c->slug}");
            });
            return Command::FAILURE;
        }

        $this->info("✅ Empresa encontrada: {$company->name} (ID: {$company->id})");

        // Verificar si ya existe la colección
        $existingCollection = $company->settings['qdrant_collection'] ?? null;
        
        if ($existingCollection && !$force) {
            $this->warn("⚠️  La empresa ya tiene configurada una colección: {$existingCollection}");
            
            if (!$this->confirm('¿Deseas recrear la colección de todos modos?')) {
                return Command::SUCCESS;
            }
        }

        // Limpiar el setting actual para que el Job cree una nueva
        if ($force || $this->confirm('¿Limpiar el setting qdrant_collection para forzar recreación?', true)) {
            $settings = $company->settings ?? [];
            unset($settings['qdrant_collection']);
            $company->update(['settings' => $settings]);
            $this->info("🧹 Setting qdrant_collection limpiado");
        }

        $this->info("📦 Creando colección de Qdrant...");

        try {
            // Crear colección
            $result = $qdrantService->createCompanyCollection($companySlug);

            if (!$result['success']) {
                $this->error("❌ Error creando colección: " . ($result['error'] ?? 'Desconocido'));
                return Command::FAILURE;
            }

            $collectionName = $result['collection'];
            $this->info("✅ Colección creada: {$collectionName}");

            // Guardar en settings
            $company->update([
                'settings' => array_merge($company->settings ?? [], [
                    'qdrant_collection' => $collectionName
                ])
            ]);
            $this->info("💾 Colección guardada en settings de la empresa");

            // Insertar información de la empresa
            $this->info("📝 Insertando información de la empresa...");
            
            $companyInfoParts = [];
            
            if (!empty($company->name)) {
                $companyInfoParts[] = "Nombre de la Empresa: {$company->name}";
            }
            
            if (!empty($company->description)) {
                $companyInfoParts[] = "Descripción de la Empresa: {$company->description}";
            }
            
            if (!empty($company->website)) {
                $companyInfoParts[] = "Sitio Web: {$company->website}";
            }
            
            if (!empty($company->assistant_name)) {
                $companyInfoParts[] = "Nombre del Asistente: {$company->assistant_name}";
            }

            if (empty($companyInfoParts)) {
                $this->warn("⚠️  No hay información de la empresa para insertar");
                return Command::SUCCESS;
            }

            $companyInfoText = implode("\n\n", $companyInfoParts);
            $this->line("Información a insertar:");
            $this->line($companyInfoText);
            $this->line("");

            $insertResult = $qdrantService->upsertPoints($collectionName, [
                [
                    'id' => $company->id,
                    'vector' => $qdrantService->generateEmbedding($companyInfoText),
                    'payload' => [
                        'text' => $companyInfoText,
                        'source' => 'company_onboarding',
                        'type' => 'company_information',
                        'company_id' => $company->id,
                        'recreated_at' => now()->toIso8601String(),
                    ]
                ]
            ]);

            if ($insertResult['success']) {
                $this->info("✅ Información de la empresa insertada correctamente");
            } else {
                $this->error("❌ Error insertando información: " . ($insertResult['error'] ?? 'Desconocido'));
                return Command::FAILURE;
            }

            $this->newLine();
            $this->info("🎉 ¡Colección de Qdrant recreada exitosamente!");
            $this->table(
                ['Campo', 'Valor'],
                [
                    ['Empresa', $company->name],
                    ['Colección', $collectionName],
                    ['Company ID', $company->id],
                ]
            );

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("❌ Excepción: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
