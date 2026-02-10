<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ConversationDeduplicationService
 *
 * Servicio para fusionar conversaciones duplicadas en Chatwoot.
 * Usa DB::connection('chatwoot') de Laravel en lugar de PDO raw.
 *
 * CASOS EDGE MANEJADOS:
 * 1. LID vs número real: Usa phone_number del contacto (no identifier)
 * 2. Múltiples inboxes: Solo fusiona dentro del mismo inbox
 * 3. Grupos (@g.us): Los ignora correctamente
 * 4. FK constraints: Verifica referencias antes de eliminar
 * 5. Contactos con Múltiples conversaciones: Fusiona por phone_number normalizado
 */
class ConversationDeduplicationService
{
    /**
     * Shorthand para la conexión Chatwoot.
     */
    private function db(): \Illuminate\Database\Connection
    {
        return DB::connection('chatwoot');
    }

    /**
     * Ejecutar auto-fusión de duplicados para un inbox específico
     */
    public function autoMergeDuplicates(int $inboxId, ?int $accountId = null): array
    {
        try {
            // Verificar conectividad
            $this->db()->getPdo();
        } catch (\Exception $e) {
            Log::error('❌ ConversationDeduplication: No se pudo conectar a Chatwoot DB', [
                'error' => $e->getMessage(),
            ]);
            return ['success' => false, 'error' => 'Database connection failed'];
        }

        try {
            $duplicates = $this->findDuplicatesByPhoneNumber($inboxId, $accountId);

            if (empty($duplicates)) {
                return [
                    'success' => true,
                    'merged' => 0,
                    'message' => 'No se encontraron duplicados',
                    'analyzed' => 0,
                ];
            }

            Log::debug('🔍 ConversationDeduplication: Duplicados encontrados', [
                'inbox_id' => $inboxId,
                'groups_count' => count($duplicates),
                'total_conversations' => array_sum(array_map('count', $duplicates)),
            ]);

            $mergedCount = 0;
            $errors = [];
            $details = [];

            foreach ($duplicates as $phoneNumber => $conversations) {
                try {
                    $result = $this->mergeConversationGroup($conversations, $phoneNumber);
                    if ($result['success']) {
                        $mergedCount += $result['merged_count'];
                        $details[] = [
                            'phone' => $phoneNumber,
                            'kept_id' => $result['kept_conversation_id'],
                            'merged_ids' => $result['merged_conversation_ids'],
                            'messages_moved' => $result['messages_moved'],
                        ];
                    } else {
                        $errors[] = "Phone {$phoneNumber}: " . ($result['error'] ?? 'Unknown error');
                    }
                } catch (\Exception $e) {
                    Log::error('❌ ConversationDeduplication: Error fusionando', [
                        'phone' => $phoneNumber,
                        'error' => $e->getMessage(),
                    ]);
                    $errors[] = "Phone {$phoneNumber}: " . $e->getMessage();
                }
            }

            return [
                'success' => true,
                'merged' => $mergedCount,
                'groups_processed' => count($duplicates),
                'errors' => $errors,
                'details' => $details,
                'message' => "Fusionadas {$mergedCount} conversaciones duplicadas",
            ];

        } catch (\Exception $e) {
            Log::error('❌ ConversationDeduplication: Error general', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Failed to deduplicate conversations'];
        }
    }

    /**
     * Buscar conversaciones duplicadas usando phone_number normalizado.
     * Esta es la forma correcta de encontrar duplicados, no por identifier/LID.
     */
    private function findDuplicatesByPhoneNumber(int $inboxId, ?int $accountId): array
    {
        $sql = "
            SELECT
                c.id as conversation_id,
                c.display_id,
                c.status,
                c.created_at,
                c.last_activity_at,
                ct.id as contact_id,
                ct.name as contact_name,
                ct.phone_number,
                ct.identifier,
                REGEXP_REPLACE(ct.phone_number, '[^0-9]', '', 'g') as normalized_phone,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
            FROM conversations c
            JOIN contacts ct ON c.contact_id = ct.id
            WHERE c.inbox_id = ?
              AND c.status != 1
              AND ct.phone_number IS NOT NULL
              AND ct.phone_number != ''
              AND ct.identifier NOT LIKE '%@g.us'
              AND ct.identifier NOT LIKE '%@broadcast'
        ";

        $bindings = [$inboxId];

        if ($accountId) {
            $sql .= ' AND c.account_id = ?';
            $bindings[] = $accountId;
        }

        $sql .= ' ORDER BY ct.phone_number, c.last_activity_at DESC';

        $allConversations = $this->db()->select($sql, $bindings);

        // Agrupar por número normalizado (últimos 10 dígitos)
        $groupedByPhone = [];

        foreach ($allConversations as $conv) {
            $conv = (array) $conv;
            $normalizedPhone = $conv['normalized_phone'];

            if (strlen($normalizedPhone) < 8) {
                continue;
            }

            $phoneKey = substr($normalizedPhone, -10);
            $groupedByPhone[$phoneKey][] = $conv;
        }

        return array_filter($groupedByPhone, fn($group) => count($group) > 1);
    }

    /**
     * Fusionar un grupo de conversaciones duplicadas.
     * Mantiene la conversación con más mensajes o más reciente.
     */
    private function mergeConversationGroup(array $conversations, string $phoneKey): array
    {
        if (count($conversations) < 2) {
            return ['success' => false, 'error' => 'Menos de 2 conversaciones para fusionar'];
        }

        usort($conversations, function ($a, $b) {
            $msgDiff = ($b['message_count'] ?? 0) - ($a['message_count'] ?? 0);
            if ($msgDiff !== 0) {
                return $msgDiff;
            }
            return strtotime($b['last_activity_at'] ?? '1970-01-01')
                 - strtotime($a['last_activity_at'] ?? '1970-01-01');
        });

        $toKeep = $conversations[0];
        $toMerge = array_slice($conversations, 1);

        Log::debug('🔀 ConversationDeduplication: Iniciando fusión', [
            'phone_key' => $phoneKey,
            'keep' => [
                'conv_id' => $toKeep['conversation_id'],
                'display_id' => $toKeep['display_id'],
                'contact' => $toKeep['contact_name'],
                'messages' => $toKeep['message_count'],
            ],
            'merge_count' => count($toMerge),
        ]);

        $db = $this->db();

        try {
            $db->beginTransaction();

            $totalMessagesMoved = 0;
            $mergedIds = [];
            $deletedContactIds = [];

            foreach ($toMerge as $mergeConv) {
                $mergeConvId = $mergeConv['conversation_id'];
                $mergeContactId = $mergeConv['contact_id'];
                $mergedIds[] = $mergeConv['display_id'];

                $movedCount = $this->moveMessages($mergeConvId, $toKeep['conversation_id']);
                $totalMessagesMoved += $movedCount;

                $this->moveAttachments($mergeConvId, $toKeep['conversation_id']);
                $this->moveConversationLabels($mergeConvId, $toKeep['conversation_id']);
                $this->updateConversationReferences($mergeConvId, $toKeep['conversation_id']);
                $this->deleteConversation($mergeConvId);

                if ($mergeContactId != $toKeep['contact_id']) {
                    $deletedContactIds[] = $mergeContactId;
                }

                Log::debug('✅ ConversationDeduplication: Conversación fusionada', [
                    'merged_conv_id' => $mergeConvId,
                    'messages_moved' => $movedCount,
                ]);
            }

            foreach ($deletedContactIds as $contactId) {
                $this->tryDeleteOrphanContact($contactId);
            }

            $this->updateConversationActivity($toKeep['conversation_id']);
            $this->recalculateUnreadCount($toKeep['conversation_id']);

            $db->commit();

            Log::debug('✅ ConversationDeduplication: Fusión completada', [
                'phone_key' => $phoneKey,
                'kept_conv_id' => $toKeep['display_id'],
                'merged_count' => count($toMerge),
                'total_messages_moved' => $totalMessagesMoved,
            ]);

            return [
                'success' => true,
                'kept_conversation_id' => $toKeep['display_id'],
                'merged_conversation_ids' => $mergedIds,
                'merged_count' => count($toMerge),
                'messages_moved' => $totalMessagesMoved,
            ];

        } catch (\Exception $e) {
            $db->rollBack();
            Log::error('❌ ConversationDeduplication: Error en transacción', [
                'phone_key' => $phoneKey,
                'error' => $e->getMessage(),
            ]);
            return ['success' => false, 'error' => 'Failed to merge conversations'];
        }
    }

    // ------------------------------------------------------------------
    //  Operaciones individuales sobre Chatwoot DB
    // ------------------------------------------------------------------

    private function moveMessages(int $fromConvId, int $toConvId): int
    {
        return $this->db()->update(
            'UPDATE messages SET conversation_id = ? WHERE conversation_id = ?',
            [$toConvId, $fromConvId]
        );
    }

    private function moveAttachments(int $fromConvId, int $toConvId): void
    {
        try {
            $this->db()->update(
                "UPDATE attachments SET record_id = ? WHERE record_type = 'Conversation' AND record_id = ?",
                [$toConvId, $fromConvId]
            );
        } catch (\Exception) {
            // Tabla puede no existir, ignorar
        }
    }

    private function moveConversationLabels(int $fromConvId, int $toConvId): void
    {
        try {
            $this->db()->insert(
                "INSERT INTO conversation_labels (conversation_id, label_id, created_at, updated_at)
                 SELECT ?, label_id, NOW(), NOW()
                 FROM conversation_labels cl
                 WHERE cl.conversation_id = ?
                   AND NOT EXISTS (
                       SELECT 1 FROM conversation_labels cl2
                       WHERE cl2.conversation_id = ? AND cl2.label_id = cl.label_id
                   )",
                [$toConvId, $fromConvId, $toConvId]
            );

            $this->db()->delete('DELETE FROM conversation_labels WHERE conversation_id = ?', [$fromConvId]);
        } catch (\Exception $e) {
            Log::debug('ConversationDeduplication: No se pudieron mover labels', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function updateConversationReferences(int $fromConvId, int $toConvId): void
    {
        $tables = [
            ['table' => 'conversation_participants', 'column' => 'conversation_id', 'condition' => ''],
            ['table' => 'mentions', 'column' => 'conversation_id', 'condition' => ''],
            ['table' => 'notifications', 'column' => 'primary_actor_id', 'condition' => "AND primary_actor_type = 'Conversation'"],
        ];

        foreach ($tables as $ref) {
            try {
                $sql = "UPDATE {$ref['table']} SET {$ref['column']} = ? WHERE {$ref['column']} = ? {$ref['condition']}";
                $this->db()->update($sql, [$toConvId, $fromConvId]);
            } catch (\Exception) {
                // Tabla puede no existir, ignorar
            }
        }
    }

    private function deleteConversation(int $convId): void
    {
        $dependencyTables = ['conversation_participants', 'conversation_labels', 'mentions'];

        foreach ($dependencyTables as $table) {
            try {
                $this->db()->delete("DELETE FROM {$table} WHERE conversation_id = ?", [$convId]);
            } catch (\Exception) {
                // Tabla puede no existir
            }
        }

        $this->db()->delete('DELETE FROM conversations WHERE id = ?', [$convId]);
    }

    private function tryDeleteOrphanContact(int $contactId): void
    {
        try {
            $count = $this->db()->selectOne(
                'SELECT COUNT(*) as cnt FROM conversations WHERE contact_id = ?',
                [$contactId]
            )->cnt;

            if ($count > 0) {
                return;
            }

            $this->db()->delete('DELETE FROM contact_inboxes WHERE contact_id = ?', [$contactId]);
            $this->db()->delete('DELETE FROM contacts WHERE id = ?', [$contactId]);

            Log::debug('🗑️ ConversationDeduplication: Contacto huérfano eliminado', [
                'contact_id' => $contactId,
            ]);
        } catch (\Exception $e) {
            Log::debug('ConversationDeduplication: No se pudo eliminar contacto huérfano', [
                'contact_id' => $contactId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function updateConversationActivity(int $convId): void
    {
        $this->db()->update(
            "UPDATE conversations
             SET last_activity_at = (
                 SELECT COALESCE(MAX(created_at), NOW()) FROM messages WHERE conversation_id = ?
             ),
             updated_at = NOW()
             WHERE id = ?",
            [$convId, $convId]
        );
    }

    private function recalculateUnreadCount(int $convId): void
    {
        $this->db()->update(
            "UPDATE conversations
             SET unread_count = (
                 SELECT COUNT(*) FROM messages
                 WHERE conversation_id = ? AND message_type = 0 AND status != 2
             )
             WHERE id = ?",
            [$convId, $convId]
        );
    }

    /**
     * Obtener diagnóstico de duplicados sin fusionar.
     */
    public function getDuplicatesDiagnosis(int $inboxId, ?int $accountId = null): array
    {
        try {
            $this->db()->getPdo(); // Verificar conexión
        } catch (\Exception) {
            return ['success' => false, 'error' => 'Database connection failed'];
        }

        try {
            $duplicates = $this->findDuplicatesByPhoneNumber($inboxId, $accountId);

            $diagnosis = [];
            foreach ($duplicates as $phoneKey => $conversations) {
                $diagnosis[] = [
                    'phone_key' => $phoneKey,
                    'count' => count($conversations),
                    'conversations' => array_map(fn($c) => [
                        'id' => $c['display_id'],
                        'contact' => $c['contact_name'],
                        'phone' => $c['phone_number'],
                        'identifier' => $c['identifier'],
                        'messages' => $c['message_count'],
                        'last_activity' => $c['last_activity_at'],
                        'status' => $c['status'],
                    ], $conversations),
                ];
            }

            return [
                'success' => true,
                'inbox_id' => $inboxId,
                'duplicate_groups' => count($duplicates),
                'total_duplicated_conversations' => array_sum(array_map('count', $duplicates)),
                'details' => $diagnosis,
            ];

        } catch (\Exception $e) {
            return ['success' => false, 'error' => 'Failed to diagnose conversations'];
        }
    }
}
