<?php

namespace App\Observers;

use App\Models\WhatsAppInstance;
use App\Services\EvolutionApiService;
use Illuminate\Support\Facades\Log;

class WhatsAppInstanceObserver
{
    /**
     * Handle the WhatsAppInstance "deleting" event.
     * Clean up Evolution API instance before deletion.
     */
    public function deleting(WhatsAppInstance $instance): void
    {
        if (empty($instance->instance_name)) {
            return;
        }

        try {
            $evolutionService = new EvolutionApiService();
            $result = $evolutionService->deleteInstance($instance->instance_name);

            if ($result['success'] ?? false) {
                Log::info('WhatsAppInstanceObserver: Evolution instance deleted', [
                    'instance_name' => $instance->instance_name,
                    'company_id' => $instance->company_id,
                ]);
            } else {
                Log::warning('WhatsAppInstanceObserver: Failed to delete Evolution instance', [
                    'instance_name' => $instance->instance_name,
                    'error' => $result['message'] ?? 'Unknown',
                ]);
            }
        } catch (\Exception $e) {
            Log::error('WhatsAppInstanceObserver: Exception deleting Evolution instance', [
                'instance_name' => $instance->instance_name,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
