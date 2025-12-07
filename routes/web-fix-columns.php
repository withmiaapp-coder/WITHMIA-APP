<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

Route::get('/fix-user-columns', function () {
    try {
        // Agregar columnas si no existen
        DB::statement('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NULL AFTER name');
        DB::statement('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL AFTER email');
        
        return response()->json([
            'success' => true,
            'message' => 'Columnas agregadas correctamente'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});
