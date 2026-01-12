# 📁 Workflows n8n - WITHMIA SaaS

Workflows predefinidos para n8n optimizados para la arquitectura Railway.

---

## 📂 Estructura de Archivos

```
workflows/
├── README.md (este archivo)
├── whatsapp-bot-updated.json (WhatsApp AI Agent - actualizado)
├── rag-documents-updated.json (RAG con Qdrant - actualizado)
├── whatsapp-mia-original.json (backup original)
└── bbdd-mia-original.json (backup original)
```

---

## 🤖 1. WhatsApp AI Agent (`whatsapp-bot-updated.json`)

**Función:** Bot conversacional MIA® para WhatsApp con todas las capacidades empresariales

**Arquitectura completa:**
- 47 nodos funcionales
- 30 sticky notes de documentación
- Procesamiento multi-formato (texto, audio, imagen)
- Sistema de memoria conversacional distribuida
- RAG con búsqueda semántica
- Catálogo de productos en tiempo real
- Control de flujo conversacional

**Características principales:**
- ✅ **Multi-formato**: Procesa texto, audio (Whisper) e imágenes (GPT-4o-mini Vision)
- ✅ **AI Agent**: GPT-4o-mini con prompt completo de MIA®
- ✅ **Memoria dual**: Redis temporal (7s typing) + Buffer conversacional (20 mensajes)
- ✅ **RAG con Qdrant**: Búsqueda semántica en base de conocimientos (15 resultados, threshold 0.7)
- ✅ **Google Sheets**: Catálogo de productos en tiempo real
- ✅ **División inteligente**: Mensajes largos divididos en 2-3 partes naturales (max 100 chars)
- ✅ **Control de flujo**: Sistema de bloqueo/activación con palabra clave "BOT"
- ✅ **Solicitud de humano**: Cliente puede pedir hablar con persona real
- ✅ **Anti-spam**: Cooldown de 10 minutos después de bloqueo
- ✅ **Filtros**: Ignora grupos y mensajes vacíos
- ✅ **Validación**: Solo responde cuando el último mensaje procesado coincide

**Flujo de procesamiento:**
1. Webhook Evolution API → Normalización
2. Control de acceso (¿Es del bot? ¿Está bloqueado?)
3. Clasificación por tipo (audio/imagen/texto)
4. Procesamiento específico:
   - Audio: Base64 → Binary → Whisper → Transcripción
   - Imagen: Base64 → Binary → GPT-4o-mini Vision → Descripción
   - Texto: Directo
5. Unificación a formato de chat
6. Acumulación en Redis (7 segundos - simula typing)
7. Validación de último mensaje
8. Limpieza de memoria temporal
9. AI Agent con herramientas:
   - Buscar en Qdrant (RAG)
   - Info Products (Google Sheets)
   - Send Image (Google Drive)
   - Bloqueo a Humano
   - Think (mejora redacción)
   - Humanizador (naturalidad)
10. División inteligente de respuesta (GPT-4o-mini)
11. Envío escalonado (0s → 2s → 4s)

**Variables de entorno necesarias:**
```bash
# Ya configuradas en n8n Railway
EVOLUTION_API_URL=http://evolution-api.railway.internal
QDRANT_URL=http://qdrant.railway.internal:6333
REDIS_HOST=redis.railway.internal
REDIS_PORT=6379
REDIS_PASSWORD=<from Railway>
```

**Credenciales necesarias en n8n:**
- OpenAI API (GPT-4)
- Cohere API (embeddings)
- Redis
- Google Sheets (opcional - para productos)

**Webhook URL:**
```
https://n8n-production-5f6d.up.railway.app/webhook/whatsapp-mia
```

**Configurar en Evolution API:**
```bash
WEBHOOK_GLOBAL_URL=https://n8n-production-5f6d.up.railway.app/webhook/whatsapp-mia
```

---

## 📄 2. RAG Documents Processor (`rag-documents-updated.json`)

**Función:** Procesar documentos PDF/DOCX → generar embeddings → almacenar en Qdrant

**Características:**
- ✅ Trigger desde Google Drive o upload directo
- ✅ Extracción de texto de PDFs/DOCX
- ✅ Chunking inteligente (500 tokens)
- ✅ Generación de embeddings (Cohere multilingual)
- ✅ Almacenamiento en Qdrant
- ✅ Notificación a Laravel con vector IDs

**Variables de entorno necesarias:**
```bash
QDRANT_URL=http://qdrant.railway.internal:6333
LARAVEL_API_URL=https://mia-app-production.up.railway.app
```

**Credenciales necesarias en n8n:**
- Google Drive OAuth2 (para trigger)
- Cohere API (embeddings)
- Qdrant API

**Webhook para Laravel:**
```
POST https://mia-app-production.up.railway.app/api/knowledge/update-vector-ids
```

**Payload:**
```json
{
  "company_id": 1,
  "filename": "documento.pdf",
  "vector_ids": ["uuid1", "uuid2", ...],
  "chunks_created": 15,
  "secret_token": "withmia_n8n_secret_2024"
}
```

---

## 🚀 Importar Workflows en n8n

### ⭐ Método 1: Script PowerShell Automatizado (RECOMENDADO)

```powershell
cd workflows
.\import-to-n8n.ps1
```

**Características del script:**
- ✅ Lista workflows existentes en n8n
- ✅ Importa RAG workflow automáticamente
- ✅ Importa WhatsApp workflow automáticamente
- ✅ Opción para importar ambos de una vez
- ✅ Activa workflows después de importar
- ✅ Maneja errores y muestra detalles

**Configuración:**
- URL n8n: https://n8n-production-8f14.up.railway.app
- API Key: Configurada en variable `N8N_API_KEY` (Railway)
- Headers: `X-N8N-API-KEY: [token JWT]`

---

### Método 2: Dashboard n8n
1. Ir a https://n8n-production-8f14.up.railway.app
2. Login: `automatiza@withmia.com` / `Thebulldog.1650`
3. Click en **"+"** → **"Import from File"**
4. Seleccionar `whatsapp-bot-updated.json` o `rag-documents-updated.json`
5. Configurar credenciales (OpenAI, Cohere, Redis, etc.)
6. Activar workflow

---

### Método 3: n8n API REST (desde Laravel o cURL)

**Listar workflows:**
```bash
curl -X GET https://n8n-production-8f14.up.railway.app/api/v1/workflows \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

**Importar workflow:**
```bash
curl -X POST https://n8n-production-8f14.up.railway.app/api/v1/workflows \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @whatsapp-bot-updated.json
```

**Activar workflow:**
```bash
curl -X PATCH https://n8n-production-8f14.up.railway.app/api/v1/workflows/{id} \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": true}'
```

**Desde Laravel:**
```php
use Illuminate\Support\Facades\Http;

$workflowJson = file_get_contents(
    base_path('workflows/whatsapp-bot-updated.json')
);

$response = Http::withHeaders([
    'X-N8N-API-KEY' => env('N8N_API_KEY')
])->post(env('N8N_URL') . '/api/v1/workflows', 
    json_decode($workflowJson, true)
);

if ($response->successful()) {
    $workflowId = $response->json('id');
    
    // Activar workflow
    Http::withHeaders([
        'X-N8N-API-KEY' => env('N8N_API_KEY')
    ])->patch(env('N8N_URL') . "/api/v1/workflows/{$workflowId}", [
        'active' => true
    ]);
}
```

---

## 🔧 Personalización por Empresa

Cuando creas una instancia para una empresa, personaliza:

**WhatsApp Bot:**
```json
{
  "webhook_path": "whatsapp-company-{company_id}",
  "qdrant_collection": "company_{company_id}_knowledge",
  "redis_keys": "company_{company_id}_*",
  "session_key": "company_{company_id}_{{ chat_id }}"
}
```

**RAG Documents:**
```json
{
  "qdrant_collection": "company_{company_id}_knowledge",
  "company_id": "{company_id}",
  "google_drive_folder": "{folder_id_específico}"
}
```

---

## 📊 Monitoreo y Logs

**Ver ejecuciones en n8n:**
```
https://n8n-production-5f6d.up.railway.app/executions
```

**Logs de Laravel:**
```bash
railway logs --service mia-app | grep "n8n"
```

**Logs de n8n:**
```bash
railway logs --service n8n
```

---

## 🔄 Actualizar Workflows Existentes

Si ya tienes workflows importados:

1. Exportar workflow actual desde n8n
2. Comparar con versión actualizada
3. Actualizar URLs/credenciales manualmente
4. Reimportar o editar en n8n directamente

---

## 🆘 Troubleshooting

### Error: "Webhook not found"
- Verifica que el workflow esté **activado** en n8n
- Revisa que la URL del webhook coincida exactamente

### Error: "Qdrant connection failed"
- Verifica: `http://qdrant.railway.internal:6333`
- No uses URLs públicas dentro de Railway (usa `.railway.internal`)

### Error: "Redis ECONNREFUSED"
- Credenciales Redis deben estar configuradas en n8n
- Host: `redis.railway.internal:6379`

### Error: "OpenAI API key invalid"
- Configura credencial OpenAI en n8n Settings → Credentials
- Usa API key válida con créditos

---

## 📝 Notas Importantes

1. **NO usar URLs públicas** dentro de workflows cuando estás en Railway → usar `*.railway.internal`
2. **Siempre** guardar cambios antes de ejecutar workflows
3. **Credenciales** se configuran por separado en n8n (no en el JSON)
4. **Webhooks** deben estar activos (workflow debe estar "Active")
5. **Backups originales** están en `*-original.json` → NO MODIFICAR

---

## 🎯 Próximos Workflows a Crear

- [ ] Email → Chatwoot (recibir emails en Chatwoot)
- [ ] Automated Reports (generar reportes automáticos)
- [ ] Lead Scoring (puntuar leads automáticamente)
- [ ] Campaign Triggers (disparar campañas según eventos)

---

**Última actualización:** 11 de enero de 2026
