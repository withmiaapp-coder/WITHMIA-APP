<?php

namespace App\Console\Commands;

use App\Jobs\CreateQdrantCollectionJob;
use App\Models\Company;
use Illuminate\Console\Command;

/**
 * Comando para recrear la colección de Qdrant de una empresa
 * Útil cuando la colección fue eliminada accidentalmente
 * 
 * Usa el mismo Job que el onboarding: CreateQdrantCollectionJob
 */
class RecreateQdrantCollection extends Command
{
    protected $signature = 'qdrant:recreate 
                            {company_slug : El slug de la empresa (ej: withmia-evp7rj)}
                            {--force : Forzar recreación aunque ya exista la colección}';

    protected $description = 'Recrear la colección de Qdrant de una empresa usando el mismo proceso del onboarding';

    public function handle(): int
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
            $this->error("❌ No se encontró empresa con slug: {$companySlug}");
            $this->line("");
            $this->line("Empresas disponibles:");
            Company::all()->each(function ($c) {
                $this->line("  - ID: {$c->id}, Nombre: {$c->name}, Slug: {$c->slug}");
            });
            return Command::FAILURE;
        }

        $this->info("✅ Empresa encontrada: {$company->name} (ID: {$company->id})");
        $this->line("   Slug: {$company->slug}");
        $this->line("   Descripción: " . ($company->description ?? 'N/A'));
        $this->line("   Asistente: " . ($company->assistant_name ?? 'N/A'));

        // Verificar si ya existe la colección
        $existingCollection = $company->settings['qdrant_collection'] ?? null;
        
        if ($existingCollection && !$force) {
            $this->warn("⚠️  La empresa ya tiene configurada una colección: {$existingCollection}");
            
            if (!$this->confirm('¿Deseas recrear la colección de todos modos?')) {
                return Command::SUCCESS;
            }
        }

        // Limpiar el setting actual para que el Job cree una nueva
        $settings = $company->settings ?? [];
        unset($settings['qdrant_collection']);
        $company->update(['settings' => $settings]);
        $this->info("🧹 Setting qdrant_collection limpiado");

        $this->info("📦 Ejecutando CreateQdrantCollectionJob (mismo proceso del onboarding)...");

        try {
            // Usar el mismo Job que usa el onboarding
            // dispatchSync para ejecutar de forma síncrona y ver el resultado
            CreateQdrantCollectionJob::dispatchSync($company->id, $company->slug);

            // Refrescar la empresa para ver los cambios
            $company->refresh();
            
            $newCollection = $company->settings['qdrant_collection'] ?? null;
            
            if ($newCollection) {
                $this->newLine();
                $this->info("🎉 ¡Colección de Qdrant recreada exitosamente!");
                $this->table(
                    ['Campo', 'Valor'],
                    [
                        ['Empresa', $company->name],
                        ['Colección', $newCollection],
                        ['Company ID', $company->id],
                    ]
                );
                return Command::SUCCESS;
            } else {
                $this->error("❌ El Job se ejecutó pero no se guardó la colección");
                $this->line("Revisa los logs para más detalles");
                return Command::FAILURE;
            }

        } catch (\Exception $e) {
            $this->error("❌ Excepción: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
