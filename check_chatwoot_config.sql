-- Verificar la configuración de Chatwoot en Evolution
SELECT 
    i.name as instance_name,
    i."connectionStatus",
    c."enabled" as chatwoot_enabled,
    c."accountId",
    c."url" as chatwoot_url,
    c."signMsg",
    c."reopenConversation",
    c."conversationPending"
FROM public."Instance" i
LEFT JOIN public."Chatwoot" c ON c."instanceId" = i.id
WHERE i.name = 'withmia-evp7rj';
