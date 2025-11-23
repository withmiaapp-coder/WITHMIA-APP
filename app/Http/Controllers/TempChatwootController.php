<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class TempChatwootController extends Controller
{
    /**
     * Temporal - Devolver agentes vacíos para evitar errores
     */
    public function getAgents()
    {
        return response()->json([
            'success' => true,
            'data' => []
        ]);
    }

    /**
     * Temporal - Devolver labels vacíos para evitar errores  
     */
    public function getLabels()
    {
        return response()->json([
            'success' => true,
            'data' => []
        ]);
    }

    /**
     * Temporal - Crear agente (no hacer nada)
     */
    public function createAgent(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'Función no implementada aún'
        ]);
    }

    /**
     * Temporal - Crear label (no hacer nada)
     */
    public function createLabel(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'Función no implementada aún'
        ]);
    }
}