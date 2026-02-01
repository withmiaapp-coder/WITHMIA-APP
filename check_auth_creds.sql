-- Ver los datos de autenticación de la sesión
SELECT 
    i.name,
    i."ownerJid",
    a.id as auth_id,
    a.creds->>'me' as me_data,
    a.creds->'me'->>'id' as connected_jid,
    a.creds->'me'->>'lid' as connected_lid,
    a.creds->'me'->>'name' as connected_name
FROM public."Instance" i
LEFT JOIN public."Auth" a ON a."instanceId" = i.id
WHERE i.name = 'withmia-evp7rj';
