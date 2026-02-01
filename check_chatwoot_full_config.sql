-- Ver la configuración completa de Chatwoot en Evolution
SELECT *
FROM public."Chatwoot"
WHERE "instanceId" = (SELECT id FROM public."Instance" WHERE name = 'withmia-evp7rj');
