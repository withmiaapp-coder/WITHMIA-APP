-- Verificar la tabla IsOnWhatsapp para ver el mapeo entre números y LIDs
SELECT * FROM public."IsOnWhatsapp"
WHERE "remoteJid" LIKE '%56956333446%' 
   OR "remoteJid" LIKE '%254065099419655%'
   OR "jidOptions" LIKE '%56956333446%'
   OR "jidOptions" LIKE '%254065099419655%'
LIMIT 10;
