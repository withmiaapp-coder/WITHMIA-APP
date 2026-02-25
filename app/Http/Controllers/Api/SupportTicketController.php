<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\TicketReply;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

    // =========================================================================
    // AUTHENTICATED CLIENT ENDPOINTS (require auth)
    // =========================================================================

    /**
     * List tickets for the authenticated user.
     */
    public function myTickets(): JsonResponse
    {
        $user = Auth::user();

        $tickets = SupportTicket::where('email', $user->email)
            ->withCount('replies')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json(['tickets' => $tickets]);
    }

    /**
     * Show a single ticket with replies (only if it belongs to the user).
     */
    public function show(string $id): JsonResponse
    {
        $user = Auth::user();

        $ticket = SupportTicket::with('replies')
            ->where('email', $user->email)
            ->findOrFail($id);

        return response()->json(['ticket' => $ticket]);
    }

    /**
     * Client replies to their own ticket.
     */
    public function reply(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();

        $ticket = SupportTicket::where('email', $user->email)->findOrFail($id);

        $validated = $request->validate([
            'body' => 'required|string|max:10000',
        ]);

        $reply = TicketReply::create([
            'ticket_id'    => $ticket->id,
            'author_type'  => 'client',
            'author_name'  => $user->name,
            'author_email' => $user->email,
            'body'         => $validated['body'],
        ]);

        // Re-open the ticket if it was closed or responded
        if (in_array($ticket->status, ['cerrado', 'respondido'])) {
            $ticket->update(['status' => 'abierto', 'closed_at' => null]);
        }

        $ticket->refresh()->load('replies');

        return response()->json([
            'success' => true,
            'reply'   => $reply,
            'ticket'  => $ticket,
        ]);
    }

    /**
     * Create a ticket as authenticated user (pre-fills email/name).
     */
    public function storeAuthenticated(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'subject'     => 'required|string|max:500',
            'description' => 'required|string|max:5000',
            'category'    => 'required|string|max:100',
        ]);

        try {
            $ticket = SupportTicket::create([
                'email'       => $user->email,
                'name'        => $user->name,
                'subject'     => $validated['subject'],
                'description' => $validated['description'],
                'category'    => $validated['category'],
                'status'      => 'abierto',
            ]);

            Log::info('Authenticated support ticket created', [
                'id'      => $ticket->id,
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'ticket'  => $ticket,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Failed to create support ticket', [
                'error'   => $e->getMessage(),
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al crear el ticket. Intenta de nuevo.',
            ], 500);
        }
    }
}
