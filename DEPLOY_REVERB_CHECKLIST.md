# ⚡ Checklist Rápido: Deploy de Reverb en Railway

## 📋 Pasos para Activar WebSockets

### 1️⃣ Copiar Variables de Entorno (2 minutos)

Abrir Railway Dashboard → Ir a tu proyecto → Variables:

```bash
# Copiar TODO esto:

BROADCAST_DRIVER=reverb

REVERB_APP_ID=mia-app
REVERB_APP_KEY=a3f8e9c2d1b4a7f6e9c8d2b1a4f7e6c9
REVERB_APP_SECRET=1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b
REVERB_HOST=0.0.0.0
REVERB_PORT=8081
REVERB_SCHEME=https

VITE_REVERB_APP_KEY=a3f8e9c2d1b4a7f6e9c8d2b1a4f7e6c9
VITE_REVERB_HOST=${RAILWAY_PUBLIC_DOMAIN}
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https

VITE_PUSHER_APP_KEY=a3f8e9c2d1b4a7f6e9c8d2b1a4f7e6c9
VITE_PUSHER_HOST=${RAILWAY_PUBLIC_DOMAIN}
VITE_PUSHER_PORT=443
VITE_PUSHER_SCHEME=https
```

✅ Click en **Save**

---

### 2️⃣ Hacer Commit y Push (1 minuto)

Abrir GitHub Desktop:

1. Ver todos los archivos cambiados
2. Escribir commit: `feat: Implementar Laravel Reverb (WebSockets) para reemplazar polling`
3. Click **Commit to main**
4. Click **Push origin**

---

### 3️⃣ Esperar Deploy (2-3 minutos)

Railway detectará los cambios automáticamente y hará deploy.

**Verificar en Railway Logs:**
```
✅ Building...
✅ Reverb server started
✅ Laravel application ready
```

---

### 4️⃣ Verificar que Funciona (30 segundos)

1. **Abrir app en producción**: `https://mia-app.up.railway.app`
2. **Ir al Dashboard**
3. **Abrir DevTools** (F12)
4. **Ver Console**

Debes ver:

```javascript
✅ Echo connected successfully
✅ 📡 WhatsApp status actualizado vía WebSocket: {...}
```

---

## 🎉 ¡Listo!

Tu app ahora usa **WebSockets en tiempo real** en lugar de polling.

### Mejoras:
- ✅ Actualizaciones instantáneas (< 1 segundo vs 30 segundos)
- ✅ 120 requests menos por hora
- ✅ Menor carga del servidor
- ✅ Mejor experiencia de usuario

---

## 🐛 Si algo falla:

### Error: "Echo is not defined"

**Solución**: Rehacer build del frontend
```bash
npm run build
```
Hacer commit y push nuevamente.

### Error: "WebSocket connection failed"

**Solución**: Verificar que `BROADCAST_DRIVER=reverb` esté en Railway.

### Error: "Invalid app key"

**Solución**: Las 3 claves deben ser iguales:
- `REVERB_APP_KEY`
- `VITE_REVERB_APP_KEY`
- `VITE_PUSHER_APP_KEY`

---

## 📚 Documentación Completa

- `REVERB_IMPLEMENTATION.md` → Resumen completo de cambios
- `REVERB_SETUP.md` → Guía técnica detallada
- `RAILWAY_REVERB_VARIABLES.md` → Variables explicadas

---

**Tiempo total estimado: 5 minutos** ⏱️
