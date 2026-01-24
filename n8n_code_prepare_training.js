// Extract training data from webhook
const body = $input.first().json.body || $input.first().json;

// Función para asegurar que el texto es UTF-8 válido
function ensureUTF8(str) {
  if (!str) return '';
  // Si el string ya es válido, devolverlo tal cual
  try {
    // Intentar decodificar como UTF-8
    return decodeURIComponent(encodeURIComponent(str));
  } catch (e) {
    // Si falla, intentar limpiar caracteres inválidos
    return str.replace(/[\uFFFD\uFFFE\uFFFF]/g, '');
  }
}

const companySlug = body.company_slug || 'default';
const assistantName = ensureUTF8(body.assistant_name) || 'MIA';
const companyName = ensureUTF8(body.company_name) || 'la empresa';
const userMessage = ensureUTF8(body.user_message) || '';
const conversationHistory = body.conversation_history || body.context || [];
const openaiApiKey = body.openai_api_key || '';
const qdrantHost = body.qdrant_host || 'https://qdrant-production-f4e7.up.railway.app';
const timestamp = new Date().toISOString();

// Información de deduplicación desde Laravel
const deduplication = body.deduplication || null;

const collectionName = 'company_' + companySlug + '_knowledge';

const systemPrompt = `Eres ${assistantName}, el asistente de entrenamiento de ${companyName}.

Tu rol es:
1. Ayudar al usuario a entrenar y mejorar el bot de la empresa
2. Entender ejemplos de conversaciones que te den
3. Aprender correcciones sobre cómo deberías responder
4. Registrar información importante sobre la empresa y sus clientes

Cuando el usuario te de un ejemplo o corrección:
- Confirma que lo has entendido
- Muestra cómo responderías en esa situación
- Pregunta si hay más ejemplos o información

Sé amigable, profesional y muestra que estás aprendiendo.`;

return {
  json: {
    company_slug: companySlug,
    assistant_name: assistantName,
    company_name: companyName,
    user_message: userMessage,
    conversation_history: conversationHistory,
    collection_name: collectionName,
    openai_api_key: openaiApiKey,
    qdrant_host: qdrantHost,
    timestamp: timestamp,
    system_prompt: systemPrompt,
    deduplication: deduplication
  }
};
