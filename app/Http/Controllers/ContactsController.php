<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Services\ContactsExcelExporter;

class ContactsController extends Controller
{
    private $exporter;

    public function __construct(ContactsExcelExporter $exporter)
    {
        $this->middleware('auth');
        $this->exporter = $exporter;
    }

    /**
     * Exportar contactos del usuario a Excel
     */
    public function exportToExcel(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Verificar que el usuario tenga una instancia de WhatsApp
            if (!$user->whatsapp_instance_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes una instancia de WhatsApp conectada'
                ], 400);
            }

            // Obtener contactos de Evolution API
            $contacts = $this->exporter->getContactsFromEvolution($user->whatsapp_instance_id);
            
            if (empty($contacts)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontraron contactos para exportar'
                ], 404);
            }

            // Exportar a Excel
            $result = $this->exporter->exportContactsToExcel(
                $contacts, 
                $user->id,
                $user->company?->name ?? $user->name
            );

            if ($result['success']) {
                // Guardar referencia del archivo en el usuario
                $user->update([
                    'last_contacts_export' => $result['file_path'],
                    'contacts_export_stats' => json_encode($result['stats'])
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Contactos exportados exitosamente',
                    'download_url' => $result['download_url'],
                    'file_name' => $result['file_name'],
                    'stats' => $result['stats']
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al exportar contactos'
            ], 500);

        } catch (\Exception $e) {
            Log::error('Error exportando contactos: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Descargar archivo Excel de contactos
     */
    public function downloadExcel(Request $request, $fileName)
    {
        try {
            $user = Auth::user();
            $filePath = 'exports/contacts/' . $fileName;

            // Verificar que el archivo existe
            if (!Storage::exists($filePath)) {
                abort(404, 'Archivo no encontrado');
            }

            // Verificar que el archivo pertenece al usuario actual
            // (opcional: agregar más validaciones de seguridad)
            if (!str_contains($fileName, (string)$user->id)) {
                abort(403, 'No autorizado');
            }

            // Obtener información del archivo
            $fullPath = storage_path('app/' . $filePath);
            $fileSize = filesize($fullPath);
            
            // Headers para descarga
            $headers = [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
                'Content-Length' => $fileSize,
                'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
                'Pragma' => 'public'
            ];

            return response()->download($fullPath, $fileName, $headers);

        } catch (\Exception $e) {
            Log::error('Error descargando archivo: ' . $e->getMessage());
            abort(500, 'Error al descargar el archivo');
        }
    }

    /**
     * Listar exportaciones del usuario
     */
    public function listExports(Request $request)
    {
        try {
            $user = Auth::user();
            $exportsPath = 'exports/contacts/';
            
            // Buscar archivos del usuario
            $files = Storage::files($exportsPath);
            $userFiles = array_filter($files, function($file) use ($user) {
                return str_contains($file, 'contactos_whatsapp_' . $user->id . '_');
            });

            $exports = [];
            foreach ($userFiles as $file) {
                $stats = $this->exporter->getExcelStats($file);
                if ($stats) {
                    $exports[] = [
                        'file_name' => basename($file),
                        'download_url' => route('contacts.download', ['file' => basename($file)]),
                        'created_at' => date('d/m/Y H:i:s', $stats['created_at']),
                        'file_size' => $this->formatFileSize($stats['file_size']),
                        'total_contacts' => $stats['total_contacts']
                    ];
                }
            }

            // Ordenar por fecha de creación (más reciente primero)
            usort($exports, function($a, $b) {
                return strtotime($b['created_at']) - strtotime($a['created_at']);
            });

            return response()->json([
                'success' => true,
                'exports' => $exports,
                'total' => count($exports)
            ]);

        } catch (\Exception $e) {
            Log::error('Error listando exportaciones: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al listar exportaciones'
            ], 500);
        }
    }

    /**
     * Eliminar exportación
     */
    public function deleteExport(Request $request, $fileName)
    {
        try {
            $user = Auth::user();
            $filePath = 'exports/contacts/' . $fileName;

            // Verificar que el archivo pertenece al usuario
            if (!str_contains($fileName, (string)$user->id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado'
                ], 403);
            }

            // Eliminar archivo
            if (Storage::exists($filePath)) {
                Storage::delete($filePath);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Exportación eliminada exitosamente'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Archivo no encontrado'
            ], 404);

        } catch (\Exception $e) {
            Log::error('Error eliminando exportación: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar exportación'
            ], 500);
        }
    }

    /**
     * Formatear tamaño de archivo
     */
    private function formatFileSize($bytes)
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, 2) . ' ' . $units[$i];
    }

    // ========================================
    // MÉTODOS PARA EXCEL DINÁMICO
    // ========================================

    /**
     * Descargar Excel dinámico del usuario
     */
    public function downloadDynamicExcel(Request $request)
    {
        try {
            $user = Auth::user();
            $dynamicManager = app(\App\Services\DynamicContactsExcelManager::class);

            // Obtener o crear el Excel dinámico del usuario
            $result = $dynamicManager->getUserExcelFile(
                $user->id,
                $user->company?->name ?? $user->name
            );

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message']
                ], 400);
            }

            $filePath = $result['file_info']['file_path'];
            $fileName = $result['file_info']['file_name'];

            // Verificar que el archivo existe
            if (!Storage::disk('local')->exists($filePath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'El archivo Excel no existe'
                ], 404);
            }

            // Descargar el archivo
            return Storage::disk('local')->download($filePath, $fileName, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ]);

        } catch (\Exception $e) {
            Log::error('Error descargando Excel dinámico: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener estadísticas del Excel dinámico
     */
    public function getExcelStats(Request $request)
    {
        try {
            $user = Auth::user();
            $dynamicManager = app(\App\Services\DynamicContactsExcelManager::class);

            $stats = $dynamicManager->getExcelStats($user->id);

            return response()->json([
                'success' => true,
                'stats' => $stats,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'company_name' => $user->company?->name,
                    'whatsapp_connected' => !empty($user->whatsapp_instance_id)
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error obteniendo estadísticas Excel: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error obteniendo estadísticas'
            ], 500);
        }
    }

    /**
     * Refrescar Excel con contactos actuales de Evolution API
     */
    public function refreshExcel(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user->whatsapp_instance_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes una instancia de WhatsApp conectada'
                ], 400);
            }

            $dynamicManager = app(\App\Services\DynamicContactsExcelManager::class);

            // Obtener contactos actuales de Evolution API
            $contacts = $this->exporter->getContactsFromEvolution($user->whatsapp_instance_id);
            
            if (empty($contacts)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontraron contactos en tu WhatsApp'
                ], 404);
            }

            // Importar/actualizar contactos en Excel dinámico
            $result = $dynamicManager->importContactsToExcel(
                $user->id,
                $contacts,
                $user->company?->name ?? $user->name
            );

            if ($result['success']) {
                // Actualizar stats del usuario
                $user->update([
                    'last_contacts_export' => $result['file_info']['file_path'],
                    'contacts_export_stats' => json_encode([
                        'total' => $result['total'],
                        'added' => $result['added'],
                        'last_refresh' => now()->toISOString()
                    ])
                ]);
            }

            return response()->json([
                'success' => $result['success'],
                'message' => $result['success'] ? 'Excel actualizado correctamente' : $result['message'],
                'stats' => [
                    'total_contacts' => $result['total'] ?? 0,
                    'added_contacts' => $result['added'] ?? 0,
                    'file_info' => $result['file_info'] ?? null
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error refrescando Excel: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error actualizando el Excel'
            ], 500);
        }
    }

    /**
     * Resetear Excel dinámico (crear uno nuevo vacío)
     */
    public function resetExcel(Request $request)
    {
        try {
            $user = Auth::user();
            $dynamicManager = app(\App\Services\DynamicContactsExcelManager::class);

            // Eliminar Excel actual si existe
            $currentStats = $dynamicManager->getExcelStats($user->id);
            if ($currentStats['exists'] && $currentStats['file_path']) {
                Storage::disk('local')->delete($currentStats['file_path']);
            }

            // Crear nuevo Excel vacío
            $result = $dynamicManager->getUserExcelFile(
                $user->id,
                $user->company?->name ?? $user->name
            );

            if ($result['success']) {
                $user->update([
                    'last_contacts_export' => $result['file_info']['file_path'],
                    'contacts_export_stats' => json_encode([
                        'total' => 0,
                        'added' => 0,
                        'reset_at' => now()->toISOString()
                    ])
                ]);
            }

            return response()->json([
                'success' => $result['success'],
                'message' => $result['success'] ? 'Excel reseteado correctamente' : $result['message'],
                'file_info' => $result['file_info'] ?? null
            ]);

        } catch (\Exception $e) {
            Log::error('Error reseteando Excel: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error reseteando el Excel'
            ], 500);
        }
    }
}