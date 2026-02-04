<?php

namespace App\Traits;

use App\Models\Company;
use App\Models\User;
use App\Jobs\CreateQdrantCollectionJob;
use App\Jobs\CreateN8nWorkflowsJob;
use App\Jobs\PostOnboardingSetupJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Trait para compartir lógica de onboarding entre controllers
 */
trait HandlesOnboarding
{
    /**
     * Procesar la finalización del onboarding
     */
    protected function processOnboardingCompletion(Request $request, User $user): array
    {
        Log::debug("processOnboardingCompletion for user: {$user->id} - {$user->email}");

        $companyName = $request->input('company_name') ?? $user->full_name ?? $user->name ?? 'empresa';
        $uniqueSlug = $this->generateUniqueCompanySlug($companyName);
        
        Log::debug("Generated slug: {$uniqueSlug}");

        $user->update([
            'company_slug' => $uniqueSlug,
            'onboarding_completed' => true,
            'onboarding_completed_at' => now()
        ]);

        $company = $this->getOrCreateCompany($user, $uniqueSlug);
        
        if ($company->slug !== $uniqueSlug) {
            $company->update(['slug' => $uniqueSlug]);
        }

        // 🌍 Asignar timezone automáticamente según el país del teléfono
        $phoneCountry = $request->input('phone_country') ?? '+56';
        $timezone = $this->getTimezoneFromPhoneCountry($phoneCountry);
        $company->update(['timezone' => $timezone]);

        // 📦 Crear colección Qdrant si no existe
        if (empty($company->settings['qdrant_collection'])) {
            try {
                Log::debug("📦 Creating Qdrant collection: {$uniqueSlug}");
                CreateQdrantCollectionJob::dispatchSync($company->id, $uniqueSlug);
            } catch (\Exception $e) {
                Log::error("Error creating Qdrant: " . $e->getMessage());
            }
        }

        // 🚀 Crear workflows n8n (RAG + Training)
        try {
            Log::debug("🚀 Creating n8n workflows for: {$uniqueSlug}");
            CreateN8nWorkflowsJob::dispatchSync($company->id, $uniqueSlug);
        } catch (\Exception $e) {
            Log::error("Error creating n8n workflows: " . $e->getMessage());
        }

        // 📧 Enviar correos
        try {
            PostOnboardingSetupJob::dispatchSync(
                $user->id,
                $company->id,
                $uniqueSlug,
                $request->ip() ?? '0.0.0.0'
            );
        } catch (\Exception $e) {
            Log::error("Error in PostOnboardingSetupJob: " . $e->getMessage());
        }

        $dashboardUrl = route('dashboard.company', ['companySlug' => $uniqueSlug]) . '?auth_token=' . $user->auth_token;

        return [
            'completed' => true,
            'company_slug' => $uniqueSlug,
            'dashboard_url' => $dashboardUrl
        ];
    }

    /**
     * Generar un slug único para la empresa
     */
    protected function generateUniqueCompanySlug(string $companyName): string
    {
        $baseSlug = Str::slug($companyName);
        
        if (empty($baseSlug)) {
            $baseSlug = 'empresa';
        }

        $slug = $baseSlug;
        $counter = 1;

        while (Company::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    /**
     * Obtener o crear empresa para el usuario
     */
    protected function getOrCreateCompany(User $user, ?string $slug = null): Company
    {
        $company = $user->company;
        
        if (!$company) {
            $company = Company::create([
                'user_id' => $user->id,
                'name' => $user->full_name ?? $user->name ?? 'Mi Empresa',
                'slug' => $slug ?? Str::random(10),
            ]);
            $user->update(['company_id' => $company->id]);
        }
        
        return $company;
    }

    /**
     * Obtener timezone basado en código de país del teléfono
     */
    protected function getTimezoneFromPhoneCountry(string $phoneCountry): string
    {
        $timezones = [
            '+1' => 'America/New_York',
            '+52' => 'America/Mexico_City',
            '+54' => 'America/Argentina/Buenos_Aires',
            '+55' => 'America/Sao_Paulo',
            '+56' => 'America/Santiago',
            '+57' => 'America/Bogota',
            '+58' => 'America/Caracas',
            '+34' => 'Europe/Madrid',
            '+51' => 'America/Lima',
            '+593' => 'America/Guayaquil',
            '+591' => 'America/La_Paz',
            '+595' => 'America/Asuncion',
            '+598' => 'America/Montevideo',
            '+506' => 'America/Costa_Rica',
            '+507' => 'America/Panama',
            '+503' => 'America/El_Salvador',
            '+502' => 'America/Guatemala',
            '+504' => 'America/Tegucigalpa',
            '+505' => 'America/Managua',
        ];

        return $timezones[$phoneCountry] ?? 'America/Santiago';
    }
}
