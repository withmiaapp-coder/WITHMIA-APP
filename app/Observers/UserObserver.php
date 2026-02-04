<?php

namespace App\Observers;

use App\Models\User;
use App\Services\EvolutionApiService;
use App\Services\QdrantService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class UserObserver
{
    /**
     * Handle the User "created" event.
     */
    public function created(User $user): void
    {
        Log::debug('UserObserver::created', ['user_id' => $user->id, 'name' => $user->name]);
    }

    /**
     * Handle the User "updated" event.
     */
    public function updated(User $user): void
    {
        Log::debug('UserObserver::updated', ['user_id' => $user->id, 'step' => $user->onboarding_step]);
    }

    /**
     * Handle the User "deleting" event.
     */
    public function deleting(User $user): void
    {
        Log::debug('UserObserver::deleting started', ['user_id' => $user->id]);
        
        try {
            // Eliminar instancia de Evolution API
            $this->deleteEvolutionInstance($user);
            
            // Eliminar archivos Excel del usuario
            $this->deleteUserExcelFiles($user);
            
            // Eliminar colección Qdrant (solo si es último admin)
            $this->deleteQdrantCollection($user);

        } catch (\Exception $e) {
            Log::error('UserObserver::deleting exception', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'file' => $e->getFile() . ':' . $e->getLine()
            ]);
        }

        Log::debug('UserObserver::deleting completed', ['user_id' => $user->id]);
    }

    /**
     * Eliminar instancia de Evolution API
     */
    private function deleteEvolutionInstance(User $user): void
    {
        if (empty($user->whatsapp_instance_id)) {
            return;
        }

        $instanceName = $user->whatsapp_instance_id;
        
        try {
            $evolutionService = new EvolutionApiService();
            $result = $evolutionService->deleteInstance($instanceName);

            if ($result['success']) {
                Log::debug('Evolution instance deleted', ['instance' => $instanceName]);
            } else {
                Log::warning('Failed to delete Evolution instance', [
                    'instance' => $instanceName,
                    'error' => $result['message'] ?? 'Unknown'
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Exception deleting Evolution instance', [
                'instance' => $instanceName,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Eliminar archivos Excel del usuario
     */
    private function deleteUserExcelFiles(User $user): void
    {
        $excelDirectory = "exports/contacts";
        $excelPattern = "contactos_whatsapp_user_{$user->id}_";
        
        if (!Storage::disk('public')->exists($excelDirectory)) {
            return;
        }

        $deletedFiles = 0;
        $files = Storage::disk('public')->files($excelDirectory);
        
        foreach ($files as $file) {
            $fileName = basename($file);
            if (str_starts_with($fileName, $excelPattern) && str_ends_with($fileName, '.xlsx')) {
                Storage::disk('public')->delete($file);
                $deletedFiles++;
            }
        }
        
        if ($deletedFiles > 0) {
            Log::debug('Excel files deleted', ['user_id' => $user->id, 'count' => $deletedFiles]);
        }
    }

    /**
     * Eliminar colección Qdrant (solo si es último admin de la empresa)
     */
    private function deleteQdrantCollection(User $user): void
    {
        if (empty($user->company_slug) || $user->role !== 'admin') {
            return;
        }

        $companySlug = $user->company_slug;
        
        // Verificar que no haya otros admins
        $otherAdmins = User::where('company_slug', $companySlug)
            ->where('role', 'admin')
            ->where('id', '!=', $user->id)
            ->count();
        
        if ($otherAdmins > 0) {
            Log::debug('Qdrant collection NOT deleted - other admins exist', [
                'company_slug' => $companySlug,
                'other_admins' => $otherAdmins
            ]);
            return;
        }

        try {
            $qdrantService = new QdrantService();
            $collectionName = $qdrantService->getCollectionName($companySlug);
            $result = $qdrantService->deleteCollection($collectionName);

            if ($result['success']) {
                Log::debug('Qdrant collection deleted', [
                    'user_id' => $user->id,
                    'collection' => $collectionName
                ]);
            } else {
                Log::warning('Failed to delete Qdrant collection', [
                    'collection' => $collectionName,
                    'error' => $result['error'] ?? 'Unknown'
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Exception deleting Qdrant collection', [
                'company_slug' => $companySlug,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Handle the User "deleted" event.
     */
    public function deleted(User $user): void
    {
        Log::debug('UserObserver::deleted', ['user_id' => $user->id]);
    }

    /**
     * Handle the User "restored" event.
     */
    public function restored(User $user): void
    {
        Log::debug('UserObserver::restored', ['user_id' => $user->id]);
    }

    /**
     * Handle the User "force deleted" event.
     */
    public function forceDeleted(User $user): void
    {
        Log::debug('UserObserver::forceDeleted', ['user_id' => $user->id]);
    }
}
