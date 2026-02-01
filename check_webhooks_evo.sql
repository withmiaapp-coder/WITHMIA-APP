-- Ver webhooks configurados para la instancia
SELECT 
    w.*
FROM "Webhook" w
WHERE w."instanceId" = '92fcf960-e6bd-4cd4-a610-7584ec5cbc14';
