<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsAppInstance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsAppInstanceController extends Controller
{
    /**
     * Get company_id for a given WhatsApp instance name
     * Protected by X-N8N-Secret header
     */
    public function getCompanyByInstance(Request $request, $instanceName): JsonResponse
    {
        $instance = WhatsAppInstance::where('instance_name', $instanceName)
            ->active()
            ->first();

        if (!$instance) {
            return response()->json([
                'error' => 'Instance not found or inactive',
                'instance_name' => $instanceName
            ], 404);
        }

        return response()->json([
            'company_id' => $instance->company_id,
            'instance_name' => $instanceName,
            'instance_url' => $instance->instance_url,
            'collection_name' => "company_{$instance->instance_name}_knowledge"
        ]);
    }
}
