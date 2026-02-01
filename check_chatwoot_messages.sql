-- Verificar los últimos mensajes en la conversación 3 de Chatwoot
SELECT 
    m.id,
    m.content,
    m.message_type, -- 0=incoming, 1=outgoing
    m.status,
    m.source_id,
    m.created_at,
    m.sender_type
FROM messages m
WHERE m.conversation_id = 3
ORDER BY m.created_at DESC
LIMIT 15;
