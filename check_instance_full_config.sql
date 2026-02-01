-- Ver la configuración de la instancia con todos los settings
SELECT 
    i.name,
    i."connectionStatus",
    s."rejectCall",
    s."msgCall",
    s."groupsIgnore",
    s."alwaysOnline",
    s."readMessages",
    s."readStatus",
    s."syncFullHistory",
    w."enabled" as webhook_enabled,
    w."url" as webhook_url,
    w."webhookByEvents",
    w."events" as webhook_events
FROM public."Instance" i
LEFT JOIN public."Setting" s ON s."instanceId" = i.id
LEFT JOIN public."Webhook" w ON w."instanceId" = i.id
WHERE i.name = 'withmia-evp7rj';
