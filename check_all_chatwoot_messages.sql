-- Ver TODOS los mensajes de la conversación 3 en Chatwoot
SELECT 
    m.id,
    LEFT(m.content, 60) as content,
    m.message_type,
    m.content_type,
    m.created_at
FROM messages m
WHERE m.conversation_id = 3
ORDER BY m.created_at DESC
LIMIT 30;
