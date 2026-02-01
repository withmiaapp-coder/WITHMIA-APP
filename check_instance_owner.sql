-- Verificar el número propietario de la instancia
SELECT 
    name,
    "ownerJid",
    "connectionStatus",
    "number"
FROM public."Instance"
WHERE name = 'withmia-evp7rj';
