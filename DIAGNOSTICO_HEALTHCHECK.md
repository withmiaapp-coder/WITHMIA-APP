# 🔍 DIAGNÓSTICO - Healthcheck Failure

## ❌ Error Detectado
```
Network > Healthcheck
Healthcheck failure
```

## 🎯 Causas Posibles

### 1. Variables de Entorno No Configuradas
El error más común es que **no actualizaste las variables** en Railway.

**Verificar:**
1. Railway → Settings → Variables
2. Debe tener `APP_KEY`, `APP_URL`, etc.

**Si NO las has actualizado:**
- Abre `RAILWAY_VARIABLES_ACTUALIZADO.txt`
- Ve a Railway → Settings → Variables → Raw Editor
- Borra todo y pega el contenido del archivo
- Click "Update Variables"

### 2. Base de Datos No Conectada
Railway no puede conectar con MySQL.

**Verificar en Railway:**
1. ¿Agregaste MySQL database?
2. Settings → Variables → ¿Existe `MYSQLHOST`?
3. Si no, agrega MySQL: + New → Database → Add MySQL

### 3. Redis No Configurado
El app intenta conectar a Redis pero no existe.

**Soluciones:**

**Opción A: Usar Redis (recomendado)**
1. Railway → + New → Database → Add Redis
2. Actualiza variables en Railway

**Opción B: No usar Redis (temporal)**
Cambia estas variables en Railway:
```
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
```

### 4. Puerto Incorrecto
El servidor no está escuchando en el puerto correcto.

**Ya está configurado correctamente en `railway.json`:**
```json
"startCommand": "php artisan serve --host=0.0.0.0 --port=${PORT:-8080}"
```

### 5. Healthcheck Timeout
El servidor tarda mucho en iniciar.

**Ya ajustado:**
- Healthcheck cambió de `/api/health` a `/up` (más rápido)
- Timeout: 300 segundos

---

## 🛠️ SOLUCIÓN RÁPIDA

### Paso 1: Verificar Variables en Railway

**Ir a:** Settings → Variables

**Variables CRÍTICAS que DEBEN existir:**
```
APP_KEY=base64:fW9jZGRkNWE2MTg5NTQyZjFhMzBmNjA4YjQ5YWRlNGQyZDg3MzNiNGFiZDc5MThjZThhOTNlODU3YWE1ZDEx
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.withmia.com
DB_CONNECTION=mysql
```

**Variables que Railway CREA AUTOMÁTICAMENTE:**
```
MYSQLHOST
MYSQLPORT
MYSQLDATABASE
MYSQLUSER
MYSQLPASSWORD
PORT
```

Si faltan las del primer grupo → **Actualiza variables con `RAILWAY_VARIABLES_ACTUALIZADO.txt`**

Si faltan las del segundo grupo → **Agrega MySQL database en Railway**

---

### Paso 2: Usar Variables Simplificadas (Sin Redis)

Si quieres desplegar AHORA sin Redis, usa estas variables:

```env
APP_NAME=WithMIA
APP_ENV=production
APP_KEY=base64:fW9jZGRkNWE2MTg5NTQyZjFhMzBmNjA4YjQ5YWRlNGQyZDg3MzNiNGFiZDc5MThjZThhOTNlODU3YWE1ZDEx
APP_DEBUG=false
APP_URL=https://app.withmia.com

DB_CONNECTION=mysql
DB_HOST=${MYSQLHOST}
DB_PORT=${MYSQLPORT}
DB_DATABASE=${MYSQLDATABASE}
DB_USERNAME=${MYSQLUSER}
DB_PASSWORD=${MYSQLPASSWORD}

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_DOMAIN=.withmia.com
SESSION_SECURE_COOKIE=true

CACHE_STORE=database
QUEUE_CONNECTION=database

BROADCAST_DRIVER=log
FILESYSTEM_DISK=public

LOG_CHANNEL=stack
LOG_LEVEL=error
```

**Cómo aplicar:**
1. Railway → Settings → Variables → Raw Editor
2. Borra todo
3. Pega lo de arriba
4. Click "Update Variables"

---

### Paso 3: Ver Logs Detallados

Para saber exactamente qué falla:

1. Railway → Deployments → Click en el deployment FAILED
2. Click "View logs"
3. Busca líneas rojas (errores)
4. Copia y pega aquí los errores

**Errores comunes:**

```bash
# Error 1: APP_KEY faltante
"No application encryption key has been specified"
→ Solución: Agrega APP_KEY en variables

# Error 2: MySQL no conecta
"SQLSTATE[HY000] [2002] Connection refused"
→ Solución: Verifica que MySQL esté agregado

# Error 3: Redis no conecta
"Connection refused [tcp://127.0.0.1:6379]"
→ Solución: Cambia a SESSION_DRIVER=database

# Error 4: Permisos
"Permission denied"
→ Solución: Ya resuelto en railway-init.sh
```

---

## 🚀 HACER AHORA (Orden de prioridad)

### 1️⃣ Commit los nuevos cambios
```bash
# En GitHub Desktop:
Summary: Fix Railway healthcheck configuration
Description: Change healthcheck to /up endpoint and simplify init script

# Luego: Commit to main → Push origin
```

### 2️⃣ Actualizar Variables en Railway

**Opción A: Con Redis (completo)**
- Usa `RAILWAY_VARIABLES_ACTUALIZADO.txt`
- Requiere agregar Redis database

**Opción B: Sin Redis (más rápido)** ⭐
- Usa las variables del "Paso 2" arriba
- Solo requiere MySQL (ya lo tienes)

### 3️⃣ Esperar Nuevo Deployment

Railway detectará el push y desplegará automáticamente.

**Verificar:**
- Deployments → View logs
- Debe decir: "✅ Aplicación lista para deployment"

### 4️⃣ Si Sigue Fallando

Copia los logs y compártelos para diagnosticar.

---

## 📋 Checklist de Diagnóstico

- [ ] Variables actualizadas en Railway
- [ ] APP_KEY existe en variables
- [ ] MySQL database agregado en Railway
- [ ] Variables MYSQL* existen (automáticas)
- [ ] Commit y push de nuevos cambios
- [ ] Nuevo deployment iniciado
- [ ] Logs revisados (sin errores rojos)
- [ ] Healthcheck exitoso

---

## 💡 Tip Rápido

**Si quieres desplegar YA sin complicaciones:**

1. **No uses Redis por ahora** (usa database para sessions/cache)
2. **Asegúrate que MySQL esté agregado**
3. **Usa las variables simplificadas del Paso 2**
4. **Commit y push los cambios**
5. **Espera 3-5 minutos**

Después puedes agregar Redis cuando todo funcione.

---

## 🆘 ¿Necesitas Ayuda?

Comparte:
1. Screenshot de Railway → Settings → Variables
2. Logs completos del deployment fallido
3. ¿Ya agregaste MySQL database?
4. ¿Ya agregaste Redis database?

Con esa info puedo darte la solución exacta.
