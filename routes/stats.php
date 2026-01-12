<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

Route::get('/admin/stats', function () {
    try {
        // Consulta directa SQL para evitar problemas con modelos
        $users = DB::select("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 20");
        $userCount = DB::table('users')->count();
        
        $companies = [];
        $companyCount = 0;
        try {
            $companies = DB::select("SELECT id, name, slug, created_at FROM companies ORDER BY created_at DESC LIMIT 10");
            $companyCount = DB::table('companies')->count();
        } catch (\Exception $e) {
            // Tabla companies puede no existir
        }
        
        return response()->json([
            'total_users' => $userCount,
            'total_companies' => $companyCount,
            'users' => $users,
            'companies' => $companies,
            'timestamp' => now()->toIso8601String(),
        ], 200);
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ], 500);
    }
});

// Endpoint temporal para hacer admin al primer usuario
Route::get('/admin/make-admin/{email}', function ($email) {
    try {
        $affected = DB::table('users')
            ->where('email', $email)
            ->update(['role' => 'admin']);
        
        if ($affected > 0) {
            $user = DB::table('users')->where('email', $email)->first(['id', 'name', 'email', 'role']);
            return response()->json([
                'success' => true,
                'message' => "Usuario {$email} ahora es admin",
                'user' => $user
            ], 200);
        }
        
        return response()->json([
            'success' => false,
            'message' => "Usuario {$email} no encontrado"
        ], 404);
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage()
        ], 500);
    }
});
