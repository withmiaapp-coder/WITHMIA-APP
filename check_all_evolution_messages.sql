-- Ver TODOS los mensajes recientes en Evolution incluyendo imágenes
SELECT 
    id,
    "key"->>'fromMe' as from_me,
    "key"->>'remoteJid' as remote_jid,
    "key"->>'addressingMode' as addr_mode,
    "messageType",
    "chatwootMessageId",
    to_timestamp("messageTimestamp") as timestamp
FROM public."Message" 
WHERE "instanceId" = (SELECT id FROM public."Instance" WHERE name = 'withmia-evp7rj' LIMIT 1)
ORDER BY "messageTimestamp" DESC 
LIMIT 25;
