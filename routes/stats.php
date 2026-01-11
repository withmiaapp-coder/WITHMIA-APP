<?php

use Illuminate\Support\Facades\Route;
use App\Models\User;
use App\Models\Company;
use App\Models\KnowledgeDocument;
use Illuminate\Support\Facades\DB;

Route::get('/api/admin/stats', function () {
    try {
        // Verificar conexión a BD
        DB::connection()->getPdo();
        
        $stats = [
            'database' => [
                'connected' => true,
                'users' => User::count(),
                'companies' => Company::count(),
                'knowledge_docs' => KnowledgeDocument::count(),
            ],
            'users_details' => [
                'total' => User::count(),
                'with_whatsapp' => User::whereNotNull('whatsapp_instance_id')->count(),
                'with_chatwoot' => User::whereNotNull('chatwoot_agent_id')->count(),
                'onboarding_completed' => User::where('onboarding_completed', 1)->count(),
            ],
            'companies_details' => [
                'total' => Company::count(),
                'active' => Company::where('is_active', 1)->count(),
                'with_chatwoot' => Company::whereNotNull('chatwoot_inbox_id')->count(),
            ],
            'recent_users' => User::latest()->take(5)->get(['id', 'name', 'email', 'created_at'])->toArray(),
            'recent_companies' => Company::latest()->take(5)->get(['id', 'name', 'slug', 'created_at'])->toArray(),
            'timestamp' => now()->toIso8601String(),
        ];
        
        return response()->json($stats, 200);
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});
