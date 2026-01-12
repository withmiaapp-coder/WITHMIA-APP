# Configuración de Qdrant en Railway

## 1. Crear Servicio Qdrant

1. Ve a https://railway.app/project
2. Click en **"+ New"** → **"Empty Service"**
3. Nombra el servicio: `qdrant`

## 2. Configurar Docker Image

En la configuración del servicio:

**Settings → Deploy:**
- Source: Docker Image
- Image: `qdrant/qdrant:latest`

## 3. Variables de Entorno

**Settings → Variables:**

```bash
# No requiere autenticación por defecto
# Opcionalmente puedes agregar:
QDRANT__SERVICE__API_KEY=tu_api_key_segura_aqui
```

## 4. Configurar Puerto

**Settings → Networking:**
- Exposed Port: `6333`
- Protocol: HTTP

## 5. Crear Volumen Persistente

**Settings → Volumes:**
- Mount Path: `/qdrant/storage`
- Size: 5 GB (o más según tus necesidades)

## 6. Generar Dominio Público

**Settings → Networking → Public Networking:**
- Click en **"Generate Domain"**
- Anota el dominio generado (ej: `qdrant-production-xxxx.up.railway.app`)

## 7. Configurar Healthcheck (Opcional)

**Settings → Health Check:**
- Path: `/healthz`
- Port: 6333
- Interval: 30s
- Timeout: 10s

## 8. Deploy

Click en **"Deploy"** y espera que el servicio esté activo.

## 9. Actualizar mia-app

Actualiza las variables de entorno de `mia-app`:

```bash
QDRANT_HOST=https://qdrant-production-xxxx.up.railway.app
QDRANT_PORT=6333
```

## 10. Verificar Conexión

Accede a: `https://qdrant-production-xxxx.up.railway.app/dashboard`

Deberías ver el dashboard de Qdrant.

## Uso Interno en Railway

Para comunicación entre servicios (más rápido):
- Usa el dominio privado: `qdrant.railway.internal:6333`
- Actualiza `KnowledgeController.php`:
  ```php
  private $qdrantHost = 'http://qdrant.railway.internal:6333';
  ```

## Características de Qdrant

- Base de datos vectorial optimizada para búsquedas de similitud
- Soporta vectores de alta dimensión (768 dims en tu caso)
- API REST completa
- Dashboard web para visualización
- Escalable y rápido
