-- Ver contactos en Evolution para esta instancia
SELECT 
    c.id,
    c."remoteJid",
    c."pushName",
    c."profilePicUrl",
    c."createdAt"
FROM "Contact" c
WHERE c."instanceId" = '92fcf960-e6bd-4cd4-a610-7584ec5cbc14'
ORDER BY c."createdAt" DESC
LIMIT 20;
