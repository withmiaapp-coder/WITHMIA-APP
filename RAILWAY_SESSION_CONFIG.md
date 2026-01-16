# Configuración de Sesiones para Railway Edge

## Problema
Railway/Cloudflare Edge está "stripping" las cookies `Set-Cookie`, causando que la sesión se pierda entre requests.

## Solución
Configurar las cookies de sesión para que funcionen correctamente con Railway Edge/Cloudflare.

## Variables de Entorno en Railway

Asegúrate de tener estas variables configuradas en Railway:

```bash
# Sesiones
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

# CRÍTICO: Configuración de Cookies para Railway Edge
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none
SESSION_PARTITIONED_COOKIE=true
SESSION_HTTP_ONLY=true

# APP
APP_URL=https://app.withmia.com
FRONTEND_URL=https://app.withmia.com
```

## ¿Por qué estos valores?

1. **SESSION_SECURE_COOKIE=true**: Las cookies solo se envían por HTTPS (Railway usa HTTPS)

2. **SESSION_SAME_SITE=none**: Permite que las cookies se envíen en contextos cross-site. Esto es necesario cuando Railway/Cloudflare Edge proxea las requests.

3. **SESSION_PARTITIONED_COOKIE=true**: Las cookies particionadas son requeridas cuando `SameSite=None`. Esto ata la cookie al sitio de nivel superior.

4. **SESSION_HTTP_ONLY=true**: Previene que JavaScript acceda a la cookie (seguridad)

## Verificar en Railway

```bash
# Ver variables actuales
railway variables

# Agregar/Actualizar variables
railway variables set SESSION_SAME_SITE=none
railway variables set SESSION_PARTITIONED_COOKIE=true
railway variables set SESSION_SECURE_COOKIE=true

# Redeploy después de cambiar variables
railway up
```

## Debugging

Si sigues teniendo problemas, verifica:

1. **Headers de Response**: Asegúrate de que `Set-Cookie` incluya `SameSite=None; Secure; Partitioned`

2. **Logs**: Revisa que la sesión ID sea la misma entre requests:
```bash
railway logs --tail 50
```

3. **Browser DevTools**: 
   - Application > Cookies
   - Network > Response Headers
   - Busca `Set-Cookie` con los atributos correctos

## Configuración CORS

El archivo `config/cors.php` ya está configurado correctamente:

```php
'exposed_headers' => ['Set-Cookie'],
'supports_credentials' => true,
```

Esto es necesario para que las cookies funcionen con CORS.

## Middleware Trust Proxies

El `bootstrap/app.php` ya tiene:

```php
$middleware->trustProxies(at: '*');
```

Esto asegura que Laravel confíe en los proxies de Railway para detectar HTTPS correctamente.

## Resultado Esperado

Con esta configuración:

✅ Las cookies de sesión se preservarán entre requests
✅ El login persistirá correctamente
✅ `/onboarding` tendrá acceso a la sesión autenticada
✅ No necesitarás el sistema `auth_token` manual
