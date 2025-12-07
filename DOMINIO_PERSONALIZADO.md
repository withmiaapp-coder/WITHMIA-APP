# 🌐 Configurar Dominio Personalizado app.withmia.com en Railway

## 📋 Pasos para Conectar tu Dominio

### 1️⃣ Configurar Dominio en Railway

1. Ve a tu proyecto en Railway Dashboard
2. Selecciona tu servicio (mia-app)
3. Ve a **Settings** → **Domains**
4. Click en **"+ Custom Domain"**
5. Ingresa: `app.withmia.com`
6. Railway te mostrará un **registro CNAME** como:
   ```
   CNAME: xxx-production.up.railway.app
   ```
   **¡COPIA ESTE VALOR!** Lo necesitarás en el siguiente paso.

### 2️⃣ Configurar DNS en cPanel

#### Opción A: Si tienes acceso a la Zona DNS en cPanel

1. En cPanel, ve a **"Zone Editor"** o **"Editor de Zona DNS"**
2. Busca el dominio `withmia.com`
3. Click en **"Manage"** o **"Administrar"**
4. **Elimina** cualquier registro existente para `app` (si existe)
5. Agrega un **nuevo registro CNAME**:
   ```
   Type: CNAME
   Name: app
   CNAME: xxx-production.up.railway.app
   TTL: 14400 (o automático)
   ```
6. Click **"Add Record"** o **"Agregar Registro"**

#### Opción B: Si usas un subdominio ya creado en cPanel

1. En cPanel, ve a **"Subdomains"** o **"Subdominios"**
2. Busca `app.withmia.com`
3. Click en **"Manage"** o **"Administrar"**
4. **Importante:** Elimina o desactiva el subdominio en cPanel (ya no apuntará al servidor cPanel, sino a Railway)
5. Luego, ve a **"Zone Editor"** y agrega el CNAME como se explicó arriba

### 3️⃣ Configurar Variables de Entorno en Railway

Ve a **Settings** → **Variables** y actualiza/agrega:

```bash
APP_URL=https://app.withmia.com
SESSION_DOMAIN=.withmia.com
```

### 4️⃣ Actualizar Configuración de Session (Laravel)

Railway aplicará automáticamente la variable `SESSION_DOMAIN`, pero asegúrate de que esté configurada.

### 5️⃣ Verificar Propagación DNS

La propagación DNS puede tomar entre **5 minutos a 48 horas**. Para verificar:

#### Verificar con nslookup (Windows):
```cmd
nslookup app.withmia.com
```

Deberías ver algo como:
```
Name:    xxx-production.up.railway.app
Address: 35.x.x.x
Aliases: app.withmia.com
```

#### Verificar online:
- Usa [dnschecker.org](https://dnschecker.org) con `app.withmia.com`
- Debe mostrar el registro CNAME apuntando a Railway

### 6️⃣ Habilitar HTTPS (Automático)

Railway automáticamente generará un certificado SSL de Let's Encrypt para tu dominio. Esto puede tomar unos minutos después de que el DNS se propague.

Verifica en Railway:
- Ve a **Settings** → **Domains**
- Debe mostrar un ✅ verde junto a `app.withmia.com`
- Estado: **"SSL Certificate Active"**

## 🔒 Configuración de Seguridad Adicional

Si usas cookies o sesiones, agrega en Railway Variables:

```bash
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
```

## 🧪 Probar tu Dominio

Una vez que el DNS se propague, verifica:

1. **Healthcheck:**
   ```
   https://app.withmia.com/api/health
   ```

2. **Aplicación principal:**
   ```
   https://app.withmia.com
   ```

## ⚠️ Problemas Comunes

### ❌ "DNS_PROBE_FINISHED_NXDOMAIN"
**Causa:** DNS no ha propagado o CNAME mal configurado

**Solución:**
1. Verifica que el CNAME esté correcto en cPanel
2. Espera 15-30 minutos
3. Limpia caché DNS local:
   ```cmd
   ipconfig /flushdns
   ```

### ❌ "ERR_SSL_VERSION_OR_CIPHER_MISMATCH"
**Causa:** Certificado SSL aún no generado

**Solución:**
1. Espera 5-10 minutos después de que DNS propague
2. Railway generará automáticamente el certificado
3. Verifica estado en Railway → Settings → Domains

### ❌ "Too many redirects" o "Redirect loop"
**Causa:** Configuración de HTTPS incorrecta

**Solución:**
Agrega en Railway Variables:
```bash
FORCE_HTTPS=true
```

Y en Laravel, verifica `app/Http/Middleware/TrustProxies.php`:
```php
protected $proxies = '*';
```

## 📊 Checklist de Configuración

- [ ] Dominio personalizado agregado en Railway
- [ ] Registro CNAME copiado de Railway
- [ ] CNAME agregado en cPanel Zone Editor
- [ ] Subdominio cPanel desactivado/eliminado
- [ ] `APP_URL=https://app.withmia.com` configurado en Railway
- [ ] `SESSION_DOMAIN=.withmia.com` configurado en Railway
- [ ] DNS propagado (verificado con nslookup)
- [ ] Certificado SSL activo en Railway
- [ ] `https://app.withmia.com/api/health` responde correctamente
- [ ] Aplicación funcional en `https://app.withmia.com`

## 🆘 Necesitas Ayuda con cPanel?

Si no tienes acceso a Zone Editor o tienes problemas, contacta a tu proveedor de hosting con esta información:

```
Necesito crear un registro CNAME para:
- Subdominio: app.withmia.com
- Apunta a: [COPIA_AQUI_EL_VALOR_DE_RAILWAY]
- TTL: 14400
```

---

## 🎯 Próximos Pasos

1. **Configurar dominio en Railway** → Copia el CNAME
2. **Configurar CNAME en cPanel** → Apunta a Railway
3. **Esperar propagación DNS** (15-30 min normalmente)
4. **Verificar** que `https://app.withmia.com` funciona

¡Tu aplicación estará en tu dominio personalizado! 🚀
