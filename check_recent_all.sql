-- Ver instancias y mensajes recientes
SELECT id, name, "connectionStatus", "updatedAt"
FROM public."Instance" 
ORDER BY "updatedAt" DESC 
LIMIT 5;

-- Ver todos los mensajes de las ultimas 2 horas
SELECT 
    m.id,
    m."key"->>'id' as message_id,
    m."key"->>'remoteJid' as remote_jid,
    m."key"->>'fromMe' as from_me,
    m."chatwootMessageId",
    m."messageTimestamp",
    to_timestamp(m."messageTimestamp") as message_time,
    m."pushName"
FROM public."Message" m
WHERE m."messageTimestamp" > EXTRACT(EPOCH FROM NOW() - INTERVAL '2 hours')
ORDER BY m."messageTimestamp" DESC
LIMIT 20;
