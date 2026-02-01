-- Ver todos los datos de la instancia
SELECT 
    id,
    name,
    "ownerJid",
    "number",
    "profileName",
    "connectionStatus",
    "integration"
FROM public."Instance"
WHERE name = 'withmia-evp7rj';
