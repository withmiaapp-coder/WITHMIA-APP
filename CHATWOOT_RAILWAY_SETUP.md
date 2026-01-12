# Configuración de Chatwoot en Railway

## 1. Crear Servicio Chatwoot

1. Ve a https://railway.app/project
2. Click en **"+ New"** → **"Empty Service"**
3. Nombra el servicio: `chatwoot`

## 2. Configurar Docker Image

**Settings → Deploy:**
- Source: Docker Image
- Image: `chatwoot/chatwoot:latest`

## 3. Variables de Entorno Requeridas

**Settings → Variables:**

```bash
# Base de datos PostgreSQL (usa tu servicio PostgreSQL existente)
POSTGRES_HOST=${{Postgres.PGHOST}}
POSTGRES_PORT=${{Postgres.PGPORT}}
POSTGRES_DATABASE=chatwoot
POSTGRES_USERNAME=${{Postgres.PGUSER}}
POSTGRES_PASSWORD=${{Postgres.PGPASSWORD}}

# Redis (usa tu servicio Redis existente)
REDIS_URL=${{Redis.REDIS_URL}}

# Configuración de Rails
RAILS_ENV=production
SECRET_KEY_BASE=<genera_una_clave_secreta_de_128_caracteres>
FRONTEND_URL=https://chatwoot-production-xxxx.up.railway.app

# Email (opcional - usa Mailgun)
MAILER_SENDER_EMAIL=noreply@withmia.com
SMTP_ADDRESS=smtp.mailgun.org
SMTP_PORT=587
SMTP_USERNAME=${{mia-app.MAILGUN_USERNAME}}
SMTP_PASSWORD=${{mia-app.MAILGUN_PASSWORD}}
SMTP_DOMAIN=withmia.com
SMTP_ENABLE_STARTTLS_AUTO=true
SMTP_AUTHENTICATION=plain

# Storage (opcional - S3)
ACTIVE_STORAGE_SERVICE=local

# Configuración adicional
RAILS_MAX_THREADS=5
INSTALLATION_NAME=MIA Chatwoot
ENABLE_ACCOUNT_SIGNUP=false
FORCE_SSL=true
```

## 4. Generar SECRET_KEY_BASE

Ejecuta en terminal:

```bash
railway run --service chatwoot bundle exec rake secret
```

O genera una localmente:

```bash
openssl rand -hex 64
```

## 5. Configurar Puerto

**Settings → Networking:**
- Exposed Port: `3000`
- Protocol: HTTP

## 6. Crear Base de Datos

Antes de iniciar Chatwoot, crea la base de datos:

```bash
# Conéctate a PostgreSQL
railway service postgres
railway run psql

# Crea la base de datos
CREATE DATABASE chatwoot;
GRANT ALL PRIVILEGES ON DATABASE chatwoot TO <tu_usuario>;
\q
```

## 7. Ejecutar Migraciones

Una vez el servicio esté activo:

```bash
railway service chatwoot
railway run bundle exec rails db:chatwoot_prepare
```

## 8. Generar Dominio Público

**Settings → Networking → Public Networking:**
- Click en **"Generate Domain"**
- Anota el dominio (ej: `chatwoot-production-xxxx.up.railway.app`)

## 9. Configurar Dominio Personalizado (Opcional)

**Settings → Networking → Custom Domain:**
- Domain: `chatwoot.withmia.com`
- Configura CNAME en tu DNS apuntando a Railway

## 10. Crear Usuario Admin

```bash
railway service chatwoot
railway run bundle exec rails c

# En la consola de Rails:
user = User.create!(
  email: 'admin@withmia.com',
  password: 'password_seguro_aqui',
  password_confirmation: 'password_seguro_aqui',
  name: 'Admin MIA'
)
Account.create!(name: 'MIA')
AccountUser.create!(account_id: 1, user_id: user.id, role: :administrator)
exit
```

## 11. Acceder a Chatwoot

Abre: `https://chatwoot-production-xxxx.up.railway.app`

Inicia sesión con las credenciales que creaste.

## 12. Integración con mia-app

Actualiza las variables de entorno de `mia-app`:

```bash
CHATWOOT_BASE_URL=https://chatwoot-production-xxxx.up.railway.app
CHATWOOT_API_KEY=<obtener_desde_chatwoot_profile>
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_INBOX_ID=<crear_inbox_en_chatwoot>
```

## 13. Obtener API Key de Chatwoot

1. Accede a Chatwoot
2. Ve a **Profile Settings** → **Access Token**
3. Copia el token y agrégalo a las variables de `mia-app`

## 14. Crear Inbox de WhatsApp

1. En Chatwoot, ve a **Settings** → **Inboxes**
2. Click **"Add Inbox"**
3. Selecciona **"API"** o **"WhatsApp"**
4. Anota el `inbox_id` para configurarlo en `mia-app`

## Arquitectura Chatwoot + Evolution API

```
Usuario WhatsApp 
    ↓
Evolution API (webhook) 
    ↓
mia-app (ChatwootService)
    ↓
Chatwoot (gestión de conversaciones)
    ↓
Agentes de soporte
```

## Recursos

- RAM: 512 MB mínimo (1 GB recomendado)
- CPU: 0.5 vCPU
- Storage: Usa PostgreSQL compartido

## Troubleshooting

### Error: Database does not exist
```bash
railway run bundle exec rails db:create
railway run bundle exec rails db:migrate
```

### Error: Redis connection
Verifica que `REDIS_URL` esté correctamente referenciada.

### Error: Assets not loading
```bash
railway run bundle exec rails assets:precompile
```
