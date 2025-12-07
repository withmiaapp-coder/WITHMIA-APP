# 🔄 ACTUALIZACIÓN - Ya tienes MySQL y Redis configurados

## ✅ Estado Actual
- ✅ Proyecto creado en Railway
- ✅ MySQL agregado
- ✅ Redis agregado
- ✅ Variables de entorno configuradas (pero necesitan actualización)

---

## 🚨 ACCIÓN INMEDIATA REQUERIDA

### 1️⃣ Actualizar APP_URL (MUY IMPORTANTE)

Tu variable actual:
```
APP_URL="https://your-app.railway.app"
```

**Debe cambiar a:**
```
APP_URL=https://app.withmia.com
```

**Cómo hacerlo:**
1. En Railway → Tu servicio → **Settings** → **Variables**
2. Busca `APP_URL`
3. Cambia el valor a: `https://app.withmia.com`
4. Click **"Update"**

---

### 2️⃣ Agregar Variables Faltantes

**Faltan estas variables importantes:**

```bash
SESSION_DOMAIN=.withmia.com
SESSION_SECURE_COOKIE=true
LOG_LEVEL=error
```

**Cómo agregarlas:**
1. En Railway → **Settings** → **Variables**
2. Click **"+ New Variable"**
3. Agrega cada una:
   - Name: `SESSION_DOMAIN`, Value: `.withmia.com`
   - Name: `SESSION_SECURE_COOKIE`, Value: `true`
   - Name: `LOG_LEVEL`, Value: `error`

---

### 3️⃣ Verificar Variables de Redis (Importante para rendimiento)

Tu configuración actual usa:
```
CACHE_STORE="redis"
SESSION_DRIVER="database"
QUEUE_CONNECTION="database"
```

**Recomendación:** Ya que tienes Redis, úsalo para todo (mejor rendimiento):

```bash
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

**Cómo actualizar:**
1. En Railway → **Settings** → **Variables**
2. Busca `SESSION_DRIVER` y cámbialo a: `redis`
3. Busca `QUEUE_CONNECTION` y cámbialo a: `redis`

---

### 4️⃣ Cambiar APP_DEBUG (Seguridad)

Tu variable actual:
```
APP_DEBUG="false" (con comillas)
```

**Debe ser:**
```
APP_DEBUG=false (sin comillas)
```

**Cómo cambiarlo:**
1. Railway → **Settings** → **Variables**
2. Busca `APP_DEBUG`
3. Cambia a: `false` (sin comillas)

---

## 🎯 OPCIÓN RÁPIDA: Reemplazar TODO

Si prefieres reemplazar todas las variables de una vez:

### Método 1: Raw Editor (Recomendado)
1. Railway → **Settings** → **Variables**
2. Click **"Raw Editor"** (esquina superior derecha)
3. **SELECCIONA TODO** el contenido actual y **BÓRRALO**
4. Abre `RAILWAY_VARIABLES_ACTUALIZADO.txt`
5. **COPIA TODO** el contenido
6. **PÉGALO** en el Raw Editor
7. Click **"Update Variables"**
8. Railway reiniciará el servicio automáticamente

---

## 📋 Verificar Variables Críticas

Después de actualizar, verifica que tengas estas variables:

### ✅ Variables Obligatorias:
- [x] `APP_KEY` (tu key actual)
- [x] `APP_URL=https://app.withmia.com`
- [x] `APP_ENV=production`
- [x] `APP_DEBUG=false`
- [x] `DB_CONNECTION=mysql`
- [x] `REDIS_HOST=${REDISHOST}`
- [x] `SESSION_DOMAIN=.withmia.com`

### 🔄 Variables que Railway Inyecta (NO las agregues manualmente):
- `MYSQLHOST`
- `MYSQLPORT`
- `MYSQLDATABASE`
- `MYSQLUSER`
- `MYSQLPASSWORD`
- `REDISHOST`
- `REDISPORT`
- `REDISPASSWORD`
- `PORT`

---

## 🚀 Después de Actualizar Variables

1. **Railway reiniciará automáticamente** tu servicio
2. Ve a **Deployments** y espera que termine
3. Verifica los logs: debe decir `✅ Aplicación lista para deployment`

---

## 🌐 Configurar Dominio app.withmia.com

Una vez que las variables estén correctas y el deployment funcione:

### A. En Railway
1. **Settings** → **Domains**
2. Click **"+ Custom Domain"**
3. Escribe: `app.withmia.com`
4. Copia el CNAME que te muestra (ej: `mia-app-production-xxxx.up.railway.app`)

### B. En cPanel
1. **Zone Editor** → Busca `withmia.com`
2. Click **"Manage"**
3. **Agrega CNAME:**
   ```
   Type: CNAME
   Name: app
   CNAME: [PEGA_EL_VALOR_DE_RAILWAY]
   TTL: 14400
   ```

### C. Esperar (15-30 min)
```cmd
nslookup app.withmia.com
```

---

## ✅ Verificar que Todo Funciona

### 1. Healthcheck
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

### 2. Verificar Redis (opcional)
En Railway, ve a **Deployments** → **View Logs**

Busca líneas como:
```
✅ Redis conectado
✅ Cache store: redis
```

---

## 🎯 Checklist de Actualización

- [ ] `APP_URL` cambiado a `https://app.withmia.com`
- [ ] `APP_DEBUG` cambiado a `false` (sin comillas)
- [ ] `SESSION_DOMAIN` agregado (`.withmia.com`)
- [ ] `SESSION_SECURE_COOKIE` agregado (`true`)
- [ ] `SESSION_DRIVER` cambiado a `redis`
- [ ] `QUEUE_CONNECTION` cambiado a `redis`
- [ ] `LOG_LEVEL` cambiado a `error`
- [ ] Deployment exitoso después de cambios
- [ ] Dominio custom configurado
- [ ] DNS propagado
- [ ] `/api/health` responde correctamente

---

## 💡 Beneficios de Usar Redis

Ya que tienes Redis configurado, aprovechar estas ventajas:

- ✅ **Sessions en Redis** = Más rápido, no sobrecarga DB
- ✅ **Cache en Redis** = Queries más rápidas
- ✅ **Queue en Redis** = Procesamiento async más eficiente
- ✅ **Mejor rendimiento general** = App más rápida

---

## 🆘 Si Algo Falla

### Error: "Connection refused" (Redis)
**Causa:** Variables de Redis mal configuradas

**Solución:**
Verifica que tengas:
```bash
REDIS_HOST=${REDISHOST}
REDIS_PORT=${REDISPORT}
REDIS_PASSWORD=${REDISPASSWORD}
```

### Error: "Access denied for user" (MySQL)
**Causa:** Variables de MySQL mal configuradas

**Solución:**
Verifica que tengas:
```bash
DB_HOST=${MYSQLHOST}
DB_USER=${MYSQLUSER}
DB_PASSWORD=${MYSQLPASSWORD}
```

### Deployment se queda en "Building"
**Causa:** Error en build

**Solución:**
1. Ve a **Deployments** → Click en el deployment actual
2. Click **"View Logs"**
3. Busca líneas rojas (errores)
4. Si dice "npm failed", verifica que `package-lock.json` esté en el repo

---

## 📞 Siguiente Paso

Después de actualizar las variables:

1. **Lee:** `PASOS_RAPIDOS.md` desde el **Paso 3** (Configurar Dominio)
2. **Usa:** `RAILWAY_VARIABLES_ACTUALIZADO.txt` para las variables
3. **Verifica:** Que el deployment sea exitoso antes de configurar el dominio

¡Tu app está casi lista! 🚀
