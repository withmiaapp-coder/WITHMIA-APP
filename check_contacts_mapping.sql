-- Verificar la tabla de contactos en Evolution para ver el mapeo LID
SELECT 
    id,
    "remoteJid",
    "pushName",
    "profilePicUrl" IS NOT NULL as has_pic,
    "createdAt"
FROM public."Contact"
WHERE "instanceId" = (SELECT id FROM public."Instance" WHERE name = 'withmia-evp7rj' LIMIT 1)
  AND ("remoteJid" LIKE '%56956333446%' OR "remoteJid" LIKE '%254065099419655%' OR "remoteJid" LIKE '%56940233053%')
ORDER BY "createdAt" DESC;
