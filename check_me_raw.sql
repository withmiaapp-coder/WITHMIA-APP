-- Extraer los datos del me de las credenciales sin parsear el JSON
SELECT 
    "sessionId",
    substring(creds::text from '"me":\s*\{[^}]+\}') as me_data
FROM public."Session"
WHERE "sessionId" = 'b73b89c5-a039-47ab-abf1-db367357151a';
