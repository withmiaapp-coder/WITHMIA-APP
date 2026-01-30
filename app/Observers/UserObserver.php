<?php

namespace App\Observers;

use App\Models\User;
use App\Services\EvolutionInstanceManager;
use App\Services\QdrantService;
use Illuminate\Support\Facades\Log;

class UserObserver
{
    /**
     * Handle the User "created" event.
     */
    public function created(User $user): void
    {
        file_put_contents('/tmp/observer_debug.log', "🟢 UserObserver::created() - Usuario creado: {$user->name} (ID: {$user->id})\n", FILE_APPEND);
    }

    /**
     * Handle the User "updated" event.
     */
    public function updated(User $user): void
    {
        file_put_contents('/tmp/observer_debug.log', "🟡 UserObserver::updated() - Usuario actualizado: {$user->name} (Step: {$user->onboarding_step})\n", FILE_APPEND);
    }

    /**
     * Handle the User "deleting" event.
     */
    public function deleting(User $user): void
    {
        file_put_contents('/tmp/observer_debug.log', "🔴 UserObserver::deleting() INICIADO - Usuario: {$user->name} (ID: {$user->id})\n", FILE_APPEND);
        
        try {
            // Eliminar instancia de Evolution API usando whatsapp_instance_id
            if (!empty($user->whatsapp_instance_id)) {
                $instanceName = $user->whatsapp_instance_id;
                file_put_contents('/tmp/observer_debug.log', "🔍 Intentando eliminar instancia Evolution API: {$instanceName}\n", FILE_APPEND);
                
                $evolutionManager = new EvolutionInstanceManager();
                file_put_contents('/tmp/observer_debug.log', "✅ EvolutionInstanceManager creado correctamente\n", FILE_APPEND);

                $result = $evolutionManager->deleteInstance($instanceName);
                file_put_contents('/tmp/observer_debug.log', "📡 Resultado deleteInstance: " . json_encode($result) . "\n", FILE_APPEND);

                if ($result['success']) {
                    file_put_contents('/tmp/observer_debug.log', "✅ Instancia eliminada exitosamente: {$instanceName}\n", FILE_APPEND);
                } else {
                    file_put_contents('/tmp/observer_debug.log', "❌ Error eliminando instancia: {$result['message']}\n", FILE_APPEND);
                }
            } else {
                file_put_contents('/tmp/observer_debug.log', "⚠️ Usuario sin whatsapp_instance_id, no se puede eliminar instancia\n", FILE_APPEND);
            }

            // Eliminar archivos Excel del usuario
            $excelDirectory = "exports/contacts";
            $excelPattern = "contactos_whatsapp_user_{$user->id}_";
            
            file_put_contents('/tmp/observer_debug.log', "🗂️ Buscando archivos Excel del usuario {$user->id} en: {$excelDirectory}\n", FILE_APPEND);
            
            $deletedFiles = 0;
            if (\Storage::disk('public')->exists($excelDirectory)) {
                $files = \Storage::disk('public')->files($excelDirectory);
                file_put_contents('/tmp/observer_debug.log', "🔍 Archivos encontrados: " . count($files) . "\n", FILE_APPEND);
                
                foreach ($files as $file) {
                    $fileName = basename($file);
                    file_put_contents('/tmp/observer_debug.log', "🔎 Revisando archivo: {$fileName} | Patrón: {$excelPattern}\n", FILE_APPEND);
                    
                    if (strpos($fileName, $excelPattern) === 0 && substr($fileName, -5) === '.xlsx') {
                        \Storage::disk('public')->delete($file);
                        file_put_contents('/tmp/observer_debug.log', "✅ Archivo Excel eliminado: {$file}\n", FILE_APPEND);
                        $deletedFiles++;
                    }
                }
            } else {
                file_put_contents('/tmp/observer_debug.log', "❌ Directorio no existe: {$excelDirectory}\n", FILE_APPEND);
            }
            
            if ($deletedFiles > 0) {
                file_put_contents('/tmp/observer_debug.log', "📊 Total archivos Excel eliminados: {$deletedFiles}\n", FILE_APPEND);
            } else {
                file_put_contents('/tmp/observer_debug.log', "ℹ️ No se encontraron archivos Excel para eliminar del usuario {$user->id}\n", FILE_APPEND);
            }

            // 🔴 ELIMINAR COLECCIÓN QDRANT DEL USUARIO
            // SOLO si es el admin/owner principal de la empresa (no miembros del equipo)
            if (!empty($user->company_slug) && $user->role === 'admin') {
                $companySlug = $user->company_slug;
                
                // Verificar que no haya otros admins en la misma empresa
                $otherAdmins = \App\Models\User::where('company_slug', $companySlug)
                    ->where('role', 'admin')
                    ->where('id', '!=', $user->id)
                    ->count();
                
                // Solo eliminar colección si es el último admin de la empresa
                if ($otherAdmins === 0) {
                    file_put_contents('/tmp/observer_debug.log', "🗑️ Intentando eliminar colección Qdrant para company_slug: {$companySlug} (último admin)\n", FILE_APPEND);
                    
                    try {
                        $qdrantService = new QdrantService();
                        $collectionName = $qdrantService->getCollectionName($companySlug);
                        file_put_contents('/tmp/observer_debug.log', "📦 Nombre de colección Qdrant: {$collectionName}\n", FILE_APPEND);
                        
                        $result = $qdrantService->deleteCollection($collectionName);
                        
                        if ($result['success']) {
                            file_put_contents('/tmp/observer_debug.log', "✅ Colección Qdrant eliminada: {$collectionName}\n", FILE_APPEND);
                            Log::info("UserObserver: Colección Qdrant eliminada", [
                                'user_id' => $user->id,
                                'company_slug' => $companySlug,
                                'collection' => $collectionName
                            ]);
                        } else {
                            file_put_contents('/tmp/observer_debug.log', "❌ Error eliminando colección Qdrant: " . ($result['error'] ?? 'Unknown') . "\n", FILE_APPEND);
                            Log::warning("UserObserver: Error eliminando colección Qdrant", [
                                'user_id' => $user->id,
                                'company_slug' => $companySlug,
                                'collection' => $collectionName,
                                'error' => $result['error'] ?? 'Unknown'
                            ]);
                        }
                    } catch (\Exception $qdrantException) {
                        file_put_contents('/tmp/observer_debug.log', "💥 Excepción Qdrant: " . $qdrantException->getMessage() . "\n", FILE_APPEND);
                        Log::error("UserObserver: Excepción al eliminar colección Qdrant", [
                            'user_id' => $user->id,
                            'company_slug' => $companySlug,
                            'error' => $qdrantException->getMessage()
                        ]);
                    }
                } else {
                    file_put_contents('/tmp/observer_debug.log', "ℹ️ No se elimina colección Qdrant: hay {$otherAdmins} admins restantes en {$companySlug}\n", FILE_APPEND);
                }
            } else if (!empty($user->company_slug) && $user->role !== 'admin') {
                file_put_contents('/tmp/observer_debug.log', "ℹ️ Usuario es miembro del equipo (role: {$user->role}), NO se elimina colección Qdrant de {$user->company_slug}\n", FILE_APPEND);
            } else {
                file_put_contents('/tmp/observer_debug.log', "⚠️ Usuario sin company_slug, no se puede eliminar colección Qdrant\n", FILE_APPEND);
            }

        } catch (\Exception $e) {
            file_put_contents('/tmp/observer_debug.log', "💥 EXCEPCIÓN en UserObserver::deleting() - " . $e->getMessage() . "\n", FILE_APPEND);
            file_put_contents('/tmp/observer_debug.log', "📍 Archivo: " . $e->getFile() . ":" . $e->getLine() . "\n", FILE_APPEND);
        }

        file_put_contents('/tmp/observer_debug.log', "🏁 UserObserver::deleting() COMPLETADO\n", FILE_APPEND);
    }

    /**
     * Handle the User "deleted" event.
     */
    public function deleted(User $user): void
    {
        file_put_contents('/tmp/observer_debug.log', "✅ UserObserver::deleted() - Usuario eliminado completamente: {$user->name} (ID: {$user->id})\n", FILE_APPEND);
    }

    /**
     * Handle the User "restored" event.
     */
    public function restored(User $user): void
    {
        file_put_contents('/tmp/observer_debug.log', "🔄 UserObserver::restored() - Usuario restaurado: {$user->name} (ID: {$user->id})\n", FILE_APPEND);
    }

    /**
     * Handle the User "force deleted" event.
     */
    public function forceDeleted(User $user): void
    {
        file_put_contents('/tmp/observer_debug.log', "💀 UserObserver::forceDeleted() - Usuario eliminado permanentemente: {$user->name} (ID: {$user->id})\n", FILE_APPEND);
    }
}