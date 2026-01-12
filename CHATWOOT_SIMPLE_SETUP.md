# Configuración Simplificada de Chatwoot en Railway

## Problema Identificado
La imagen `chatwoot/chatwoot:latest` necesita un script de inicio complejo que ejecute migraciones antes de arrancar.

## Solución Recomendada

### Opción 1: Usar Railway Template (Recomendado)
Railway tiene templates pre-configurados. Busca en:
https://railway.app/templates

Busca "Chatwoot" y despliega desde ahí.

### Opción 2: Configuración Manual Correcta

**En Settings → Deploy → Custom Start Command:**
```bash
bundle exec rails db:chatwoot_prepare && bundle exec rails s -b 0.0.0.0 -p $PORT
```

**Variables Adicionales Necesarias:**
```bash
BUNDLE_WITHOUT=development:test
RAILS_LOG_LEVEL=info
RAILS_SERVE_STATIC_FILES=true
RACK_ENV=production
NODE_ENV=production
```

### Opción 3: Usar docker-compose.yml de Chatwoot

Chatwoot oficial usa múltiples servicios:
- Web server
- Sidekiq worker
- Rails console

Para Railway necesitarías 3 servicios separados.

## Recomendación Final

**POR AHORA**: Usa Evolution API que ya tienes funcionando para WhatsApp. Evolution API ya incluye:
- Gestión de conversaciones
- Webhooks
- API completa

**LUEGO**: Si necesitas el dashboard de Chatwoot, mejor desplegarlo en un servidor VPS dedicado con Docker Compose completo.

## Servicios Operativos Actuales

✅ **Qdrant** - Vector database para RAG (FUNCIONANDO)
✅ **Evolution API** - WhatsApp Gateway (FUNCIONANDO)  
✅ **PostgreSQL** - Base de datos principal (FUNCIONANDO)
✅ **Redis** - Cache y queues (FUNCIONANDO)
✅ **n8n** - Automation (FUNCIONANDO)
⚠️ **Chatwoot** - Requiere configuración avanzada

## ¿Realmente necesitas Chatwoot?

Tu app ya tiene:
- Sistema de conversaciones propio (ConversationController)
- Integration con Evolution API
- Sistema de contactos
- Pipeline de ventas

Chatwoot agregaría:
- Dashboard de agentes
- Asignación automática
- Reportes de conversaciones

**Pregunta clave**: ¿Necesitas el dashboard de agentes de Chatwoot o prefieres usar tu propio sistema?
