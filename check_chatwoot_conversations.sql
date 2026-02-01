-- Verificar conversaciones en Chatwoot para el número 56956333446
SELECT 
    conv.id as conversation_id,
    conv.status,
    conv.created_at,
    conv.last_activity_at,
    cont.phone_number,
    cont.identifier,
    cont.name as contact_name,
    inbox.name as inbox_name
FROM conversations conv
JOIN contacts cont ON conv.contact_id = cont.id
JOIN inboxes inbox ON conv.inbox_id = inbox.id
WHERE cont.phone_number LIKE '%56956333446%' 
   OR cont.identifier LIKE '%56956333446%'
   OR cont.identifier LIKE '%254065099419655%'
ORDER BY conv.last_activity_at DESC
LIMIT 10;
