-- Buscar dónde aparece el número 56956333446 en Evolution
-- Verificar si está registrado como ownerJid en alguna instancia
SELECT 'Instance' as tabla, name, "ownerJid", "number"
FROM public."Instance"
WHERE "ownerJid" LIKE '%56956333446%' OR "number" LIKE '%56956333446%';
