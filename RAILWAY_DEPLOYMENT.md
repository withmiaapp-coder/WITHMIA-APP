# 🚀 Guía de Deployment en Railway

## 📋 Prerequisitos

- Una cuenta en [Railway.app](https://railway.app)
- Tu repositorio de GitHub conectado
- Base de datos MySQL/PostgreSQL (Railway puede proveerla)

## 🔧 Configuración Paso a Paso

### 1. Crear Proyecto en Railway

1. Ve a [Railway Dashboard](https://railway.app/dashboard)
2. Click en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Elige tu repositorio `mia-app`

### 2. Agregar Base de Datos

1. En tu proyecto, click en **"+ New"**
2. Selecciona **"Database"** → **"Add MySQL"** (o PostgreSQL)
3. Railway creará automáticamente la variable `DATABASE_URL`

### 3. Configurar Variables de Entorno

Ve a tu servicio → **Settings** → **Variables** y agrega:

#### ✅ Variables OBLIGATORIAS

```bash
# Generar APP_KEY
APP_KEY=base64:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Para generar APP_KEY:**
1. Ejecuta localmente: `php artisan key:generate --show`
2. Copia el resultado (debe empezar con `base64:`)

```bash
# Aplicación
APP_NAME="MIA App"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://tu-proyecto.up.railway.app

# Base de datos (Railway lo configura automáticamente si agregaste MySQL)
DB_CONNECTION=mysql
# DATABASE_URL ya está configurado por Railway

# Sessions y Cache
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

# Logging
LOG_CHANNEL=stack
LOG_LEVEL=error
```

#### 🔑 Variables OPCIONALES (según tus necesidades)

```bash
# OpenAI (si usas IA)
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Email
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=tu_email@gmail.com
MAIL_PASSWORD=tu_app_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=tu_email@gmail.com

# Reverb/Pusher (WebSockets)
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=local
REVERB_APP_KEY=local
REVERB_APP_SECRET=local
```

### 4. Variables que Railway Configura Automáticamente

Railway inyecta estas variables automáticamente:
- `PORT` - El puerto donde tu app debe escuchar
- `DATABASE_URL` - Si agregaste una base de datos
- `RAILWAY_ENVIRONMENT` - El entorno actual
- `RAILWAY_PROJECT_ID` - ID de tu proyecto
- `RAILWAY_SERVICE_NAME` - Nombre de tu servicio

### 5. Hacer Deploy

1. **Commit y push** tus cambios a GitHub:
```bash
git add .
git commit -m "Configure Railway deployment"
git push origin main
```

2. Railway detectará los cambios y desplegará automáticamente

### 6. Ver Logs

1. Ve a tu servicio en Railway
2. Click en **"Deployments"**
3. Selecciona el deployment activo
4. Click en **"View Logs"**

## 🔍 Troubleshooting

### ❌ Error: "Healthcheck failure"

**Solución:**
1. Verifica que `APP_KEY` esté configurado
2. Verifica que la base de datos esté conectada
3. Revisa los logs para ver el error específico

```bash
# En Railway logs, busca:
"✅ Aplicación lista para deployment"
```

### ❌ Error: "500 Internal Server Error"

**Causas comunes:**
1. `APP_KEY` no configurado → Ver paso 3
2. Base de datos no configurada → Ver paso 2
3. Migraciones fallaron → Ver logs

**Verificar:**
```bash
# En Railway, ve a la terminal del servicio:
php artisan about
```

### ❌ Error: "npm ci failed"

**Solución:**
```bash
# Localmente, asegúrate que package-lock.json esté actualizado:
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

### ❌ Build toma mucho tiempo

Railway tiene un timeout de 10 minutos. Si tu build es muy lento:

1. Optimiza dependencias de npm
2. Usa cache de Composer
3. Considera reducir el tamaño de assets

## 📊 Monitoreo

### Ver estado de la aplicación
```
https://tu-proyecto.up.railway.app/api/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-06T23:26:00Z",
  "app": "MIA App",
  "environment": "production",
  "database": "connected"
}
```

## 💰 Costos Estimados

Railway cobra por:
- **Compute**: ~$5-10/mes (uso básico)
- **MySQL Database**: ~$5/mes
- **Total estimado**: ~$10-15/mes

**Tip:** Railway ofrece $5 de crédito gratis al mes en el plan Hobby.

## 🔄 Actualizar la Aplicación

Simplemente haz push a GitHub:
```bash
git add .
git commit -m "Update feature X"
git push origin main
```

Railway detectará los cambios y desplegará automáticamente.

## 📝 Archivos Importantes

- `railway.json` - Configuración de Railway
- `nixpacks.toml` - Build configuration
- `railway-init.sh` - Script de inicialización
- `.env.production.example` - Variables de ejemplo

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs en Railway Dashboard
2. Verifica el endpoint `/api/health`
3. Consulta la [documentación de Railway](https://docs.railway.app)

## ✅ Checklist de Deployment

- [ ] Repositorio conectado a Railway
- [ ] Base de datos MySQL agregada
- [ ] `APP_KEY` generado y configurado
- [ ] Variables de entorno configuradas
- [ ] Primer deployment exitoso
- [ ] `/api/health` responde correctamente
- [ ] Aplicación funcional en producción

---

¡Tu aplicación MIA está lista para producción! 🎉
