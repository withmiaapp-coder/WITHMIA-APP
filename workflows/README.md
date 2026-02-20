# 📁 Workflows n8n - WITHMIA SaaS

Workflows predefinidos para n8n, desplegados automáticamente desde Laravel (`N8nService`).

---

## 📂 Estructura de Archivos

```
workflows/
├── README.md                      (este archivo)
├── withmia-bot-template.json      (Bot WhatsApp AI Agent — template principal)
├── training-chat.json             (Chat de entrenamiento RAG)
└── rag-text-processor.json        (Procesador de texto → embeddings → Qdrant)
```

---

## 🤖 1. Bot WhatsApp AI Agent (`withmia-bot-template.json`)

**Función:** Bot conversacional inteligente para WhatsApp con capacidades completas de venta, agendamiento y atención al cliente.

### Herramientas del bot (9 tools):

| Herramienta | Tipo | Endpoint |
|---|---|---|
| **Buscar en Base de Conocimientos** | Workflow (RAG) | Qdrant semántico |
| **Consultar Disponibilidad** | HTTP GET | `/api/calendar-hub/bot/availability` |
| **Agendar Cita** | HTTP POST | `/api/calendar-hub/bot/create-event` |
| **Buscar Productos** | HTTP GET | `/api/product-hub/bot/search` |
| **Generar Enlace de Compra** | HTTP POST | `/api/product-hub/bot/generate-link` |
| **Consultar Catálogo** | HTTP GET | `/api/product-hub/bot/catalog` |
| **Bloqueo a Humano** | Redis | Palabra clave "BOT" |
| **Think** | Interno | Mejora redacción |
| **Humanizador** | Interno | Naturalidad en respuestas |

### Capacidades:

- ✅ **Multi-formato**: Texto, audio (Whisper) e imágenes (GPT-4o-mini Vision)
- ✅ **AI Agent**: GPT-4o-mini con prompt empresarial completo
- ✅ **Memoria**: Redis temporal (7s typing) + Buffer conversacional (20 mensajes)
- ✅ **RAG**: Búsqueda semántica en Qdrant (base de conocimientos de la empresa)
- ✅ **Productos**: Búsqueda en WooCommerce, Shopify, MercadoLibre + productos manuales
- ✅ **Descuentos**: Muestra precios originales, descuentos y porcentaje de ahorro
- ✅ **Enlaces de compra**: Genera checkout URLs (WooCommerce add-to-cart, Shopify cart, ML listing)
- ✅ **Catálogo**: Vista general de categorías, rangos de precio y stock
- ✅ **Calendario**: Consulta disponibilidad en Google Calendar, Outlook, Calendly, Reservo, AgendaPro
- ✅ **Agendamiento**: Crea citas/eventos directamente o envía links de agendamiento
- ✅ **Handoff**: El cliente puede pedir hablar con una persona real
- ✅ **División inteligente**: Mensajes largos divididos en partes naturales
- ✅ **Anti-spam**: Cooldown de 10 minutos después de bloqueo
- ✅ **Documentos**: Procesa PDFs, comprobantes de pago, cotizaciones

### Flujo de venta completo:

```
1. Cliente pregunta por producto → Buscar Productos
2. Bot presenta opciones con precios, descuentos y disponibilidad
3. Cliente elige producto → confirma producto y cantidad
4. Bot genera enlace de compra → Generar Enlace de Compra
5. Bot envía enlace + resumen del pedido (producto, cantidad, total)
6. Si no hay enlace → ofrece conectar con el equipo
```

### Flujo de agendamiento:

```
1. Cliente quiere agendar → Consultar Disponibilidad
2. Bot muestra horarios disponibles de todos los calendarios
3. Calendly → envía link de agendamiento
4. Reservo/AgendaPro → pregunta servicio, luego agenda
5. Google/Outlook → Agendar Cita directamente
```

### Placeholders reemplazados por N8nService:

| Placeholder | Valor |
|---|---|
| `{{COMPANY_SLUG}}` | Slug de la empresa |
| `{{COMPANY_NAME}}` | Nombre de la empresa |
| `{{ASSISTANT_NAME}}` | Nombre del asistente (ej: "MIA") |
| `{{INSTANCE_NAME}}` | Nombre de la instancia WhatsApp |
| `{{APP_URL}}` | URL de la app Laravel |
| `{{EVOLUTION_API_URL}}` | URL de Evolution API |
| `{{QDRANT_URL}}` | URL de Qdrant |
| `{{N8N_OPENAI_CREDENTIAL_ID}}` | ID credencial OpenAI en n8n |
| `{{N8N_QDRANT_CREDENTIAL_ID}}` | ID credencial Qdrant en n8n |

---

## 💬 2. Training Chat (`training-chat.json`)

**Función:** Chat de entrenamiento que permite al usuario probar el RAG y decidir si guardar nuevos datos.

**Flujo:**
1. Webhook recibe pregunta del usuario
2. Genera embedding de la pregunta
3. Busca en Qdrant (colección de la empresa)
4. Construye contexto con resultados relevantes
5. GPT genera respuesta basada en contexto
6. Si el usuario marca "guardar" → almacena la respuesta en Qdrant como nuevo conocimiento

---

## 📄 3. RAG Text Processor (`rag-text-processor.json`)

**Función:** Procesar texto plano → chunking → embeddings → almacenar en Qdrant.

**Flujo:**
1. Webhook recibe texto + metadatos (company_id, filename)
2. Valida datos de entrada
3. Divide texto en chunks (500 tokens)
4. Genera embeddings por chunk (OpenAI text-embedding-3-small)
5. Almacena vectors en Qdrant con metadatos
6. Notifica a Laravel con vector IDs

**Webhook de notificación:**
```
POST {{APP_URL}}/api/knowledge/update-vector-ids
{
  "company_id": 1,
  "filename": "documento.pdf",
  "vector_ids": ["uuid1", "uuid2"],
  "chunks_created": 15,
  "secret_token": "withmia_n8n_secret_2024"
}
```

---

## 🚀 Despliegue Automático

Los workflows se crean automáticamente desde Laravel via `N8nService::createBotWorkflow()`:

```php
// app/Services/N8nService.php
$n8nService->createBotWorkflow($company, $instanceName);
// 1. Carga template JSON
// 2. Reemplaza todos los placeholders
// 3. Crea workflow via n8n API
// 4. Activa workflow automáticamente
```

**No es necesario importar manualmente** — todo se provisiona durante el onboarding.

---

## 🔧 Endpoints del Bot (sin auth, usan company_slug)

### Productos
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/product-hub/bot/search` | Buscar productos (query, category, price range) |
| GET | `/api/product-hub/bot/catalog` | Catálogo: categorías, rangos de precio, stock |
| POST | `/api/product-hub/bot/generate-link` | Generar enlace de compra/pago |

### Calendario
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/calendar-hub/bot/availability` | Disponibilidad en todos los calendarios |
| POST | `/api/calendar-hub/bot/create-event` | Crear cita/evento |

### Parámetros comunes
- `company_slug` — identificador de la empresa (requerido en todos)
- Los endpoints detectan automáticamente qué proveedores tiene conectados la empresa

---

## 🆘 Troubleshooting

### Error: "Webhook not found"
- Verificar que el workflow esté **activado** en n8n
- Verificar que la URL del webhook coincida con la instancia WhatsApp

### Error: "Qdrant connection failed"
- Usar URL interna: `http://qdrant.railway.internal:6333`
- No usar URLs públicas dentro de Railway

### Error: "Redis ECONNREFUSED"
- Verificar credenciales Redis en n8n
- Host: `redis.railway.internal:6379`

### Workflow no se crea
- Verificar `N8N_INTERNAL_URL`, `N8N_API_KEY` en `.env`
- Verificar que n8n tenga credenciales OpenAI y Qdrant creadas
- Revisar logs: `Log::channel('n8n')` en Laravel

---

**Última actualización:** 12 de febrero de 2026
