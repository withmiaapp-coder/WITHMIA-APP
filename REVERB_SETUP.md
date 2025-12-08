# Configuración de Laravel Reverb para Railway

## ✅ Cambios Implementados

### 1. Backend - Eventos WebSocket

Se creó el evento `WhatsAppStatusChanged` que se dispara automáticamente cuando:
- Evolution API envía un webhook de `connection.update`
- El usuario hace check manual del estado de WhatsApp via `getStatus()`

**Archivo**: `app/Events/WhatsAppStatusChanged.php`

**Canal de broadcasting**: `company.{companySlug}.whatsapp`

**Datos enviados**:
```php
[
    'instanceName' => 'nombre-instancia',
    'state' => 'open|close|connecting',
    'qrCode' => 'data:image/png;base64,...' | null,
    'profileInfo' => [...] | null
]
```

### 2. Frontend - Hook de React

**Archivo**: `resources/js/hooks/useReverb.ts`

Hook personalizado que:
- Inicializa Laravel Echo con Pusher
- Maneja suscripciones a canales públicos y privados
- Proporciona métodos: `subscribe()`, `subscribePrivate()`, `leave()`

### 3. Integración en Dashboard

**Archivo**: `resources/js/pages/Dashboard.tsx`

✅ **ANTES** (Polling cada 30 segundos):
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    checkWhatsAppStatus(); // API request cada 30s
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

✅ **AHORA** (WebSocket en tiempo real):
```typescript
useEffect(() => {
  checkWhatsAppStatus(); // Solo una vez al montar
  
  const channelName = `company.${companySlug}.whatsapp`;
  subscribe(channelName, 'WhatsAppStatusChanged', (data) => {
    // Actualización instantánea sin hacer request
    setWhatsappConnected(data.status.connected);
    setWhatsappQr(data.status.qrCode);
  });
  
  return () => leave(channelName);
}, [companySlug]);
```

## 📋 Variables de Entorno Necesarias en Railway

Agregar estas variables en el servicio de Railway:

```bash
# Broadcasting
BROADCAST_DRIVER=reverb

# Reverb Configuration
REVERB_APP_ID=mia-app
REVERB_APP_KEY=your-random-key-here
REVERB_APP_SECRET=your-random-secret-here
REVERB_HOST=0.0.0.0
REVERB_PORT=8081
REVERB_SCHEME=https

# Frontend (para Vite)
VITE_REVERB_APP_KEY=${REVERB_APP_KEY}
VITE_REVERB_HOST=${RAILWAY_PUBLIC_DOMAIN}
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
VITE_PUSHER_APP_KEY=${REVERB_APP_KEY}
VITE_PUSHER_HOST=${RAILWAY_PUBLIC_DOMAIN}
VITE_PUSHER_PORT=443
VITE_PUSHER_SCHEME=https
```

## 🔐 Generar Keys de Reverb

Ejecutar en local o en Railway via terminal:

```bash
php artisan reverb:install
```

Esto generará automáticamente:
- REVERB_APP_ID
- REVERB_APP_KEY  
- REVERB_APP_SECRET

## 🚀 Deployment en Railway

### Opción 1: Archivo nixpacks.toml (Ya configurado)

El archivo `nixpacks.toml` ya está configurado para iniciar Reverb:

```toml
[start]
cmd = "php artisan reverb:start --host=0.0.0.0 --port=8081 & php artisan serve --host=0.0.0.0 --port=8080"
```

### Opción 2: Comando Start Manual

Si nixpacks.toml no funciona, configurar en Railway:

**Start Command**:
```bash
php artisan reverb:start --host=0.0.0.0 --port=8081 & php artisan serve --host=0.0.0.0 --port=8080
```

## 🔌 Configuración de Puertos en Railway

Railway debe exponer **DOS puertos**:

1. **Puerto 8080**: Laravel HTTP server (ya configurado)
2. **Puerto 8081**: Reverb WebSocket server (nuevo)

### Configurar en Railway Settings:

```
Networking → Public Networking → Custom Domain
- Agregar dominio principal: mia-app.up.railway.app (puerto 8080)
- Agregar subdominio WebSocket: ws.mia-app.up.railway.app (puerto 8081)
```

O usar el mismo dominio para ambos (Railway enruta automáticamente).

## ✅ Verificar que Funciona

### 1. Logs de Laravel (Railway)

Buscar en los logs:

```
[INFO] Reverb server started
[INFO] WhatsApp Status Check
[INFO] 📡 WhatsApp status actualizado vía WebSocket
[INFO] ✅ WhatsAppStatusChanged event broadcasted
```

### 2. Consola del Navegador

Abrir Dashboard y ver en console:

```javascript
Echo connected successfully
📡 WhatsApp status actualizado vía WebSocket: {instanceName: "...", state: "open"}
```

### 3. Network Tab

Verificar conexión WebSocket activa:
- Tipo: `websocket`
- URL: `wss://mia-app.up.railway.app/app/mia-app?protocol=7`
- Status: `101 Switching Protocols` (verde)

## 🐛 Troubleshooting

### Error: "Unable to connect to Reverb"

**Causa**: Reverb no está corriendo o puerto incorrecto

**Solución**:
```bash
# En Railway terminal
php artisan reverb:restart
```

### Error: "Invalid app key"

**Causa**: VITE_REVERB_APP_KEY no coincide con REVERB_APP_KEY

**Solución**: Verificar que sean iguales en Railway Variables

### Error: WebSocket connection failed

**Causa**: Railway no está exponiendo el puerto 8081

**Solución**: Agregar puerto 8081 en Railway Networking settings

### Performance: Mensajes duplicados

**Causa**: Polling aún activo junto con WebSocket

**Solución**: Ya eliminado en Dashboard.tsx (ver arriba)

## 📊 Mejoras de Performance Esperadas

| Métrica | Antes (Polling) | Ahora (WebSocket) |
|---------|-----------------|-------------------|
| Latencia de actualización | 30 segundos | < 1 segundo |
| Requests HTTP innecesarios | 120/hora | 0 |
| Carga del servidor | Alta | Mínima |
| Experiencia de usuario | Lenta | Tiempo real |

## 🎯 Próximos Pasos

1. ✅ Configurar variables de entorno en Railway
2. ✅ Verificar que nixpacks.toml esté ejecutando Reverb
3. ✅ Deploy y probar en producción
4. ⏳ Migrar otras funcionalidades a WebSocket:
   - Notificaciones de nuevos mensajes
   - Actualización de conversaciones
   - Estados de agentes en tiempo real
   - Métricas del dashboard

## 📚 Referencias

- [Laravel Reverb Documentation](https://laravel.com/docs/11.x/reverb)
- [Laravel Echo Documentation](https://laravel.com/docs/11.x/broadcasting#client-side-installation)
- [Railway WebSocket Guide](https://docs.railway.app/guides/websockets)
