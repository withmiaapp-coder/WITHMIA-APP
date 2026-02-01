-- Buscar el mensaje de prueba en Evolution
SELECT 
    id,
    "key"::text as key_data,
    "chatwootMessageId",
    "chatwootConversationId",
    "messageTimestamp"
FROM public."Message" 
WHERE message::text LIKE '%Mensaje de prueba desde el celular%' 
LIMIT 1;
