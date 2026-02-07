<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Traits\HasCompanyAccess;

class CompanySettingsController extends Controller
{
    use HasCompanyAccess;

    public function getSettings(Request $request): JsonResponse
    {
        try {
            $company = $this->getAuthenticatedCompany();
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $company->id,
                    'name' => $company->name,
                    'slug' => $company->slug,
                    'timezone' => $company->timezone ?? 'UTC',
                    'logo_url' => $company->logo_url,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting company settings: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error al obtener configuración'], 500);
        }
    }

    public function updateSettings(Request $request): JsonResponse
    {
        try {
            $company = $this->getAuthenticatedCompany();
            $user = Auth::user();
            if (!$user->isAdmin()) {
                return response()->json(['success' => false, 'message' => 'No tienes permisos para cambiar la configuración'], 403);
            }
            $timezone = $request->input('timezone');
            if ($timezone) {
                $validTimezones = timezone_identifiers_list();
                if (!in_array($timezone, $validTimezones)) {
                    return response()->json(['success' => false, 'message' => 'Zona horaria inválida'], 400);
                }
                $company->timezone = $timezone;
            }
            $company->save();
            Log::debug('Company settings updated', ['company_id' => $company->id, 'user_id' => $user->id, 'timezone' => $company->timezone]);
            return response()->json([
                'success' => true,
                'message' => 'Configuración actualizada',
                'data' => ['timezone' => $company->timezone]
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating company settings: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error al actualizar configuración'], 500);
        }
    }
}
