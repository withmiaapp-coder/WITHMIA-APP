<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ConversationDeduplicationService V2
 * 
 * Servicio mejorado para fusionar conversaciones duplicadas en Chatwoot.
 * 
 * CASOS EDGE MANEJADOS:
 * 1. LID vs número real: Usa phone_number del contacto (no identifier)
 * 2. Múltiples inboxes: Solo fusiona dentro del mismo inbox
 * 3. Grupos (@g.us): Los ignora correctamente
 * 4. FK constraints: Verifica referencias antes de eliminar
 * 5. Contactos con múltiples conversaciones: Fusiona por phone_number normalizado
 */
class ConversationDeduplicationServiceV2
{
    private ?\PDO $connection = null;

    /**
     * Ejecutar auto-fusión de duplicados para un inbox específico
     */
    public function autoMergeDuplicates(int $inboxId, int $accountId = null): array
    {
        try {
            $this->connection = $this->getChatwootConnection();
            
            if (!$this->connection) {
                Log::error('❌ ConversationDeduplicationV2: No se pudo conectar a Chatwoot DB');
                return ['success' => false, 'error' => 'Database connection failed'];
            }

            // 1. Buscar duplicados basándose en phone_number normalizado
            $duplicates = $this->findDuplicatesByPhoneNumber($inboxId, $accountId);
            
            if (empty($duplicates)) {
                return [
                    'success' => true,
                    'merged' => 0,
                    'message' => 'No se encontraron duplicados',
                    'analyzed' => 0
                ];
            }

            Log::info('🔍 ConversationDeduplicationV2: Duplicados encontrados', [
                'inbox_id' => $inboxId,
                'groups_count' => count($duplicates),
                'total_conversations' => array_sum(array_map('count', $duplicates))
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
                            'messages_moved' => $result['messages_moved']
                        ];
                    } else {
                        $errors[] = "Phone {$phoneNumber}: " . ($result['error'] ?? 'Unknown error');
                    }
                } catch (\Exception $e) {
                    Log::error('❌ ConversationDeduplicationV2: Error fusionando', [
                        'phone' => $phoneNumber,
                        'error' => $e->getMessage()
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
                'message' => "Fusionadas {$mergedCount} conversaciones duplicadas"
            ];

        } catch (\Exception $e) {
            Log::error('❌ ConversationDeduplicationV2: Error general', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Buscar conversaciones duplicadas usando phone_number normalizado
     * Esta es la forma correcta de encontrar duplicados, no por identifier/LID
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
                -- Normalizar phone_number: eliminar +, espacios, guiones
                REGEXP_REPLACE(ct.phone_number, '[^0-9]', '', 'g') as normalized_phone,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
            FROM conversations c
            JOIN contacts ct ON c.contact_id = ct.id
            WHERE c.inbox_id = :inbox_id
              AND c.status != 1  -- No incluir resolved/archived
              AND ct.phone_number IS NOT NULL
              AND ct.phone_number != ''
              -- Excluir grupos
              AND ct.identifier NOT LIKE '%@g.us'
              AND ct.identifier NOT LIKE '%@broadcast'
            ORDER BY ct.phone_number, c.last_activity_at DESC
        ";

        $params = [':inbox_id' => $inboxId];
        
        if ($accountId) {
            $sql = str_replace('WHERE c.inbox_id', 'WHERE c.account_id = :account_id AND c.inbox_id', $sql);
            $params[':account_id'] = $accountId;
        }

        $stmt = $this->connection->prepare($sql);
        $stmt->execute($params);
        $allConversations = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Agrupar por número normalizado
        $groupedByPhone = [];
        
        foreach ($allConversations as $conv) {
            $normalizedPhone = $conv['normalized_phone'];
            
            // Ignorar números muy cortos (probablemente inválidos)
            if (strlen($normalizedPhone) < 8) {
                continue;
            }

            // Crear clave única para deduplicar
            // Usamos los últimos 10 dígitos para manejar diferencias en código de país
            $phoneKey = substr($normalizedPhone, -10);
            
            if (!isset($groupedByPhone[$phoneKey])) {
                $groupedByPhone[$phoneKey] = [];
            }
            $groupedByPhone[$phoneKey][] = $conv;
        }

        // Filtrar solo grupos con duplicados (más de 1 conversación)
        $duplicates = array_filter($groupedByPhone, fn($group) => count($group) > 1);

        return $duplicates;
    }

    /**
     * Fusionar un grupo de conversaciones duplicadas
     * Mantiene la conversación con más mensajes o más reciente
     */
    private function mergeConversationGroup(array $conversations, string $phoneKey): array
    {
        if (count($conversations) < 2) {
            return ['success' => false, 'error' => 'Menos de 2 conversaciones para fusionar'];
        }

        // Ordenar: priorizar por message_count, luego por last_activity_at
        usort($conversations, function($a, $b) {
            // Primero por cantidad de mensajes (descendente)
            $msgDiff = ($b['message_count'] ?? 0) - ($a['message_count'] ?? 0);
            if ($msgDiff !== 0) return $msgDiff;
            
            // Luego por última actividad (más reciente primero)
            return strtotime($b['last_activity_at'] ?? '1970-01-01') - 
                   strtotime($a['last_activity_at'] ?? '1970-01-01');
        });

        // La primera es la que mantenemos
        $toKeep = $conversations[0];
        $toMerge = array_slice($conversations, 1);

        Log::info('🔀 ConversationDeduplicationV2: Iniciando fusión', [
            'phone_key' => $phoneKey,
            'keep' => [
                'conv_id' => $toKeep['conversation_id'],
                'display_id' => $toKeep['display_id'],
                'contact' => $toKeep['contact_name'],
                'messages' => $toKeep['message_count']
            ],
            'merge_count' => count($toMerge)
        ]);

        try {
            $this->connection->beginTransaction();

            $totalMessagesMoved = 0;
            $mergedIds = [];
            $deletedContactIds = [];

            foreach ($toMerge as $mergeConv) {
                $mergeConvId = $mergeConv['conversation_id'];
                $mergeContactId = $mergeConv['contact_id'];
                $mergedIds[] = $mergeConv['display_id'];

                // 1. Mover mensajes a la conversación principal
                $movedCount = $this->moveMessages($mergeConvId, $toKeep['conversation_id']);
                $totalMessagesMoved += $movedCount;

                // 2. Mover attachments (si existen en tabla separada)
                $this->moveAttachments($mergeConvId, $toKeep['conversation_id']);

                // 3. Mover labels de conversación
                $this->moveConversationLabels($mergeConvId, $toKeep['conversation_id']);

                // 4. Actualizar referencias en otras tablas
                $this->updateConversationReferences($mergeConvId, $toKeep['conversation_id']);

                // 5. Eliminar la conversación duplicada
                $this->deleteConversation($mergeConvId);

                // 6. Marcar contacto para potencial eliminación
                if ($mergeContactId != $toKeep['contact_id']) {
                    $deletedContactIds[] = $mergeContactId;
                }

                Log::info('✅ ConversationDeduplicationV2: Conversación fusionada', [
                    'merged_conv_id' => $mergeConvId,
                    'messages_moved' => $movedCount
                ]);
            }

            // 7. Intentar eliminar contactos huérfanos
            foreach ($deletedContactIds as $contactId) {
                $this->tryDeleteOrphanContact($contactId);
            }

            // 8. Actualizar timestamp de la conversación principal
            $this->updateConversationActivity($toKeep['conversation_id']);

            // 9. Recalcular unread_count
            $this->recalculateUnreadCount($toKeep['conversation_id']);

            $this->connection->commit();

            Log::info('✅ ConversationDeduplicationV2: Fusión completada', [
                'phone_key' => $phoneKey,
                'kept_conv_id' => $toKeep['display_id'],
                'merged_count' => count($toMerge),
                'total_messages_moved' => $totalMessagesMoved
            ]);

            return [
                'success' => true,
                'kept_conversation_id' => $toKeep['display_id'],
                'merged_conversation_ids' => $mergedIds,
                'merged_count' => count($toMerge),
                'messages_moved' => $totalMessagesMoved
            ];

        } catch (\Exception $e) {
            $this->connection->rollBack();
            Log::error('❌ ConversationDeduplicationV2: Error en transacción', [
                'phone_key' => $phoneKey,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Mover mensajes de una conversación a otra
     */
    private function moveMessages(int $fromConvId, int $toConvId): int
    {
        $sql = "UPDATE messages SET conversation_id = :to_id WHERE conversation_id = :from_id";
        $stmt = $this->connection->prepare($sql);
        $stmt->execute([':to_id' => $toConvId, ':from_id' => $fromConvId]);
        return $stmt->rowCount();
    }

    /**
     * Mover attachments (Chatwoot puede tener tabla separada)
     */
    private function moveAttachments(int $fromConvId, int $toConvId): void
    {
        // Los attachments en Chatwoot están asociados a messages, no a conversations
        // Por lo que se mueven automáticamente con los mensajes
        // Pero verificamos si existe una tabla de attachments directos
        try {
            $sql = "UPDATE attachments SET record_id = :to_id 
                    WHERE record_type = 'Conversation' AND record_id = :from_id";
            $stmt = $this->connection->prepare($sql);
            $stmt->execute([':to_id' => $toConvId, ':from_id' => $fromConvId]);
        } catch (\Exception $e) {
            // Tabla puede no existir, ignorar
        }
    }

    /**
     * Mover labels de conversación
     */
    private function moveConversationLabels(int $fromConvId, int $toConvId): void
    {
        try {
            // Evitar duplicados: solo insertar labels que no existan en destino
            $sql = "INSERT INTO conversation_labels (conversation_id, label_id, created_at, updated_at)
                    SELECT :to_id, label_id, NOW(), NOW()
                    FROM conversation_labels cl
                    WHERE cl.conversation_id = :from_id
                    AND NOT EXISTS (
                        SELECT 1 FROM conversation_labels cl2 
                        WHERE cl2.conversation_id = :to_id AND cl2.label_id = cl.label_id
                    )";
            $stmt = $this->connection->prepare($sql);
            $stmt->execute([':to_id' => $toConvId, ':from_id' => $fromConvId]);

            // Eliminar labels originales
            $sql = "DELETE FROM conversation_labels WHERE conversation_id = :from_id";
            $stmt = $this->connection->prepare($sql);
            $stmt->execute([':from_id' => $fromConvId]);
        } catch (\Exception $e) {
            // Tabla puede no existir o no tener esa estructura
            Log::debug('ConversationDeduplicationV2: No se pudieron mover labels', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Actualizar referencias en otras tablas que apunten a la conversación
     */
    private function updateConversationReferences(int $fromConvId, int $toConvId): void
    {
        // Tablas que pueden tener referencias a conversation_id
        $tables = [
            'conversation_participants' => 'conversation_id',
            'mentions' => 'conversation_id',
            'notifications' => 'primary_actor_id', // Solo si primary_actor_type = 'Conversation'
        ];

        foreach ($tables as $table => $column) {
            try {
                if ($table === 'notifications') {
                    $sql = "UPDATE {$table} SET {$column} = :to_id 
                            WHERE {$column} = :from_id AND primary_actor_type = 'Conversation'";
                } else {
                    $sql = "UPDATE {$table} SET {$column} = :to_id WHERE {$column} = :from_id";
                }
                $stmt = $this->connection->prepare($sql);
                $stmt->execute([':to_id' => $toConvId, ':from_id' => $fromConvId]);
            } catch (\Exception $e) {
                // Tabla puede no existir, ignorar silenciosamente
            }
        }
    }

    /**
     * Eliminar una conversación
     */
    private function deleteConversation(int $convId): void
    {
        // Primero eliminar dependencias directas
        $dependencyTables = [
            'conversation_participants',
            'conversation_labels', 
            'mentions',
        ];

        foreach ($dependencyTables as $table) {
            try {
                $sql = "DELETE FROM {$table} WHERE conversation_id = :conv_id";
                $stmt = $this->connection->prepare($sql);
                $stmt->execute([':conv_id' => $convId]);
            } catch (\Exception $e) {
                // Ignorar si la tabla no existe
            }
        }

        // Eliminar la conversación
        $sql = "DELETE FROM conversations WHERE id = :conv_id";
        $stmt = $this->connection->prepare($sql);
        $stmt->execute([':conv_id' => $convId]);
    }

    /**
     * Intentar eliminar un contacto huérfano
     * Solo elimina si no tiene más conversaciones ni referencias
     */
    private function tryDeleteOrphanContact(int $contactId): void
    {
        try {
            // Verificar si tiene otras conversaciones
            $sql = "SELECT COUNT(*) FROM conversations WHERE contact_id = :contact_id";
            $stmt = $this->connection->prepare($sql);
            $stmt->execute([':contact_id' => $contactId]);
            $count = $stmt->fetchColumn();

            if ($count > 0) {
                // Tiene otras conversaciones, no eliminar
                return;
            }

            // Verificar contact_inboxes
            $sql = "SELECT COUNT(*) FROM contact_inboxes WHERE contact_id = :contact_id";
            $stmt = $this->connection->prepare($sql);
            $stmt->execute([':contact_id' => $contactId]);
            $inboxCount = $stmt->fetchColumn();

            // Eliminar contact_inboxes primero
            if ($inboxCount > 0) {
                $sql = "DELETE FROM contact_inboxes WHERE contact_id = :contact_id";
                $stmt = $this->connection->prepare($sql);
                $stmt->execute([':contact_id' => $contactId]);
            }

            // Intentar eliminar el contacto
            $sql = "DELETE FROM contacts WHERE id = :contact_id";
            $stmt = $this->connection->prepare($sql);
            $stmt->execute([':contact_id' => $contactId]);

            Log::info('🗑️ ConversationDeduplicationV2: Contacto huérfano eliminado', [
                'contact_id' => $contactId
            ]);

        } catch (\Exception $e) {
            // No es crítico si falla, el contacto queda huérfano pero no causa problemas
            Log::debug('ConversationDeduplicationV2: No se pudo eliminar contacto huérfano', [
                'contact_id' => $contactId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Actualizar last_activity_at de la conversación
     */
    private function updateConversationActivity(int $convId): void
    {
        $sql = "UPDATE conversations 
                SET last_activity_at = (
                    SELECT COALESCE(MAX(created_at), NOW()) 
                    FROM messages 
                    WHERE conversation_id = :conv_id
                ),
                updated_at = NOW()
                WHERE id = :conv_id";
        $stmt = $this->connection->prepare($sql);
        $stmt->execute([':conv_id' => $convId]);
    }

    /**
     * Recalcular unread_count basado en mensajes no leídos reales
     */
    private function recalculateUnreadCount(int $convId): void
    {
        $sql = "UPDATE conversations 
                SET unread_count = (
                    SELECT COUNT(*) 
                    FROM messages 
                    WHERE conversation_id = :conv_id 
                    AND message_type = 0  -- INCOMING
                    AND status != 2       -- No leídos (status != read)
                )
                WHERE id = :conv_id";
        $stmt = $this->connection->prepare($sql);
        $stmt->execute([':conv_id' => $convId]);
    }

    /**
     * Obtener diagnóstico de duplicados sin fusionar
     */
    public function getDuplicatesDiagnosis(int $inboxId, int $accountId = null): array
    {
        try {
            $this->connection = $this->getChatwootConnection();
            
            if (!$this->connection) {
                return ['success' => false, 'error' => 'Database connection failed'];
            }

            $duplicates = $this->findDuplicatesByPhoneNumber($inboxId, $accountId);

            $diagnosis = [];
            foreach ($duplicates as $phoneKey => $conversations) {
                $diagnosis[] = [
                    'phone_key' => $phoneKey,
                    'count' => count($conversations),
                    'conversations' => array_map(function($c) {
                        return [
                            'id' => $c['display_id'],
                            'contact' => $c['contact_name'],
                            'phone' => $c['phone_number'],
                            'identifier' => $c['identifier'],
                            'messages' => $c['message_count'],
                            'last_activity' => $c['last_activity_at'],
                            'status' => $c['status']
                        ];
                    }, $conversations)
                ];
            }

            return [
                'success' => true,
                'inbox_id' => $inboxId,
                'duplicate_groups' => count($duplicates),
                'total_duplicated_conversations' => array_sum(array_map('count', $duplicates)),
                'details' => $diagnosis
            ];

        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Buscar y mapear LIDs a números reales usando Evolution API
     * (Para casos donde necesitamos correlacionar @lid con @s.whatsapp.net)
     */
    public function mapLidsToRealNumbers(int $inboxId): array
    {
        try {
            // Obtener conexión a Evolution DB (si está configurada)
            $evolutionConnection = $this->getEvolutionConnection();
            
            if (!$evolutionConnection) {
                return ['success' => false, 'error' => 'Evolution DB not configured'];
            }

            // Buscar en la tabla IsOnWhatsapp de Evolution
            $sql = "SELECT 
                        \"remoteJid\" as real_number,
                        \"jidOptions\" as lid_info,
                        \"lid\"
                    FROM public.\"IsOnWhatsapp\"
                    WHERE \"lid\" = 'lid' OR \"jidOptions\" LIKE '%@lid%'
                    LIMIT 1000";

            $stmt = $evolutionConnection->prepare($sql);
            $stmt->execute();
            $mappings = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'mappings_count' => count($mappings),
                'mappings' => $mappings
            ];

        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Obtener conexión a Chatwoot DB
     */
    private function getChatwootConnection(): ?\PDO
    {
        try {
            // Intentar usar la conexión de Laravel primero
            $laravelConnection = DB::connection('chatwoot')->getPdo();
            if ($laravelConnection) {
                return $laravelConnection;
            }
        } catch (\Exception $e) {
            Log::debug('ConversationDeduplicationV2: Laravel connection failed, trying direct PDO');
        }

        // Fallback a conexión directa
        try {
            $databaseUrl = env('CHATWOOT_DATABASE_URL');
            
            if ($databaseUrl) {
                $parsed = parse_url($databaseUrl);
                $host = $parsed['host'] ?? 'localhost';
                $port = $parsed['port'] ?? 5432;
                $database = ltrim($parsed['path'] ?? '/chatwoot', '/');
                $username = $parsed['user'] ?? 'postgres';
                $password = urldecode($parsed['pass'] ?? '');
            } else {
                $host = env('CHATWOOT_DB_HOST', 'localhost');
                $port = env('CHATWOOT_DB_PORT', '5432');
                $database = env('CHATWOOT_DB_DATABASE', 'chatwoot');
                $username = env('CHATWOOT_DB_USERNAME', 'postgres');
                $password = env('CHATWOOT_DB_PASSWORD', '');
            }
            
            $pdo = new \PDO(
                "pgsql:host={$host};port={$port};dbname={$database}",
                $username,
                $password,
                [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
            );
            
            return $pdo;
        } catch (\PDOException $e) {
            Log::error('ConversationDeduplicationV2: Database connection failed', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Obtener conexión a Evolution DB (si está disponible)
     */
    private function getEvolutionConnection(): ?\PDO
    {
        try {
            $databaseUrl = env('EVOLUTION_DATABASE_URL');
            
            if (!$databaseUrl) {
                return null;
            }

            $parsed = parse_url($databaseUrl);
            $host = $parsed['host'] ?? 'localhost';
            $port = $parsed['port'] ?? 5432;
            $database = ltrim($parsed['path'] ?? '/evolution', '/');
            $username = $parsed['user'] ?? 'postgres';
            $password = urldecode($parsed['pass'] ?? '');
            
            $pdo = new \PDO(
                "pgsql:host={$host};port={$port};dbname={$database}",
                $username,
                $password,
                [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
            );
            
            return $pdo;
        } catch (\PDOException $e) {
            Log::debug('ConversationDeduplicationV2: Evolution DB connection failed', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
}
