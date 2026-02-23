<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SupportTicketController extends Controller
{
    /**
     * Store a new support ticket (public endpoint, rate-limited).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'       => 'required|email|max:255',
            'name'        => 'nullable|string|max:255',
            'subject'     => 'required|string|max:500',
            'description' => 'required|string|max:5000',
            'category'    => 'required|string|max:100',
        ]);

        try {
            $ticket = SupportTicket::create([
                'email'       => $validated['email'],
                'name'        => $validated['name'] ?? null,
                'subject'     => $validated['subject'],
                'description' => $validated['description'],
                'category'    => $validated['category'],
                'status'      => 'abierto',
            ]);

            Log::info('Support ticket created', [
                'id'    => $ticket->id,
                'email' => $ticket->email,
            ]);

            return response()->json([
                'success' => true,
                'ticket'  => [
                    'id'         => $ticket->id,
                    'status'     => $ticket->status,
                    'created_at' => $ticket->created_at->toIso8601String(),
                ],
            ], 201);
        } catch (\Exception $e) {
            Log::error('Failed to create support ticket', [
                'error' => $e->getMessage(),
                'email' => $validated['email'] ?? 'unknown',
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al crear el ticket. Intenta de nuevo.',
            ], 500);
        }
    }
}
