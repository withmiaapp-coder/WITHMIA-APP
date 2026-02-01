-- Ver todos los IsOnWhatsapp con LID
SELECT 
    "remoteJid",
    "jidOptions",
    "lid"
FROM public."IsOnWhatsapp"
WHERE "lid" = 'lid' OR "jidOptions" LIKE '%@lid%'
ORDER BY "updatedAt" DESC
LIMIT 20;
