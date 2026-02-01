-- Verificar los últimos mensajes en Chatwoot para la conversación con 56956333446
SELECT 
    m.id,
    m.content,
    m.message_type, -- 0=incoming, 1=outgoing
    m.created_at,
    m.source_id,
    c.identifier as contact_identifier
FROM messages m
JOIN conversations conv ON m.conversation_id = conv.id
JOIN contacts c ON conv.contact_id = c.id
WHERE c.identifier LIKE '%56956333446%'
   OR c.phone_number LIKE '%56956333446%'
ORDER BY m.created_at DESC
LIMIT 20;
