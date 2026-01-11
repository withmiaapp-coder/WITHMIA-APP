# 🚨 Solución: Proyecto No Se Ve en Railway

## ⚠️ PROBLEMA: Ya pagué $5 pero el proyecto no funciona

---

## ✅ SOLUCIONES EN ORDEN DE PRIORIDAD

### **OPCIÓN 1: Verificar desde el Dashboard de Railway (MÁS RÁPIDO)**

1. **Ve a Railway**: https://railway.app/dashboard
2. **Inicia sesión** con tu cuenta de GitHub
3. **Busca tu proyecto**: `mia-app` o similar
4. **Haz clic en el servicio principal** (el que dice "mia-app" o "web")

#### 📊 **Verifica el estado del deploy:**

- **Estado**: ¿Dice "Running" (✅) o "Failed" (❌)?
- **Logs**: Click en "View Logs" - ¿Hay errores?
- **URL**: Click en "Settings" → "Domains" - ¿Tienes una URL asignada?

---

### **OPCIÓN 2: Configurar Variables de Entorno Críticas**

En Railway Dashboard → Tu Servicio → **Variables**, agrega estas **OBLIGATORIAS**:

#### **🔑 Variables Mínimas Requeridas:**

```env
# ⚠️ CRÍTICA - Sin esto la app no arranca
APP_KEY=base64:TU_KEY_AQUI

# APP BÁSICA
APP_NAME=WithMIA
APP_ENV=production
APP_DEBUG=false
APP_URL=https://tu-app.up.railway.app

# BASE DE DATOS (Railway las inyecta automáticamente si agregaste MySQL)
# No las toques si ya están automáticas

# CACHE Y SESIONES
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=public

# BROADCAST
BROADCAST_CONNECTION=log
```

#### **🔑 Generar APP_KEY:**

Ejecuta en tu terminal local:

```powershell
php artisan key:generate --show
```

Copia el resultado completo (ej: `base64:xxxxx...`) y pégalo en Railway.

---

### **OPCIÓN 3: Verificar Healthcheck**

Tu configuración actual tiene:
```json
"healthcheckPath": "/api/health"
```

**Problema**: Si esta ruta no existe, Railway marca el deploy como fallido.

#### **Solución A: Crear la ruta de health**

Agrega en `routes/api.php`:

```php
Route::get('/health', function () {
    return response()->json(['status' => 'ok'], 200);
});
```

#### **Solución B: Cambiar el healthcheck**

Edita `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "php artisan migrate --force 2>&1 || true && php artisan config:cache && php artisan serve --host=0.0.0.0 --port=$PORT",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

### **OPCIÓN 4: Verificar que MySQL y Redis estén conectados**

1. En Railway Dashboard, verifica que tengas **3 servicios**:
   - ✅ mia-app (tu aplicación Laravel)
   - ✅ MySQL
   - ✅ Redis (opcional pero recomendado)

2. Si falta MySQL:
   - Click "**+ New**"
   - Selecciona "**Database**" → "**MySQL**"
   - Railway conectará automáticamente las variables

---

### **OPCIÓN 5: Ver Logs Detallados**

1. En Railway Dashboard → Tu servicio → **Deploy Logs**
2. Busca errores como:
   - ❌ `No application encryption key has been specified`
   - ❌ `SQLSTATE[HY000] [2002] Connection refused`
   - ❌ `Class ... not found`

**Errores comunes:**

| Error | Solución |
|-------|----------|
| `No encryption key` | Configura `APP_KEY` en Variables |
| `Connection refused` | Agrega MySQL database |
| `npm run build failed` | Verifica que `package.json` esté correcto |
| `/api/health not found` | Cambia healthcheck a `/` |

---

### **OPCIÓN 6: Forzar Nuevo Deploy**

1. En Railway → Tu servicio → **Deployments**
2. Click en los **3 puntos** (...) del último deploy
3. Selecciona "**Redeploy**"

O desde tu terminal local:

```powershell
# Hacer un cambio pequeño
git commit --allow-empty -m "trigger railway redeploy"
git push origin main
```

---

### **OPCIÓN 7: Instalar Railway CLI (Para Debug Avanzado)**

```powershell
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Vincular proyecto
railway link

# Ver logs en tiempo real
railway logs

# Ver variables
railway variables

# Ejecutar comandos en el servidor
railway run php artisan migrate --force
```

---

## 🎯 **CHECKLIST RÁPIDO**

Marca lo que ya hiciste:

- [ ] ✅ Pagué la suscripción de $5 (Hobby Plan)
- [ ] ✅ Tengo un proyecto creado en Railway
- [ ] ✅ El proyecto está vinculado a mi repo de GitHub
- [ ] ✅ Agregué MySQL database al proyecto
- [ ] ✅ Configuré `APP_KEY` en Variables de Railway
- [ ] ✅ El último deploy dice "Running" (no "Failed")
- [ ] ✅ Tengo una URL asignada en Settings → Domains
- [ ] ✅ La URL abre (aunque sea con error)

---

## 🔥 **SOLUCIÓN EXPRÉS (5 Minutos)**

Si quieres la solución más rápida:

1. **Ve a Railway** → Tu proyecto → Tu servicio → **Variables**

2. **Agrega solo estas 2 variables**:
   ```
   APP_KEY=base64:4KvJ8x9zQpT2wN5mH7yR6kL3sF1dG9bV8cX0jP4nM2A=
   APP_ENV=production
   ```

3. **Edita `railway.json`** (cambia healthcheck):
   ```json
   "healthcheckPath": "/"
   ```

4. **Commit y push**:
   ```powershell
   git add railway.json
   git commit -m "fix: change healthcheck path"
   git push origin main
   ```

5. **Espera 2-3 minutos** y abre tu URL de Railway

---

## 📞 **¿Aún no funciona?**

Respóndeme con:

1. **La URL de tu proyecto en Railway** (ej: `https://mia-app-production-xxxx.up.railway.app`)
2. **El estado actual** del deploy (Running, Failed, Building)
3. **Captura de pantalla** de los logs si hay errores
4. **Variables configuradas** (las primeras 3 líneas sin valores sensibles)

Y te ayudo específicamente con tu caso.

---

## 💡 **Tip Final**

Railway puede tardar hasta **5 minutos** en hacer el primer deploy. Si el estado dice "Building" o "Deploying", solo espera un poco más.

Si dice "**Failed**", ve directamente a los **Deploy Logs** para ver qué falló.
