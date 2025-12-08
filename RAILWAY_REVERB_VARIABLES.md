# Variables de Entorno para Laravel Reverb en Railway

## 🔐 Claves Generadas

Copiar estas variables en Railway → Variables de Entorno:

```bash
# Broadcasting
BROADCAST_DRIVER=reverb

# Reverb Backend
REVERB_APP_ID=mia-app
REVERB_APP_KEY=a3f8e9c2d1b4a7f6e9c8d2b1a4f7e6c9
REVERB_APP_SECRET=1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b

# Reverb Server
REVERB_HOST=0.0.0.0
REVERB_PORT=8081
REVERB_SCHEME=https

# Frontend (Vite) - Usar dominio de Railway
VITE_REVERB_APP_KEY=a3f8e9c2d1b4a7f6e9c8d2b1a4f7e6c9
VITE_REVERB_HOST=${RAILWAY_PUBLIC_DOMAIN}
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https

VITE_PUSHER_APP_KEY=a3f8e9c2d1b4a7f6e9c8d2b1a4f7e6c9
VITE_PUSHER_HOST=${RAILWAY_PUBLIC_DOMAIN}
VITE_PUSHER_PORT=443
VITE_PUSHER_SCHEME=https
```

## 🚀 Instrucciones

1. **Abrir Railway Dashboard**
   - Ir al proyecto: mia-app

2. **Variables de Entorno**
   - Click en el servicio Laravel
   - Ir a "Variables" tab
   - Pegar todas las variables de arriba

3. **Deployment Automático**
   - Railway detectará los cambios
   - Se iniciará un nuevo deployment
   - Esperar a que termine (2-3 minutos)

4. **Verificar que funciona**
   - Abrir la app en el navegador
   - Ir al Dashboard
   - Abrir DevTools → Console
   - Buscar mensaje: "Echo connected successfully"
   - Buscar mensaje: "📡 WhatsApp status actualizado vía WebSocket"

## 🔄 Si necesitas regenerar las claves

Simplemente cambia los valores de:
- `REVERB_APP_KEY`
- `REVERB_APP_SECRET`
- `VITE_REVERB_APP_KEY`
- `VITE_PUSHER_APP_KEY`

Por otros valores aleatorios de al menos 32 caracteres.

## ⚠️ IMPORTANTE

Las claves `VITE_REVERB_APP_KEY` y `VITE_PUSHER_APP_KEY` deben ser **exactamente iguales** a `REVERB_APP_KEY`.

Railway interpolará `${RAILWAY_PUBLIC_DOMAIN}` automáticamente con tu dominio real.
