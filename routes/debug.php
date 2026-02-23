<?php

/**
 * Rutas de Diagnóstico y Debug
 * Solo se cargan en entorno local y staging (ver api.php).
 * Todas las rutas requieren header X-Debug-Key que coincida con DEBUG_KEY env var.
 *
 * NOTA: La mayoría de diagnósticos están disponibles en:
 * - /api/debug/* (DebugController - auth:sanctum)
 * - /api/admin/* (AdminToolsController - auth:sanctum)
 */

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

Route::prefix('debug')->middleware(function ($request, $next) {
    // Require X-Debug-Key header matching DEBUG_KEY env variable
    $expectedKey = config('app.debug_key');
    if (empty($expectedKey) || $request->header('X-Debug-Key') !== $expectedKey) {
        return response()->json(['error' => 'Unauthorized'], 403);
    }
    return $next($request);
})->group(function () {

    Route::get('/debug-chatwoot-config', function () {
        $companies = \App\Models\Company::select('id', 'name', 'slug', 'chatwoot_account_id')
            ->get()
            ->map(fn($c) => [
                'id' => $c->id, 'name' => $c->name, 'slug' => $c->slug,
                'chatwoot_account_id' => $c->chatwoot_account_id,
                'has_own_account' => !empty($c->chatwoot_account_id),
            ]);
        return response()->json(['total' => $companies->count(), 'companies' => $companies]);
    });

    Route::get('/debug-session', function (Request $request) {
        return response()->json([
            'authenticated' => \Illuminate\Support\Facades\Auth::check(),
            'user_id' => \Illuminate\Support\Facades\Auth::id(),
            'session_id' => session()->getId(),
            'session_driver' => config('session.driver'),
            'cookies' => array_keys($request->cookies->all()),
        ]);
    });

    Route::get('/debug-users', function () {
        $users = \App\Models\User::all(['id', 'name', 'email', 'company_slug', 'chatwoot_inbox_id', 'created_at']);
        return response()->json(['total' => $users->count(), 'users' => $users]);
    });

    Route::get('/debug/companies-info', function () {
        $companies = \App\Models\Company::all()->map(fn($c) => [
            'id' => $c->id, 'name' => $c->name, 'slug' => $c->slug,
            'chatwoot_account_id' => $c->chatwoot_account_id,
            'chatwoot_provisioned' => $c->chatwoot_provisioned,
            'settings' => $c->settings,
        ]);
        return response()->json(['total' => $companies->count(), 'companies' => $companies]);
    });

    Route::get('/debug/whatsapp-instances', function () {
        $instances = DB::table('whatsapp_instances')->get();
        return response()->json([
            'total' => $instances->count(),
            'instances' => $instances->map(fn($i) => [
                'id' => $i->id, 'instance_name' => $i->instance_name,
                'company_id' => $i->company_id, 'n8n_workflow_id' => $i->n8n_workflow_id ?? null,
                'is_active' => $i->is_active ?? null,
            ])
        ]);
    });

    Route::get('/debug/test-websocket/{inboxId}', function ($inboxId) {
        event(new \App\Events\NewMessageReceived(
            ['content' => 'Test ' . now()->format('H:i:s'), 'test' => true],
            999, (int)$inboxId, 1
        ));
        return response()->json([
            'success' => true, 'channel' => "private-inbox.{$inboxId}",
            'broadcast_driver' => config('broadcasting.default'),
        ]);
    });

    Route::get('/debug/onboarding-status', function () {
        $qdrantService = app(\App\Services\QdrantService::class);
        $companies = \App\Models\Company::all()->map(function ($company) use ($qdrantService) {
            $settings = $company->settings ?? [];
            $collectionName = $settings['qdrant_collection'] ?? $qdrantService->getCollectionName($company->slug);
            return [
                'slug' => $company->slug,
                'qdrant_exists' => $qdrantService->collectionExists($collectionName),
                'rag_workflow_id' => $settings['rag_workflow_id'] ?? null,
                'training_workflow_id' => $settings['training_workflow_id'] ?? null,
            ];
        });
        return response()->json(['companies' => $companies, 'qdrant_collections' => $qdrantService->getCollections()]);
    });

    Route::get('/diagnose-instance/{instanceName}', function (string $instanceName) {
        $evolutionApi = app(\App\Services\EvolutionApiService::class);
        $instance = DB::table('whatsapp_instances')->where('instance_name', $instanceName)->first();
        $diagnosis = ['instance_name' => $instanceName, 'local_db' => $instance !== null];
        try {
            $status = $evolutionApi->getStatus($instanceName);
            $diagnosis['evolution_connected'] = $status['connected'] ?? false;
        } catch (\Exception $e) {
            $diagnosis['evolution_error'] = $e->getMessage();
        }
        $diagnosis['has_workflow'] = !empty($instance->n8n_workflow_id ?? null);
        $diagnosis['has_webhook'] = !empty($instance->n8n_webhook_url ?? null);
        return response()->json($diagnosis);
    });

    // fix-owner-roles: Use /api/n8n/fix-owner-roles (AdminToolsController) instead

}); // End debug middleware group
