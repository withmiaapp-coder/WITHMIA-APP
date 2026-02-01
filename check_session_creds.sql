-- Ver la sesión de la instancia - puede tener los datos de autenticación
SELECT 
    s.id,
    s."sessionId",
    s.creds::text as credentials
FROM public."Session" s
WHERE s."sessionId" LIKE '%withmia-evp7rj%'
LIMIT 1;
