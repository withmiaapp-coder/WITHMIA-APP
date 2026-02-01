-- Actualizar configuración de Chatwoot para sincronización completa
UPDATE public."Chatwoot"
SET 
    "importMessages" = true,
    "importContacts" = true,
    "reopenConversation" = true,
    "signMsg" = false,
    "daysLimitImportMessages" = 30,
    "updatedAt" = NOW()
WHERE "instanceId" = (SELECT id FROM public."Instance" WHERE name = 'withmia-evp7rj');

-- Verificar el cambio
SELECT 
    "enabled",
    "importMessages",
    "importContacts", 
    "reopenConversation",
    "daysLimitImportMessages",
    "signMsg"
FROM public."Chatwoot"
WHERE "instanceId" = (SELECT id FROM public."Instance" WHERE name = 'withmia-evp7rj');
