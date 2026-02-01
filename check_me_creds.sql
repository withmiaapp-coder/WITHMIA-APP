-- Extraer los datos del me de las credenciales de la sesión
SELECT 
    "sessionId",
    creds::jsonb->'me'->>'id' as me_id,
    creds::jsonb->'me'->>'lid' as me_lid,
    creds::jsonb->'me'->>'name' as me_name
FROM public."Session"
WHERE "sessionId" = 'b73b89c5-a039-47ab-abf1-db367357151a';
