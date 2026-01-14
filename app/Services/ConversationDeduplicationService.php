<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ConversationDeduplicationService
{
    /**
     * Fusionar automáticamente conversaciones duplicadas en la base de datos de Chatwoot
     * Busca pares de conversaciones donde una tiene @lid y otra @s.whatsapp.net del mismo número
     */
    public function autoMergeDuplicates(int $inboxId): array
    {
        try {
            // Configuración de la conexión a Chatwoot PostgreSQL
            $chatwootConnection = $this->getChatwootConnection();
            
            if (!$chatwootConnection) {
                Log::error('❌ No se pudo conectar a la base de datos de Chatwoot');
                return ['success' => false, 'error' => 'Database connection failed'];
            }

            // Buscar duplicados
            $duplicates = $this->findDuplicates($chatwootConnection, $inboxId);
            
            if (empty($duplicates)) {
                return ['success' => true, 'merged' => 0, 'message' => 'No duplicates found'];
            }

            Log::info('🔍 Duplicados encontrados', ['count' => count($duplicates)]);

            $mergedCount = 0;
            $errors = [];

            foreach ($duplicates as $phone => $conversations) {
                try {
                    $result = $this->mergeDuplicateConversations($chatwootConnection, $conversations, $phone);
                    if ($result['success']) {
                        $mergedCount++;
                    } else {
                        $errors[] = $result['error'];
                    }
                } catch (\Exception $e) {
                    Log::error('❌ Error fusionando conversaciones', [
                        'phone' => $phone,
                        'error' => $e->getMessage()
                    ]);
                    $errors[] = "Phone {$phone}: " . $e->getMessage();
                }
            }

            return [
                'success' => true,
                'merged' => $mergedCount,
                'errors' => $errors,
                'message' => "Fusionadas {$mergedCount} conversaciones duplicadas"
            ];

        } catch (\Exception $e) {
            Log::error('❌ Error en autoMergeDuplicates', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Buscar conversaciones duplicadas
     */
    private function findDuplicates($connection, int $inboxId): array
    {
        $sql = "SELECT 
                    ct.id as contact_id, 
                    ct.name, 
                    ct.phone_number, 
                    ct.identifier,
                    c.id as conversation_id,
                    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
                FROM contacts ct
                JOIN conversations c ON c.contact_id = ct.id
                WHERE c.inbox_id = :inbox_id
                AND (ct.identifier LIKE '%@lid%' OR ct.identifier LIKE '%@s.whatsapp.net%')
                ORDER BY ct.identifier";

        $stmt = $connection->prepare($sql);
        $stmt->execute([':inbox_id' => $inboxId]);
        $allContacts = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Agrupar por número base
        $groupedByPhone = [];
        
        foreach ($allContacts as $contact) {
            $phoneBase = $this->extractPhoneBase($contact['identifier']);
            
            if (!empty($phoneBase)) {
                if (!isset($groupedByPhone[$phoneBase])) {
                    $groupedByPhone[$phoneBase] = [];
                }
                $groupedByPhone[$phoneBase][] = $contact;
            }
        }

        // Filtrar solo duplicados (más de 1 conversación por número)
        $duplicates = [];
        foreach ($groupedByPhone as $phone => $contacts) {
            if (count($contacts) > 1) {
                // Verificar que haya al menos un @s.whatsapp.net y un @lid
                $hasRealNumber = false;
                $hasLid = false;
                
                foreach ($contacts as $contact) {
                    if (strpos($contact['identifier'], '@s.whatsapp.net') !== false) {
                        $hasRealNumber = true;
                    }
                    if (strpos($contact['identifier'], '@lid') !== false) {
                        $hasLid = true;
                    }
                }
                
                if ($hasRealNumber && $hasLid) {
                    $duplicates[$phone] = $contacts;
                }
            }
        }

        return $duplicates;
    }

    /**
     * Fusionar un conjunto de conversaciones duplicadas
     */
    private function mergeDuplicateConversations($connection, array $conversations, string $phone): array
    {
        // Determinar cuál mantener (priorizar @s.whatsapp.net)
        $toKeep = null;
        $toMerge = [];

        foreach ($conversations as $conv) {
            if (strpos($conv['identifier'], '@s.whatsapp.net') !== false && !$toKeep) {
                $toKeep = $conv;
            } else {
                $toMerge[] = $conv;
            }
        }

        if (!$toKeep || empty($toMerge)) {
            return ['success' => false, 'error' => 'No suitable conversations to merge'];
        }

        Log::info('🔀 Iniciando fusión automática', [
            'phone' => $phone,
            'keep_conv_id' => $toKeep['conversation_id'],
            'merge_conv_ids' => array_column($toMerge, 'conversation_id')
        ]);

        try {
            $connection->beginTransaction();

            $totalMessagesMoved = 0;

            foreach ($toMerge as $mergeConv) {
                // 1. Mover mensajes
                $updateMessages = "UPDATE messages 
                                  SET conversation_id = :keep_id 
                                  WHERE conversation_id = :merge_id";
                $stmt = $connection->prepare($updateMessages);
                $stmt->execute([
                    ':keep_id' => $toKeep['conversation_id'],
                    ':merge_id' => $mergeConv['conversation_id']
                ]);
                $movedCount = $stmt->rowCount();
                $totalMessagesMoved += $movedCount;

                // 2. Eliminar contact_inbox del contacto a fusionar
                $deleteContactInbox = "DELETE FROM contact_inboxes WHERE contact_id = :contact_id";
                $stmt = $connection->prepare($deleteContactInbox);
                $stmt->execute([':contact_id' => $mergeConv['contact_id']]);

                // 3. Eliminar conversación duplicada
                $deleteConversation = "DELETE FROM conversations WHERE id = :conv_id";
                $stmt = $connection->prepare($deleteConversation);
                $stmt->execute([':conv_id' => $mergeConv['conversation_id']]);

                // 4. Eliminar contacto duplicado
                $deleteContact = "DELETE FROM contacts WHERE id = :contact_id";
                $stmt = $connection->prepare($deleteContact);
                $stmt->execute([':contact_id' => $mergeConv['contact_id']]);

                Log::info('✅ Conversación fusionada', [
                    'merged_conv_id' => $mergeConv['conversation_id'],
                    'messages_moved' => $movedCount
                ]);
            }

            // 5. Actualizar last_activity_at de la conversación principal
            $updateActivity = "UPDATE conversations 
                              SET last_activity_at = (
                                  SELECT MAX(created_at) FROM messages WHERE conversation_id = :conv_id
                              )
                              WHERE id = :conv_id";
            $stmt = $connection->prepare($updateActivity);
            $stmt->execute([':conv_id' => $toKeep['conversation_id']]);

            $connection->commit();

            Log::info('✅ Fusión completada exitosamente', [
                'phone' => $phone,
                'final_conv_id' => $toKeep['conversation_id'],
                'total_messages_moved' => $totalMessagesMoved
            ]);

            return [
                'success' => true,
                'kept_conversation_id' => $toKeep['conversation_id'],
                'merged_count' => count($toMerge),
                'messages_moved' => $totalMessagesMoved
            ];

        } catch (\Exception $e) {
            $connection->rollBack();
            Log::error('❌ Error durante fusión', [
                'phone' => $phone,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Extraer número base del identifier
     */
    private function extractPhoneBase(string $identifier): string
    {
        if (strpos($identifier, '@s.whatsapp.net') !== false) {
            return str_replace('@s.whatsapp.net', '', $identifier);
        } elseif (strpos($identifier, '@lid') !== false) {
            $phoneBase = preg_replace('/@lid.*$/', '', $identifier);
            return preg_replace('/:\d+$/', '', $phoneBase);
        }
        return '';
    }

    /**
     * Obtener conexión a la base de datos de Chatwoot
     */
    private function getChatwootConnection(): ?\PDO
    {
        try {
            // Usar CHATWOOT_DATABASE_URL si está disponible
            $databaseUrl = env('CHATWOOT_DATABASE_URL');
            
            if ($databaseUrl) {
                $parsed = parse_url($databaseUrl);
                $host = $parsed['host'] ?? 'localhost';
                $port = $parsed['port'] ?? 5432;
                $database = ltrim($parsed['path'] ?? '/chatwoot', '/');
                $username = $parsed['user'] ?? 'postgres';
                $password = $parsed['pass'] ?? '';
            } else {
                // Fallback a variables individuales
                $host = env('CHATWOOT_DB_HOST', 'localhost');
                $port = env('CHATWOOT_DB_PORT', '5432');
                $database = env('CHATWOOT_DB_DATABASE', 'chatwoot');
                $username = env('CHATWOOT_DB_USERNAME', 'postgres');
                $password = env('CHATWOOT_DB_PASSWORD', '');
            }
            
            $pdo = new \PDO(
                "pgsql:host={$host};port={$port};dbname={$database}",
                $username,
                $password
            );
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            return $pdo;
        } catch (\PDOException $e) {
            Log::error('Error conectando a Chatwoot DB', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
