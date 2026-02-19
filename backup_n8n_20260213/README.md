# WITHMIA Full Backup - 2026-02-13

## Contenido del Backup

### n8n Workflows (10 workflows)
| ID | Nombre | Archivo |
|---|---|---|
| yzjn5k1sQ86l3qcX | RAG Documents - salud-y-belleza-ehppbu | `yzjn5k1sQ86l3qcX_RAG_Documents_-_salud-y-belleza-ehppbu.json` |
| 7kXlXYVJpttnGJaC | Training Chat - withmia-evp7rj | `7kXlXYVJpttnGJaC_Training_Chat_-_withmia-evp7rj.json` |
| rhSjymjgl43Foz7I | RAG Documents - atlantis-producciones-abukfv | `rhSjymjgl43Foz7I_RAG_Documents_-_atlantis-producciones-abukfv.json` |
| KTdlRFXhfuPWKd7i | Training Chat - yarger-suarez | `KTdlRFXhfuPWKd7i_Training_Chat_-_yarger-suarez.json` |
| DDlf9BNJhNlKiua8 | WITHMIA Bot - salud-y-belleza-ehppbu | `DDlf9BNJhNlKiua8_WITHMIA_Bot_-_salud-y-belleza-ehppbu.json` |
| m6w5THqze0OOPcnR | WITHMIA Bot - withmia-evp7rj | `m6w5THqze0OOPcnR_WITHMIA_Bot_-_withmia-evp7rj.json` |
| 981gvL6hwQGZ3l58 | Training Chat - atlantis-producciones-abukfv | `981gvL6hwQGZ3l58_Training_Chat_-_atlantis-producciones-abukfv.json` |
| HwT6VIUP4jO4OQFH | Training Chat - salud-y-belleza-ehppbu | `HwT6VIUP4jO4OQFH_Training_Chat_-_salud-y-belleza-ehppbu.json` |
| zDqy6hoBbUv5YVyI | RAG Documents - withmia-evp7rj | `zDqy6hoBbUv5YVyI_RAG_Documents_-_withmia-evp7rj.json` |
| 0Wv4rvx3YFBWwo9I | RAG Documents - yarger-suarez | `0Wv4rvx3YFBWwo9I_RAG_Documents_-_yarger-suarez.json` |

- `ALL_WORKFLOWS.json` - Todos los workflows en un solo archivo

### Variables de Entorno (8 servicios)
- `ENV_WITHMIA_APP.txt` - App Laravel principal
- `ENV_n8n.txt` - n8n automation
- `ENV_Chatwoot.txt` - Chatwoot support
- `ENV_Evolution-API.txt` - WhatsApp API
- `ENV_Qdrant.txt` - Vector database
- `ENV_Redis.txt` - Cache/queue
- `ENV_PostgreSQL.txt` - Database
- `ENV_reverb.txt` - WebSocket server

### Base de Datos PostgreSQL
- `DATABASE_railway.sql` - Dump completo (17 tablas, 737KB)
  - Tablas: cache, cached_attachments, companies, failed_jobs, knowledge_documents, migrations, users, whatsapp_instances, etc.

### Qdrant (Vector Database)
- `QDRANT_collections.json` - Metadata de colecciones
- `QDRANT_company_withmia-evp7rj_knowledge_vectors.json` - Vectores WITHMIA (613KB)
- `QDRANT_company_yarger-suarez_knowledge_vectors.json` - Vectores Yarger-Suarez (102KB)

### Cómo restaurar

#### Workflows n8n
```bash
# Importar un workflow via API
curl -X POST https://n8n-host/api/v1/workflows \
  -H "X-N8N-API-KEY: <key>" \
  -H "Content-Type: application/json" \
  -d @<workflow_file>.json
```

#### Base de Datos
```bash
psql -h <host> -p <port> -U postgres -d railway < DATABASE_railway.sql
```

#### Qdrant Vectors
Los vectores se pueden re-importar via la API de Qdrant usando los archivos JSON.
