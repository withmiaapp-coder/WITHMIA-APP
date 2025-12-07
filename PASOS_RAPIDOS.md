# 🚀 PASOS RÁPIDOS - Deploy a Railway

## ✅ APP_KEY (Ya lo tienes)
```
APP_KEY=base64:fW9jZGRkNWE2MTg5NTQyZjFhMzBmNjA4YjQ5YWRlNGQyZDg3MzNiNGFiZDc5MThjZThhOTNlODU3YWE1ZDEx
```

---

## 1️⃣ COMMIT Y PUSH (AHORA)

```bash
git add .
git commit -m "Configure Railway deployment with custom domain app.withmia.com"
git push origin main
```

---

## 2️⃣ RAILWAY - Crear Proyecto (5 minutos)

### A. Crear Proyecto
1. Ve a: https://railway.app/dashboard
2. Click **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Busca y selecciona **"withmiaapp-coder/mia-app"**

### B. Agregar MySQL
1. En tu proyecto, click **"+ New"**
2. Click **"Database"**
3. Click **"Add MySQL"**
4. ✅ Listo (Railway crea `DATABASE_URL` automáticamente)

### C. Configurar Variables de Entorno
1. Click en tu servicio (mia-app)
2. Ve a **"Settings"** → **"Variables"**
3. Click **"+ New Variable"**
4. Copia y pega TODAS estas variables (una por una o usa "Raw Editor"):

```bash
APP_KEY=base64:fW9jZGRkNWE2MTg5NTQyZjFhMzBmNjA4YjQ5YWRlNGQyZDg3MzNiNGFiZDc5MThjZThhOTNlODU3YWE1ZDEx
APP_NAME=MIA App
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.withmia.com
DB_CONNECTION=mysql
SESSION_DRIVER=database
SESSION_LIFETIME=120
CACHE_STORE=database
QUEUE_CONNECTION=database
LOG_CHANNEL=stack
LOG_LEVEL=error
SESSION_DOMAIN=.withmia.com
SESSION_SECURE_COOKIE=true
BROADCAST_CONNECTION=reverb
FILESYSTEM_DISK=local
```

5. Click **"Add"** o **"Deploy"**

---

## 3️⃣ CONFIGURAR DOMINIO app.withmia.com

### A. En Railway (obtener CNAME)
1. En tu servicio, ve a **"Settings"** → **"Domains"**
2. Click **"+ Custom Domain"**
3. Escribe: `app.withmia.com`
4. **¡IMPORTANTE!** Copia el CNAME que te muestra Railway:
   ```
   Ejemplo: mia-app-production-xxxx.up.railway.app
   ```
   📋 **CÓPIALO** (lo necesitas para el siguiente paso)

### B. En cPanel (configurar DNS)

#### Opción 1: Zone Editor (Recomendado)
1. Entra a tu cPanel
2. Busca **"Zone Editor"** o **"Editor de Zona DNS"**
3. Busca tu dominio **"withmia.com"**
4. Click en **"Manage"** o **"Administrar"**
5. **ELIMINA** cualquier registro A o CNAME existente para `app`
6. Click **"Add Record"** o **"Agregar Registro"**
7. Configura así:
   ```
   Type: CNAME
   Name: app
   CNAME: [PEGA AQUÍ EL VALOR QUE COPIASTE DE RAILWAY]
   TTL: 14400
   ```
8. Click **"Add Record"**

#### Opción 2: Si tienes Subdominio creado en cPanel
1. Ve a **"Subdomains"** o **"Subdominios"**
2. Busca `app.withmia.com`
3. **Elimínalo** o **desactívalo** (ya no apuntará al hosting cPanel)
4. Luego sigue la **Opción 1** para agregar el CNAME

---

## 4️⃣ ESPERAR Y VERIFICAR (15-30 minutos)

### Verificar DNS (Windows)
```cmd
nslookup app.withmia.com
```

Debe mostrar algo como:
```
Name:    mia-app-production-xxxx.up.railway.app
Addresses: 35.x.x.x
Aliases: app.withmia.com
```

### Verificar Online
- Ir a: https://dnschecker.org
- Buscar: `app.withmia.com`
- Debe mostrar el CNAME de Railway en todos los servidores

### Verificar SSL (5-10 min después del DNS)
En Railway → Settings → Domains, debe mostrar:
```
✅ app.withmia.com - SSL Certificate Active
```

### Verificar Aplicación
1. **Healthcheck:**
   ```
   https://app.withmia.com/api/health
   ```
   
   Debe responder:
   ```json
   {
     "status": "healthy",
     "database": "connected"
   }
   ```

2. **App Principal:**
   ```
   https://app.withmia.com
   ```

---

## 🎯 Checklist Rápido

- [ ] Código pusheado a GitHub
- [ ] Proyecto creado en Railway
- [ ] MySQL agregado en Railway
- [ ] Variables de entorno agregadas (incluido APP_KEY)
- [ ] Dominio custom agregado en Railway
- [ ] CNAME copiado de Railway
- [ ] CNAME agregado en cPanel
- [ ] DNS propagado (15-30 min)
- [ ] SSL activo en Railway
- [ ] `/api/health` funciona
- [ ] App funciona en `app.withmia.com`

---

## 🆘 Problemas Comunes

### ❌ Deployment falla en Railway
**Ver logs:**
1. Railway → Deployments → Click en el deployment
2. Click **"View Logs"**
3. Busca: `✅ Aplicación lista para deployment`

**Si falta APP_KEY:**
- Verifica que esté en Settings → Variables

**Si falla MySQL:**
- Asegúrate de haber agregado MySQL database en Railway

### ❌ app.withmia.com no funciona
**Espera más tiempo:**
- DNS puede tardar hasta 48 horas (normal: 15-30 min)

**Verifica CNAME:**
```cmd
nslookup app.withmia.com
```

**Limpia caché DNS:**
```cmd
ipconfig /flushdns
```

---

## 💰 Costos Railway (vs AWS)

- **Compute:** $5-10/mes
- **MySQL:** $5/mes
- **Total:** ~$10-15/mes ✅

**AWS anterior:** ~$30-170/mes
**Ahorro:** $15-155/mes (50-90% menos) 🎉

---

## 📝 Variables OPCIONALES (si las necesitas)

```bash
# OpenAI (para IA)
OPENAI_API_KEY=sk-proj-xxxxxx

# Email (Gmail/SMTP)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=tu_email@gmail.com
MAIL_PASSWORD=tu_app_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=tu_email@gmail.com

# Pusher (si usas en lugar de Reverb)
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=mt1
```

---

## 🎉 ¡Listo!

Después de completar estos pasos, tu app estará:
- ✅ En Railway (más barato que AWS)
- ✅ En tu dominio `app.withmia.com`
- ✅ Con HTTPS automático
- ✅ Con auto-deploy desde GitHub

**Próximas actualizaciones:**
```bash
git add .
git commit -m "Nueva feature"
git push origin main
```
Railway desplegará automáticamente 🚀

---

**Documentación completa:**
- `README_FINAL.md` - Resumen completo
- `RAILWAY_DEPLOYMENT.md` - Deployment detallado
- `DOMINIO_PERSONALIZADO.md` - Configuración de dominio
