# 🔴 Configuración de Redis en Railway

## Paso 1: Agregar Redis a tu proyecto Railway

1. Ve a tu proyecto en Railway
2. Click en **"+ New"**
3. Selecciona **"Database"** → **"Redis"**
4. Railway creará el servicio Redis automáticamente

## Paso 2: Variables de Entorno

Railway inyecta automáticamente estas variables:
- `REDISHOST`
- `REDISPORT`
- `REDISUSER`
- `REDISPASSWORD`

## Paso 3: Configurar Laravel

En la pestaña **Variables** de tu servicio Laravel, agrega:

```env
REDIS_HOST=${REDISHOST}
REDIS_PORT=${REDISPORT}
REDIS_USERNAME=${REDISUSER}
REDIS_PASSWORD=${REDISPASSWORD}
REDIS_CLIENT=phpredis
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

## Paso 4: Re-deploy

Railway hará automáticamente un nuevo deploy con Redis configurado.

## ✅ Verificar Redis

Después del deploy, verifica en los logs de Railway:
```bash
✅ Redis connection successful
```

## 🎯 Sin Redis (Fallback)

Si NO agregas Redis, la aplicación funcionará con:
- Cache: `file`
- Session: `file`

Simplemente no configures las variables de Redis y la app usará archivos locales.

## 📋 Variables Railway Actuales

Revisa tu archivo `.env.railway.example` para ver todas las variables necesarias.
