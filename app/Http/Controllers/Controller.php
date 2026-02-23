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
     * Use for caught exceptions.
     */
    protected function errorResponse(\Throwable $e, int $status = 500): JsonResponse
    {
        Log::error($e->getMessage(), ['exception' => get_class($e), 'file' => $e->getFile(), 'line' => $e->getLine()]);

        return response()->json([
            'success' => false,
            'error' => config('app.debug') ? $e->getMessage() : __('errors.server_error'),
        ], $status);
    }

    /**
     * Return a standardized JSON error for validation/business-logic failures.
     * Use instead of inline response()->json(['error' => ...]).
     */
    protected function jsonError(string $message, int $status = 400, array $extra = []): JsonResponse
    {
        return response()->json(array_merge([
            'success' => false,
            'error' => $message,
        ], $extra), $status);
    }

    /**
     * Return a standardized JSON success response.
     */
    protected function jsonSuccess(mixed $data = null, string $message = 'OK', int $status = 200): JsonResponse
    {
        $response = ['success' => true, 'message' => $message];

        if ($data !== null) {
            $response['data'] = $data;
        }

        return response()->json($response, $status);
    }
}
