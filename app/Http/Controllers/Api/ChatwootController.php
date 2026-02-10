<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ChatwootService;
use App\Traits\ChatwootDbAccess;
use App\Traits\ResolvesChatwootConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * ChatwootController (reducido)
 *
 * Gestiona: etiquetas, agentes, asignación/estado de conversaciones,
 * contactos, configuración y estadísticas del dashboard.
 *
 * Conversaciones → ChatwootConversationController
 * Mensajes      → ChatwootMessageController
 * Equipos       → ChatwootTeamController
 */
class ChatwootController extends Controller
{
    use ResolvesChatwootConfig, ChatwootDbAccess;

    private $accountId;
    private $inboxId;
    private $userId;
    private ChatwootService $chatwootService;

    public function __construct(ChatwootService $chatwootService)
    {
        $this->chatwootService = $chatwootService;
        $this->bootChatwootMiddleware();
    }

    // =========================================================================
    // ETIQUETAS (Labels)
    // =========================================================================

    /**
     * Obtener etiquetas de la cuenta
     */
    public function getLabels()
    {
        try {
            $labels = $this->chatwootDb()->table('labels')
                ->where('account_id', $this->accountId)
                ->select('id', 'title', 'description', 'color', 'show_on_sidebar')
                ->orderBy('title')
                ->get()
                ->toArray();

            return response()->json(['success' => true, 'data' => $labels]);
        } catch (\Exception $e) {
            error_log('[WITHMIA] getLabels ERROR: ' . $e->getMessage());
            Log::error('getLabels Error: ' . $e->getMessage());
            return response()->json(['success' => true, 'data' => []]);
        }
    }

    /**
     * Crear nueva etiqueta
     */
    public function createLabel(Request $request)
    {
        try {
            $title = $request->input('title');
            $description = $request->input('description', '');
            $color = $request->input('color', '#1f93ff');
            $showOnSidebar = $request->input('show_on_sidebar', true);

            $existing = $this->chatwootDb()->table('labels')
                ->where('account_id', $this->accountId)
                ->where('title', $title)
                ->first();

            if ($existing) {
                return response()->json(['success' => false, 'error' => 'Ya existe una etiqueta con ese nombre'], 422);
            }

            $labelId = $this->chatwootDb()->table('labels')->insertGetId([
                'account_id' => $this->accountId,
                'title' => $title,
                'description' => $description,
                'color' => $color,
                'show_on_sidebar' => $showOnSidebar,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $labelId, 'title' => $title,
                    'description' => $description, 'color' => $color,
                    'show_on_sidebar' => $showOnSidebar
                ]
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * Obtener etiquetas de una conversación
     */
    public function getConversationLabels($conversationId)
    {
        try {
            $chatwootDb = $this->chatwootDb();
            $conv = $this->findConversation($conversationId);

            if (!$conv) {
                return response()->json(['success' => true, 'labels' => []]);
            }

            $labels = $chatwootDb->table('conversations_labels')
                ->join('labels', 'conversations_labels.label_id', '=', 'labels.id')
                ->where('conversations_labels.conversation_id', $conv->id)
                ->select('labels.id', 'labels.title', 'labels.color')
                ->get()
                ->toArray();

            return response()->json(['success' => true, 'labels' => $labels]);
        } catch (\Exception $e) {
            error_log('[WITHMIA] getConversationLabels ERROR: ' . $e->getMessage());
            Log::error('getConversationLabels Error: ' . $e->getMessage());
            return response()->json(['success' => true, 'labels' => []]);
        }
    }

    /**
     * Actualizar etiquetas de una conversación
     */
    public function updateConversationLabels(Request $request, $conversationId)
    {
        try {
            $labels = $request->input('labels', []);
            $chatwootDb = $this->chatwootDb();

            $conversation = $this->findConversation($conversationId);
            if (!$conversation) {
                return response()->json(['success' => false, 'error' => 'Conversación no encontrada'], 404);
            }

            $labelIds = [];
            if (!empty($labels)) {
                $labelIds = $chatwootDb->table('labels')
                    ->where('account_id', $this->accountId)
                    ->whereIn('title', $labels)
                    ->pluck('id')
                    ->toArray();
            }

            // Transacción atómica para evitar pérdida de labels si falla el insert
            $chatwootDb->transaction(function () use ($chatwootDb, $conversation, $labelIds) {
                $chatwootDb->table('conversations_labels')
                    ->where('conversation_id', $conversation->id)
                    ->delete();

                foreach ($labelIds as $labelId) {
                    $chatwootDb->table('conversations_labels')->insert([
                        'conversation_id' => $conversation->id,
                        'label_id' => $labelId
                    ]);
                }
            });

            $updatedLabels = $chatwootDb->table('conversations_labels')
                ->join('labels', 'conversations_labels.label_id', '=', 'labels.id')
                ->where('conversations_labels.conversation_id', $conversation->id)
                ->select('labels.id', 'labels.title', 'labels.color')
                ->get()
                ->toArray();

            return response()->json(['success' => true, 'labels' => $updatedLabels]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    // =========================================================================
    // AGENTES
    // =========================================================================

    /**
     * Obtener agentes de la cuenta
     */
    public function getAgents()
    {
        try {
            $user = auth()->user();
            $company = $user ? $user->company : null;

            if (!$company || !$company->chatwoot_account_id) {
                return response()->json(['success' => true, 'data' => [], 'message' => 'Sin Chatwoot configurado']);
            }

            $chatwootDb = $this->chatwootDb();

            $chatwootAgents = $chatwootDb->table('account_users')
                ->join('users', 'account_users.user_id', '=', 'users.id')
                ->where('account_users.account_id', $this->accountId)
                ->select(
                    'users.id', 'users.name', 'users.display_name', 'users.email',
                    'account_users.role', 'users.availability'
                )
                ->get();

            $emails = $chatwootAgents->pluck('email')->filter()->toArray();
            $localUsers = !empty($emails)
                ? \App\Models\User::whereIn('email', $emails)->get()->keyBy('email')
                : collect();

            $agents = $chatwootAgents->map(function ($agent) use ($localUsers) {
                $localUser = $localUsers->get($agent->email);
                return [
                    'id' => $agent->id,
                    'name' => $localUser->full_name ?? $agent->display_name ?? $agent->name,
                    'email' => $agent->email,
                    'role' => $agent->role,
                    'thumbnail' => '',
                    'availability_status' => $agent->availability ?? 'offline'
                ];
            })->toArray();

            return response()->json(['success' => true, 'data' => $agents]);
        } catch (\Exception $e) {
            error_log('[WITHMIA] getAgents ERROR: ' . $e->getMessage());
            Log::error('getAgents Error: ' . $e->getMessage());
            return response()->json(['success' => true, 'data' => []]);
        }
    }

    // =========================================================================
    // ASIGNACIÓN Y ESTADO DE CONVERSACIONES
    // =========================================================================

    /**
     * Asignar conversación a un agente
     */
    public function assignConversation(Request $request, $conversationId)
    {
        try {
            $assigneeId = $request->input('assignee_id');

            $conversation = $this->findConversation($conversationId);
            if (!$conversation) {
                return response()->json(['success' => false, 'error' => 'Conversación no encontrada'], 404);
            }

            // Usar Chatwoot API para que los eventos internos se disparen correctamente
            $result = $this->chatwootService->assignConversation(
                (int) $this->accountId,
                $this->chatwootToken,
                $conversation->display_id,
                $assigneeId ? (int) $assigneeId : null
            );

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'Error al asignar conversación'
                ], $result['status'] ?? 500);
            }

            $assignee = null;
            if ($assigneeId) {
                $assignee = $this->chatwootDb()->table('users')
                    ->where('id', $assigneeId)
                    ->select('id', 'name', 'email', 'avatar_url')
                    ->first();
            }

            return response()->json(['success' => true, 'assignee' => $assignee]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * Cambiar estado de conversación (open, resolved, pending, snoozed)
     */
    public function changeConversationStatus(Request $request, $conversationId)
    {
        try {
            $status = $request->input('status');

            $conversation = $this->findConversation($conversationId);
            if (!$conversation) {
                return response()->json(['success' => false, 'error' => 'Conversación no encontrada'], 404);
            }

            // Validar que el status sea válido
            $validStatuses = ['open', 'resolved', 'pending', 'snoozed'];
            if (!in_array($status, $validStatuses)) {
                return response()->json(['success' => false, 'error' => 'Estado no válido. Use: ' . implode(', ', $validStatuses)], 422);
            }

            // Usar Chatwoot API para que los eventos internos se disparen correctamente
            $result = $this->chatwootService->toggleConversationStatus(
                (int) $this->accountId,
                $this->chatwootToken,
                $conversation->display_id,
                $status
            );

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'Error al cambiar estado'
                ], $result['status'] ?? 500);
            }

            return response()->json([
                'success' => true,
                'data' => ['id' => $conversation->id, 'status' => $status, 'current_status' => $status]
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    // =========================================================================
    // CONTACTOS
    // =========================================================================

    /**
     * Actualizar contacto en Chatwoot
     */
    public function updateContact(Request $request, $contactId)
    {
        try {
            $validated = $request->validate([
                'name' => 'nullable|string|max:255',
                'email' => 'nullable|email|max:255',
                'phone_number' => 'nullable|string|max:50'
            ]);

            $email = $validated['email'] ?? '';
            if (in_array(strtolower($email), ['sin-email@example.com', 'no-email@example.com', ''])) {
                $email = null;
            }

            $updateData = ['name' => $validated['name'] ?? ''];
            if ($email !== null) $updateData['email'] = $email;
            if (!empty($validated['phone_number'])) $updateData['phone_number'] = $validated['phone_number'];

            $result = $this->chatwootService->updateContact(
                $this->accountId, $this->chatwootToken, (int) $contactId, $updateData
            );

            if ($result['success']) {
                $contactData = $result['data'] ?? [];
                return response()->json([
                    'success' => true,
                    'message' => 'Contacto actualizado exitosamente',
                    'data' => $contactData['payload'] ?? $contactData
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar contacto en Chatwoot',
                'error' => $result['error'] ?? 'Unknown'
            ], $result['status'] ?? 500);

        } catch (\Exception $e) {
            Log::error('Error al actualizar contacto: ' . $e->getMessage(), ['contact_id' => $contactId]);
            return $this->errorResponse($e);
        }
    }

    // =========================================================================
    // CONFIGURACIÓN Y ESTADÍSTICAS
    // =========================================================================

    /**
     * Obtener configuración de Chatwoot para el usuario actual
     */
    public function getConfig(Request $request)
    {
        try {
            $user = auth()->user();
            $company = $user ? $user->company : null;

            return response()->json([
                'success' => true,
                'data' => [
                    'account_id' => $this->accountId,
                    'inbox_id' => $this->inboxId,
                    'configured' => !empty($this->chatwootToken) && !empty($this->inboxId),
                    'company_name' => $company ? $company->name : null
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting Chatwoot config', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Error al obtener configuración'], 500);
        }
    }

    /**
     * Obtener estadísticas del dashboard
     */
    public function getDashboardStats()
    {
        try {
            if (!$this->inboxId) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'totalConversations' => 0, 'activeConversations' => 0,
                        'totalMessages' => 0, 'agentMessages' => 0, 'clientMessages' => 0,
                        'topContacts' => [], 'avgResponseTime' => '0 min',
                    ]
                ]);
            }

            $chatwootDb = $this->chatwootDb();

            // 1. Total y activas
            $conversationStats = $chatwootDb->table('conversations')
                ->where('account_id', $this->accountId)
                ->where('inbox_id', $this->inboxId)
                ->selectRaw('COUNT(*) as total, SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as active')
                ->first();

            // 2. Estadísticas de mensajes
            $messageStats = $chatwootDb->table('messages')
                ->where('account_id', $this->accountId)
                ->where('inbox_id', $this->inboxId)
                ->where('message_type', '!=', 2)
                ->selectRaw('
                    COUNT(*) as total,
                    SUM(CASE WHEN message_type = 1 THEN 1 ELSE 0 END) as agent,
                    SUM(CASE WHEN message_type = 0 THEN 1 ELSE 0 END) as client
                ')
                ->first();

            // 3. Top 5 contactos
            $topContacts = $chatwootDb->table('messages as m')
                ->join('conversations as c', 'm.conversation_id', '=', 'c.id')
                ->join('contacts as ct', 'c.contact_id', '=', 'ct.id')
                ->where('m.account_id', $this->accountId)
                ->where('m.inbox_id', $this->inboxId)
                ->where('m.message_type', '!=', 2)
                ->groupBy('ct.id', 'ct.name', 'ct.phone_number')
                ->orderByRaw('COUNT(*) DESC')
                ->limit(5)
                ->selectRaw('ct.id, ct.name, ct.phone_number as phone, COUNT(*) as count')
                ->get()
                ->toArray();

            // 4. Tiempo promedio de respuesta
            $avgResponseTime = 'N/A';
            try {
                $avgSeconds = $chatwootDb->selectOne("
                    SELECT AVG(response_time) as avg_time FROM (
                        SELECT MIN(r.created_at) - m.created_at as response_time
                        FROM messages m
                        JOIN messages r ON r.conversation_id = m.conversation_id 
                            AND r.message_type = 1 AND r.created_at > m.created_at
                        WHERE m.account_id = ? AND m.inbox_id = ? AND m.message_type = 0
                            AND m.created_at > NOW() - INTERVAL '7 days'
                        GROUP BY m.id LIMIT 100
                    ) sub
                ", [$this->accountId, $this->inboxId]);

                if ($avgSeconds && $avgSeconds->avg_time) {
                    $seconds = abs($avgSeconds->avg_time);
                    if ($seconds instanceof \DateInterval) {
                        $minutes = round(($seconds->h * 60 + $seconds->i + $seconds->s / 60), 1);
                    } else {
                        $minutes = round($seconds / 60, 1);
                    }
                    $avgResponseTime = $minutes < 60 ? "{$minutes} min" : round($minutes / 60, 1) . " hrs";
                }
            } catch (\Exception $e) {
                Log::debug('No se pudo calcular avg response time', ['error' => $e->getMessage()]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'totalConversations' => $conversationStats->total ?? 0,
                    'activeConversations' => $conversationStats->active ?? 0,
                    'totalMessages' => $messageStats->total ?? 0,
                    'agentMessages' => $messageStats->agent ?? 0,
                    'clientMessages' => $messageStats->client ?? 0,
                    'topContacts' => $topContacts,
                    'avgResponseTime' => $avgResponseTime,
                ]
            ]);

        } catch (\Exception $e) {
            error_log('[WITHMIA] getDashboardStats ERROR: ' . $e->getMessage());
            Log::error('Chatwoot Stats Error: ' . $e->getMessage(), [
                'user_id' => $this->userId, 'account_id' => $this->accountId
            ]);
            // Return 200 with empty stats for graceful frontend degradation
            return response()->json([
                'success' => true,
                'data' => [
                    'totalConversations' => 0, 'activeConversations' => 0,
                    'totalMessages' => 0, 'agentMessages' => 0, 'clientMessages' => 0,
                    'topContacts' => [], 'avgResponseTime' => 'N/A',
                ]
            ]);
        }
    }
}
