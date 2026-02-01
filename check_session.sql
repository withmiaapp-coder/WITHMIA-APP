-- Verificar la sesión/auth de la instancia
SELECT 
    i.name,
    i."ownerJid",
    i."connectionStatus",
    i."profileName",
    a."creds"::text as credentials_sample
FROM public."Instance" i
LEFT JOIN public."Auth" a ON a."instanceId" = i.id
WHERE i.name = 'withmia-evp7rj';
