# 🚂 Guía de Despliegue en Railway

## Paso 1: Crear cuenta en Railway

1. Ve a [railway.app](https://railway.app)
2. Regístrate con tu cuenta de GitHub
3. Confirma tu email

## Paso 2: Crear nuevo proyecto

1. Click en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Busca y selecciona: `withmiaapp-coder/mia-app`
4. Railway comenzará el deploy automáticamente

## Paso 3: Agregar servicios necesarios

### Agregar MySQL:
1. En tu proyecto, click en **"+ New"**
2. Selecciona **"Database"** → **"MySQL"**
3. Railway creará la base de datos automáticamente
4. Las variables `MYSQLHOST`, `MYSQLPORT`, etc. se inyectan automáticamente

### Agregar Redis:
1. Click en **"+ New"** nuevamente
2. Selecciona **"Database"** → **"Redis"**
3. Las variables `REDISHOST`, `REDISPORT`, etc. se inyectan automáticamente

## Paso 4: Configurar Variables de Entorno

1. Click en tu servicio Laravel (el principal)
2. Ve a la pestaña **"Variables"**
3. Agrega las siguientes variables (copia de `.env.railway`):

```env
APP_NAME=WithMIA
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:TU_KEY_GENERADA_AQUI

# Las de DB y Redis ya están automáticas ✅

SESSION_DRIVER=redis
CACHE_STORE=redis
QUEUE_CONNECTION=redis
FILESYSTEM_DISK=public

MAIL_MAILER=resend
RESEND_API_KEY=tu_api_key_de_resend

CHATWOOT_API_BASE_URL=http://n8n-admin.withmia.com
CHATWOOT_PLATFORM_API_TOKEN=tu_token

EVOLUTION_API_URL=tu_url_evolution
EVOLUTION_API_KEY=tu_key_evolution

OPENAI_API_KEY=tu_key_openai
```

### Generar APP_KEY:
```bash
php artisan key:generate --show
```

## Paso 5: Configurar Dominio (Opcional)

1. Ve a **"Settings"** → **"Domains"**
2. Railway te da un dominio gratis: `tu-app.up.railway.app`
3. O conecta tu dominio personalizado: `app.withmia.com`

## Paso 6: Post-Deploy

Railway ejecutará automáticamente:
- `composer install`
- `npm ci && npm run build`
- `php artisan migrate --force`
- `php artisan config:cache`

## Paso 7: Verificar que funciona

1. Abre el dominio que Railway te dio
2. Verifica que el login funciona
3. Prueba crear una conversación
4. Verifica que WhatsApp se conecta

---

## 💰 Costos Estimados

### Plan Hobby ($5/mes):
- 500 horas de ejecución
- 512 MB RAM
- 1 GB disco
- MySQL + Redis incluidos
- **Ideal para empezar**

### Plan Pro ($20/mes):
- Recursos ilimitados
- 8 GB RAM
- 100 GB disco
- **Recomendado para producción**

---

## 🔄 Desplegar Cambios

Cada vez que hagas `git push origin main`, Railway desplegará automáticamente.

```bash
git add .
git commit -m "Update feature"
git push origin main
# 🚀 Railway detecta el push y despliega automáticamente
```

---

## 🐛 Debugging

### Ver logs en tiempo real:
1. Click en tu servicio
2. Ve a la pestaña **"Logs"**
3. Verás todos los logs de Laravel

### Ejecutar comandos Artisan:
No hay SSH directo, pero puedes:
1. Usar Railway CLI: `railway run php artisan migrate`
2. O crear un endpoint temporal en tu app

---

## 📊 Métricas

Railway muestra automáticamente:
- CPU usage
- Memory usage
- Network traffic
- Request count

---

## ✅ Checklist Final

- [ ] Proyecto conectado a GitHub
- [ ] MySQL agregado
- [ ] Redis agregado
- [ ] Variables de entorno configuradas
- [ ] APP_KEY generada
- [ ] Deploy exitoso (verde ✅)
- [ ] Dominio funcionando
- [ ] Login funciona
- [ ] WhatsApp conecta
- [ ] Emails se envían (Resend configurado)

---

**¿Problemas?** Revisa los logs en Railway o contacta a soporte en su Discord.
