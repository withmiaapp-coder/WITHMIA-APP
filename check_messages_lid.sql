-- Verificar últimos mensajes con detalles de LID
SELECT 
    m.id,
    m.key->>'remoteJid' as remote_jid,
    m.key->>'fromMe' as from_me,
    m.key->>'id' as msg_id,
    m."chatwootMessageId",
    m."chatwootConversationId",
    m."messageType",
    to_timestamp(m."messageTimestamp") as timestamp_readable,
    m.message->>'conversation' as text_msg,
    m.message->'extendedTextMessage'->>'text' as extended_text,
    m.participant,
    m.source
FROM "Message" m
WHERE m."instanceId" = '92fcf960-e6bd-4cd4-a610-7584ec5cbc14'
ORDER BY m."messageTimestamp" DESC 
LIMIT 20;
