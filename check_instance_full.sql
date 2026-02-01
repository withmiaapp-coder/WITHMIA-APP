-- Verificar todos los datos de la instancia para encontrar el número real conectado
SELECT 
    name,
    "ownerJid",
    "connectionStatus",
    "number",
    "profileName",
    "profilePicUrl",
    "integration",
    "createdAt",
    "updatedAt"
FROM public."Instance"
WHERE name = 'withmia-evp7rj';
