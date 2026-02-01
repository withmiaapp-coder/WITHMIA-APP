-- Ver TODOS los registros en IsOnWhatsapp para encontrar el LID del owner
SELECT * FROM public."IsOnWhatsapp"
WHERE "remoteJid" LIKE '%56940233053%' 
   OR "jidOptions" LIKE '%56940233053%'
LIMIT 10;
