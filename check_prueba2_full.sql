-- Ver el mensaje completo para entender la estructura
SELECT 
    m."key",
    m."message",
    m."chatwootMessageId",
    m."chatwootConversationId",
    m."chatwootInboxId"
FROM public."Message" m
WHERE m."key"->>'id' = 'A5DE27C24AD07FA9DD83EA0A5959B38C';
