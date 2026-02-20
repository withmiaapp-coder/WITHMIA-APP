<?php
// Build: 2026-02-11T07:55 - DB fallback for assign/status/contact + entry logging

namespace App\Http\Controllers\Api;

use App\Events\ConversationAssigned;
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
        } catch (\Throwable $e) {
            Log::error('[WITHMIA] getLabels ERROR', ['error' => $e->getMessage(), 'class' => get_class($e)]);
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
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * Eliminar una etiqueta del sistema
     */
    public function deleteLabel($labelId)
    {
        try {
            $label = $this->chatwootDb()->table('labels')
                ->where('id', $labelId)
                ->where('account_id', $this->accountId)
                ->first();

            if (!$label) {
                return response()->json(['success' => false, 'error' => 'Etiqueta no encontrada'], 404);
            }

            // Remover la etiqueta de todas las conversaciones que la tengan
            $conversations = $this->chatwootDb()->table('conversations')
                ->where('account_id', $this->accountId)
                ->get();

            foreach ($conversations as $conv) {
                // cached_label_list es un string separado por comas o un campo de texto
                if (!empty($conv->cached_label_list) && str_contains($conv->cached_label_list, $label->title)) {
                    $currentLabels = array_filter(array_map('trim', explode(',', $conv->cached_label_list)));
                    $currentLabels = array_values(array_diff($currentLabels, [$label->title]));
                    $this->chatwootDb()->table('conversations')
                        ->where('id', $conv->id)
                        ->update(['cached_label_list' => implode(',', $currentLabels)]);
                }
            }

            // Eliminar registros de label_taggings (si la tabla existe)
            try {
                $this->chatwootDb()->table('label_taggings')
                    ->where('label_id', $labelId)
                    ->where('account_id', $this->accountId)
                    ->delete();
            } catch (\Throwable $e) {
                // La tabla puede no existir en algunas versiones de Chatwoot
                Log::debug('[WITHMIA] label_taggings cleanup skipped', ['error' => $e->getMessage()]);
            }

            // Eliminar la etiqueta
            $this->chatwootDb()->table('labels')
                ->where('id', $labelId)
                ->where('account_id', $this->accountId)
                ->delete();

            return response()->json(['success' => true, 'message' => 'Etiqueta eliminada correctamente']);
        } catch (\Throwable $e) {
            Log::error('[WITHMIA] deleteLabel ERROR', ['error' => $e->getMessage(), 'labelId' => $labelId]);
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

            // Chatwoot almacena labels como texto en cached_label_list (comma-separated)
            $cachedLabels = $conv->cached_label_list ?? '';
            $labelTitles = $this->parseCachedLabelList($cachedLabels);

            if (empty($labelTitles)) {
                return response()->json(['success' => true, 'labels' => []]);
            }

            // Enriquecer con metadata de la tabla labels
            $labels = $chatwootDb->table('labels')
                ->where('account_id', $this->accountId)
                ->whereIn('title', $labelTitles)
                ->select('id', 'title', 'color')
                ->get()
                ->toArray();

            return response()->json(['success' => true, 'labels' => $labels]);
        } catch (\Throwable $e) {
            Log::error('[WITHMIA] getConversationLabels ERROR', [
                'error' => $e->getMessage(), 
                'class' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'conversationId' => $conversationId ?? null,
                'accountId' => $this->accountId ?? null,
                'inboxId' => $this->inboxId ?? null,
            ]);
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

            Log::info('[WITHMIA] updateConversationLabels ENTRY', [
                'conversationId' => $conversationId,
                'labels' => $labels,
                'accountId' => $this->accountId,
                'inboxId' => $this->inboxId,
            ]);

            $conversation = $this->findConversation($conversationId);
            if (!$conversation) {
                Log::warning('[WITHMIA] updateConversationLabels: conversation not found', [
                    'conversationId' => $conversationId,
                ]);
                return response()->json(['success' => false, 'error' => 'Conversación no encontrada'], 404);
            }

            // Validar que los títulos de labels existen en la cuenta
            $validLabels = [];
            if (!empty($labels)) {
                $validLabels = $chatwootDb->table('labels')
                    ->where('account_id', $this->accountId)
                    ->whereIn('title', $labels)
                    ->pluck('title')
                    ->toArray();
            }

            Log::info('[WITHMIA] updateConversationLabels: valid labels resolved', [
                'input_labels' => $labels,
                'valid_labels' => $validLabels,
                'conv_id' => $conversation->id,
            ]);

            // Chatwoot almacena labels como texto en cached_label_list (comma-separated, con \n)
            $cachedValue = !empty($validLabels) ? implode("\n", $validLabels) . "\n" : '';
            $chatwootDb->table('conversations')
                ->where('id', $conversation->id)
                ->update([
                    'cached_label_list' => $cachedValue,
                    'updated_at' => now(),
                ]);

            // Retornar labels enriquecidos con metadata
            $updatedLabels = [];
            if (!empty($validLabels)) {
                $updatedLabels = $chatwootDb->table('labels')
                    ->where('account_id', $this->accountId)
                    ->whereIn('title', $validLabels)
                    ->select('id', 'title', 'color')
                    ->get()
                    ->toArray();
            }

            Log::info('[WITHMIA] updateConversationLabels SUCCESS', [
                'conv_id' => $conversation->id,
                'labels_set' => $validLabels,
            ]);

            return response()->json(['success' => true, 'labels' => $updatedLabels]);
        } catch (\Throwable $e) {
            Log::error('[WITHMIA] updateConversationLabels ERROR', [
                'error' => $e->getMessage(), 
                'class' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'conversationId' => $conversationId ?? null,
                'accountId' => $this->accountId ?? null,
                'inboxId' => $this->inboxId ?? null,
            ]);
            return response()->json([
                'success' => false, 
                'error' => 'Error al actualizar etiquetas: ' . $e->getMessage()
            ], 500);
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
        } catch (\Throwable $e) {
            Log::error('[WITHMIA] getAgents ERROR', ['error' => $e->getMessage(), 'class' => get_class($e)]);
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

            Log::info('[WITHMIA] assignConversation ENTRY', [
                'conversationId' => $conversationId,
                'assigneeId' => $assigneeId,
                'accountId' => $this->accountId,
                'inboxId' => $this->inboxId,
                'hasToken' => !empty($this->chatwootToken),
            ]);

            $conversation = $this->findConversation($conversationId);
            if (!$conversation) {
                return response()->json(['success' => false, 'error' => 'Conversación no encontrada'], 404);
            }

            $assigned = false;

            // Intentar via Chatwoot API primero (dispara eventos internos)
            if ($this->chatwootToken) {
                try {
                    $result = $this->chatwootService->assignConversation(
                        (int) $this->accountId,
                        $this->chatwootToken,
                        $conversation->display_id,
                        $assigneeId ? (int) $assigneeId : null
                    );
                    $assigned = $result['success'] ?? false;
                    if (!$assigned) {
                        Log::warning('[WITHMIA] assignConversation API failed, falling back to DB', [
                            'api_error' => $result['error'] ?? 'unknown',
                            'status' => $result['status'] ?? null,
                        ]);
                    }
                } catch (\Throwable $apiError) {
                    Log::warning('[WITHMIA] assignConversation API exception, falling back to DB', [
                        'error' => $apiError->getMessage(),
                    ]);
                }
            }

            // Fallback: actualizar directamente en la BD de Chatwoot
            if (!$assigned) {
                $this->chatwootDb()->table('conversations')
                    ->where('id', $conversation->id)
                    ->update([
                        'assignee_id' => $assigneeId ? (int) $assigneeId : null,
                        'updated_at' => now(),
                    ]);
            }

            $assignee = null;
            if ($assigneeId) {
                $assigneeRow = $this->chatwootDb()->table('users')
                    ->where('id', $assigneeId)
                    ->first();
                if ($assigneeRow) {
                    $assignee = [
                        'id' => $assigneeRow->id,
                        'name' => $assigneeRow->name ?? null,
                        'email' => $assigneeRow->email ?? null,
                        'avatar_url' => $assigneeRow->avatar_url ?? null,
                    ];
                }
            }

            // Broadcast en tiempo real a todos los agentes del inbox
            try {
                $contactName = null;
                if ($conversation->contact_id ?? null) {
                    $contact = $this->chatwootDb()->table('contacts')
                        ->where('id', $conversation->contact_id)
                        ->first();
                    $contactName = $contact->name ?? $contact->phone_number ?? null;
                }

                $currentUser = auth()->user();
                $assignedBy = $currentUser ? [
                    'id' => $currentUser->id,
                    'name' => $currentUser->name ?? $currentUser->full_name ?? 'Sistema',
                ] : null;

                broadcast(new ConversationAssigned(
                    $conversationId,
                    $this->inboxId,
                    $this->accountId,
                    $assignee,
                    $assignedBy,
                    $contactName
                ));

                Log::info('[WITHMIA] ConversationAssigned broadcast sent', [
                    'conversationId' => $conversationId,
                    'assigneeId' => $assigneeId,
                    'inboxId' => $this->inboxId,
                ]);
            } catch (\Throwable $broadcastError) {
                // No bloquear la asignación si el broadcast falla
                Log::warning('[WITHMIA] ConversationAssigned broadcast failed', [
                    'error' => $broadcastError->getMessage(),
                    'conversationId' => $conversationId,
                ]);
            }

            return response()->json(['success' => true, 'assignee' => $assignee]);
        } catch (\Throwable $e) {
            Log::error('[WITHMIA] assignConversation ERROR', [
                'error' => $e->getMessage(),
                'class' => get_class($e),
                'conversationId' => $conversationId,
                'accountId' => $this->accountId ?? null,
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Error al asignar conversación: ' . $e->getMessage()
            ], 500);
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

            $statusChanged = false;

            // Intentar via Chatwoot API primero
            if ($this->chatwootToken) {
                try {
                    $result = $this->chatwootService->toggleConversationStatus(
                        (int) $this->accountId,
                        $this->chatwootToken,
                        $conversation->display_id,
                        $status
                    );
                    $statusChanged = $result['success'] ?? false;
                    if (!$statusChanged) {
                        Log::warning('[WITHMIA] changeConversationStatus API failed, falling back to DB', [
                            'api_error' => $result['error'] ?? 'unknown',
                        ]);
                    }
                } catch (\Throwable $apiError) {
                    Log::warning('[WITHMIA] changeConversationStatus API exception, falling back to DB', [
                        'error' => $apiError->getMessage(),
                    ]);
                }
            }

            // Fallback: actualizar directamente en la BD de Chatwoot
            if (!$statusChanged) {
                $statusInt = self::STATUS_TO_INT[$status] ?? 0;
                $this->chatwootDb()->table('conversations')
                    ->where('id', $conversation->id)
                    ->update([
                        'status' => $statusInt,
                        'updated_at' => now(),
                    ]);
            }

            return response()->json([
                'success' => true,
                'data' => ['id' => $conversation->id, 'status' => $status, 'current_status' => $status]
            ]);
        } catch (\Throwable $e) {
            Log::error('[WITHMIA] changeConversationStatus ERROR', [
                'error' => $e->getMessage(),
                'class' => get_class($e),
                'conversationId' => $conversationId,
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Error al cambiar estado: ' . $e->getMessage()
            ], 500);
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

            if (!$this->chatwootToken) {
                // Fallback: actualizar directamente en BD
                $this->chatwootDb()->table('contacts')
                    ->where('id', (int) $contactId)
                    ->where('account_id', $this->accountId)
                    ->update(array_merge($updateData, ['updated_at' => now()]));
                
                return response()->json([
                    'success' => true,
                    'message' => 'Contacto actualizado exitosamente',
                    'data' => $updateData
                ]);
            }

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

        } catch (\Throwable $e) {
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
        } catch (\Throwable $e) {
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
                    $raw = $avgSeconds->avg_time;
                    $totalSeconds = 0;

                    if (is_numeric($raw)) {
                        $totalSeconds = abs((float) $raw);
                    } elseif (is_string($raw) && preg_match('/^(-?)(\d+):(\d+):([\d.]+)$/', $raw, $m)) {
                        // PostgreSQL interval format "HH:MM:SS" or "-HH:MM:SS"
                        $totalSeconds = abs($m[2] * 3600 + $m[3] * 60 + (float) $m[4]);
                    } elseif (is_string($raw) && preg_match('/^(-?)(\d+)\s+days?\s+(\d+):(\d+):([\d.]+)$/', $raw, $m)) {
                        // PostgreSQL interval "X days HH:MM:SS"
                        $totalSeconds = abs($m[2] * 86400 + $m[3] * 3600 + $m[4] * 60 + (float) $m[5]);
                    }

                    if ($totalSeconds > 0) {
                        $minutes = round($totalSeconds / 60, 1);
                        $avgResponseTime = $minutes < 60 ? "{$minutes} min" : round($minutes / 60, 1) . " hrs";
                    }
                }
            } catch (\Throwable $e) {
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

        } catch (\Throwable $e) {
            Log::error('[WITHMIA] getDashboardStats ERROR', [
                'error' => $e->getMessage(), 'class' => get_class($e),
                'file' => $e->getFile(), 'line' => $e->getLine(),
                'user_id' => $this->userId, 'account_id' => $this->accountId,
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

    // =========================================================================
    // RESPUESTAS RÁPIDAS (Canned Responses)
    // =========================================================================

    /**
     * Obtener respuestas rápidas de la cuenta
     */
    public function getCannedResponses()
    {
        try {
            $responses = $this->chatwootDb()->table('canned_responses')
                ->where('account_id', $this->accountId)
                ->select('id', 'short_code', 'content')
                ->orderBy('short_code')
                ->get()
                ->toArray();

            return response()->json(['success' => true, 'data' => $responses]);
        } catch (\Throwable $e) {
            Log::error('[WITHMIA] getCannedResponses ERROR', ['error' => $e->getMessage()]);
            return response()->json(['success' => true, 'data' => []]);
        }
    }

    /**
     * Crear respuesta rápida
     */
    public function createCannedResponse(Request $request)
    {
        try {
            $shortCode = $request->input('short_code');
            $content = $request->input('content');

            if (!$shortCode || !$content) {
                return response()->json(['success' => false, 'error' => 'short_code y content son requeridos'], 422);
            }

            $existing = $this->chatwootDb()->table('canned_responses')
                ->where('account_id', $this->accountId)
                ->where('short_code', $shortCode)
                ->first();

            if ($existing) {
                return response()->json(['success' => false, 'error' => 'Ya existe una respuesta con ese atajo'], 422);
            }

            $id = $this->chatwootDb()->table('canned_responses')->insertGetId([
                'account_id' => $this->accountId,
                'short_code' => $shortCode,
                'content' => $content,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'data' => ['id' => $id, 'short_code' => $shortCode, 'content' => $content]
            ]);
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    /**
     * Eliminar respuesta rápida
     */
    public function deleteCannedResponse($id)
    {
        try {
            $deleted = $this->chatwootDb()->table('canned_responses')
                ->where('id', $id)
                ->where('account_id', $this->accountId)
                ->delete();

            if (!$deleted) {
                return response()->json(['success' => false, 'error' => 'Respuesta no encontrada'], 404);
            }

            return response()->json(['success' => true, 'message' => 'Respuesta eliminada']);
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    // =========================================================================
    // NOTAS DE CONTACTO (Contact Notes)
    // =========================================================================

    /**
     * Obtener notas de un contacto
     */
    public function getContactNotes($contactId)
    {
        try {
            $notes = $this->chatwootDb()->table('notes')
                ->where('account_id', $this->accountId)
                ->where('contact_id', (int) $contactId)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($note) {
                    $user = null;
                    if ($note->user_id) {
                        $user = $this->chatwootDb()->table('users')
                            ->where('id', $note->user_id)
                            ->select('id', 'name', 'email')
                            ->first();
                    }
                    return [
                        'id' => $note->id,
                        'content' => $note->content,
                        'user' => $user ? ['id' => $user->id, 'name' => $user->name] : null,
                        'created_at' => $this->utcToTimestamp($note->created_at),
                    ];
                })
                ->toArray();

            return response()->json(['success' => true, 'data' => $notes]);
        } catch (\Throwable $e) {
            // Table may not exist in all Chatwoot versions
            Log::debug('[WITHMIA] getContactNotes: table may not exist', ['error' => $e->getMessage()]);
            return response()->json(['success' => true, 'data' => []]);
        }
    }

    /**
     * Crear nota para un contacto
     */
    public function createContactNote(Request $request, $contactId)
    {
        try {
            $content = $request->input('content');
            if (!$content) {
                return response()->json(['success' => false, 'error' => 'El contenido es requerido'], 422);
            }

            // Get Chatwoot user ID for the current user
            $chatwootUser = $this->chatwootDb()->table('users')
                ->where('email', auth()->user()->email)
                ->first();

            $id = $this->chatwootDb()->table('notes')->insertGetId([
                'account_id' => $this->accountId,
                'contact_id' => (int) $contactId,
                'content' => $content,
                'user_id' => $chatwootUser->id ?? null,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $id,
                    'content' => $content,
                    'user' => $chatwootUser ? ['id' => $chatwootUser->id, 'name' => $chatwootUser->name] : null,
                    'created_at' => now()->timestamp,
                ]
            ]);
        } catch (\Throwable $e) {
            Log::error('[WITHMIA] createContactNote ERROR', ['error' => $e->getMessage()]);
            return $this->errorResponse($e);
        }
    }

    /**
     * Eliminar nota de un contacto
     */
    public function deleteContactNote($contactId, $noteId)
    {
        try {
            $deleted = $this->chatwootDb()->table('notes')
                ->where('id', $noteId)
                ->where('contact_id', (int) $contactId)
                ->where('account_id', $this->accountId)
                ->delete();

            if (!$deleted) {
                return response()->json(['success' => false, 'error' => 'Nota no encontrada'], 404);
            }

            return response()->json(['success' => true, 'message' => 'Nota eliminada']);
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    // =========================================================================
    // PRIORIDAD DE CONVERSACIÓN
    // =========================================================================

    /**
     * Actualizar prioridad de una conversación
     */
    public function updateConversationPriority(Request $request, $conversationId)
    {
        try {
            $priority = $request->input('priority'); // null, 'urgent', 'high', 'medium', 'low'

            $conversation = $this->findConversation($conversationId);
            if (!$conversation) {
                return response()->json(['success' => false, 'error' => 'Conversación no encontrada'], 404);
            }

            // Chatwoot stores priority as integer: null=none, 0=none, 1=low, 2=medium, 3=high, 4=urgent
            $priorityMap = ['low' => 1, 'medium' => 2, 'high' => 3, 'urgent' => 4];
            $priorityInt = $priority ? ($priorityMap[$priority] ?? null) : null;

            $this->chatwootDb()->table('conversations')
                ->where('id', $conversation->id)
                ->update([
                    'priority' => $priorityInt,
                    'updated_at' => now(),
                ]);

            return response()->json(['success' => true, 'priority' => $priority]);
        } catch (\Throwable $e) {
            Log::error('[WITHMIA] updateConversationPriority ERROR', ['error' => $e->getMessage()]);
            return $this->errorResponse($e);
        }
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Parse PostgreSQL text array string "{a,b,c}" to PHP array
     */
    private function parsePostgresArray($value): array
    {
        if (!$value) return [];
        if (is_array($value)) return $value;
        $parsed = trim($value, '{}');
        return $parsed !== '' ? array_map(fn($l) => trim($l, '"'), explode(',', $parsed)) : [];
    }

    /**
     * Parse Chatwoot cached_label_list (newline or comma separated text) to array
     */
    private function parseCachedLabelList($value): array
    {
        if (!$value || !is_string($value)) return [];
        // Chatwoot uses newline-separated values in cached_label_list
        $labels = preg_split('/[\n,]+/', trim($value));
        return array_values(array_filter(array_map('trim', $labels)));
    }
}
