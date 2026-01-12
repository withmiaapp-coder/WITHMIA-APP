# Variables de Entorno para Railway - Servicios Nuevos

## Agregar a mia-app Service

```bash
# Qdrant Vector Database
QDRANT_HOST=http://qdrant.railway.internal:6333

# Chatwoot
CHATWOOT_BASE_URL=https://chatwoot-production-xxxx.up.railway.app
CHATWOOT_API_KEY=obtener_desde_chatwoot_despues_de_crear_usuario
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_INBOX_ID=obtener_despues_de_crear_inbox
```

## Qdrant Service

```bash
# Sin variables adicionales requeridas por defecto
# Opcionalmente:
# QDRANT__SERVICE__API_KEY=tu_clave_segura_aqui
```

## Chatwoot Service

```bash
# PostgreSQL
POSTGRES_HOST=${{Postgres.PGHOST}}
POSTGRES_PORT=${{Postgres.PGPORT}}
POSTGRES_DATABASE=chatwoot
POSTGRES_USERNAME=${{Postgres.PGUSER}}
POSTGRES_PASSWORD=${{Postgres.PGPASSWORD}}

# Redis
REDIS_URL=${{Redis.REDIS_URL}}

# Rails
RAILS_ENV=production
SECRET_KEY_BASE=<generar_con_openssl_rand_-hex_64>
FRONTEND_URL=https://chatwoot-production-xxxx.up.railway.app

# Email
MAILER_SENDER_EMAIL=noreply@withmia.com
SMTP_ADDRESS=smtp.mailgun.org
SMTP_PORT=587
SMTP_USERNAME=${{mia-app.MAILGUN_USERNAME}}
SMTP_PASSWORD=${{mia-app.MAILGUN_PASSWORD}}
SMTP_DOMAIN=withmia.com
SMTP_ENABLE_STARTTLS_AUTO=true
SMTP_AUTHENTICATION=plain

# Storage
ACTIVE_STORAGE_SERVICE=local

# Otros
RAILS_MAX_THREADS=5
INSTALLATION_NAME=MIA Chatwoot
ENABLE_ACCOUNT_SIGNUP=false
FORCE_SSL=true
```

## Generar SECRET_KEY_BASE

En PowerShell:
```powershell
# Opción 1: OpenSSL (si está instalado)
openssl rand -hex 64

# Opción 2: PowerShell nativo
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 128 | ForEach-Object {[char]$_})
```

## Orden de Instalación

1. ✅ Crear servicio **Qdrant**
2. ✅ Crear servicio **Chatwoot**
3. ✅ Crear base de datos `chatwoot` en PostgreSQL
4. ⏳ Ejecutar migraciones de Chatwoot
5. ⏳ Crear usuario admin en Chatwoot
6. ⏳ Obtener API key de Chatwoot
7. ⏳ Actualizar variables en mia-app
8. ⏳ Redeploy mia-app

## Referencias de Variables entre Servicios

Railway permite referenciar variables entre servicios usando:
```
${{ServiceName.VARIABLE_NAME}}
```

Ejemplo:
- `${{Postgres.PGHOST}}` - Host de PostgreSQL
- `${{Redis.REDIS_URL}}` - URL completa de Redis
- `${{mia-app.MAILGUN_USERNAME}}` - Username de Mailgun del servicio mia-app
