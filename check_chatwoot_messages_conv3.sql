-- Ver mensajes recientes en Chatwoot para conversación 3
SELECT 
    m.id,
    m.conversation_id,
    m.message_type,
    m.content,
    m.source_id,
    m.created_at,
    m.inbox_id
FROM messages m
WHERE m.conversation_id = 3
ORDER BY m.created_at DESC
LIMIT 20;
