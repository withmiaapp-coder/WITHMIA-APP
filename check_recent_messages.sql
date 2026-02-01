-- Ver los últimos 10 mensajes en Evolution para analizar el patrón
SELECT 
    id,
    "key"->>'fromMe' as from_me,
    "key"->>'remoteJid' as remote_jid,
    "key"->>'remoteJidAlt' as remote_jid_alt,
    "key"->>'addressingMode' as addressing_mode,
    "chatwootMessageId",
    "chatwootConversationId",
    "pushName",
    substring(message::text, 1, 100) as message_preview,
    to_timestamp("messageTimestamp") as timestamp
FROM public."Message" 
WHERE "instanceId" = (SELECT id FROM public."Instance" WHERE name = 'withmia-evp7rj' LIMIT 1)
ORDER BY "messageTimestamp" DESC 
LIMIT 15;
