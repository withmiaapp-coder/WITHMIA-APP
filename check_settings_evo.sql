-- Ver configuración de Settings de la instancia (puede tener opciones de LID)
SELECT 
    s.*
FROM "Setting" s
WHERE s."instanceId" = '92fcf960-e6bd-4cd4-a610-7584ec5cbc14';
