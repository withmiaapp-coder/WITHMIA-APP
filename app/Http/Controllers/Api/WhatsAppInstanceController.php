<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WhatsAppInstanceController extends Controller
{
    /**
     * Get company_id for a given WhatsApp instance name
     * 
     * @param string $instanceName
     * @return \Illuminate\Http\JsonResponse
     */
    public function getCompanyByInstance($instanceName)
    {
        $instance = DB::table('whatsapp_instances')
            ->where('instance_name', $instanceName)
            ->where('is_active', 1)
            ->first(['company_id', 'instance_url']);

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
            'collection_name' => "company_{$instance->company_id}_knowledge"
        ]);
    }
}
