-- Buscar el mensaje "Prueba 2" en Evolution
SELECT 
    m.id,
    m."key"->>'id' as message_id,
    m."key"->>'remoteJid' as remote_jid,
    m."key"->>'fromMe' as from_me,
    m."key"->>'addressingMode' as addressing_mode,
    m."chatwootMessageId",
    m."chatwootConversationId",
    m."messageTimestamp",
    m."pushName",
    CASE 
        WHEN m.message::text LIKE '%Prueba 2%' THEN 'Prueba 2'
        ELSE LEFT(m.message::text, 100)
    END as message_preview
FROM public."Message" m
WHERE m."instanceId" = 'b73b89c5-a039-47ab-abf1-db367357151a'
ORDER BY m."messageTimestamp" DESC
LIMIT 10;
