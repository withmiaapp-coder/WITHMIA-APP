<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Log;

abstract class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    /**
     * Return a safe error response that hides internal details in production.
     */
    protected function errorResponse(\Exception $e, int $status = 500): JsonResponse
    {
        Log::error($e->getMessage(), ['exception' => get_class($e), 'file' => $e->getFile(), 'line' => $e->getLine()]);

        return response()->json([
            'success' => false,
            'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor',
        ], $status);
    }
}
