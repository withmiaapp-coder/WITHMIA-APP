# 🚀 Configuración de Pusher WebSockets

## ✅ Por qué Pusher en lugar de Reverb

- ✅ **Gratis**: 200k mensajes/día, 100 conexiones simultáneas
- ✅ **Sin configuración de servidor**: Funciona en Railway free tier
- ✅ **Fiable**: Infraestructura gestionada por Pusher
- ✅ **Fácil**: Solo configurar variables de entorno

---

## 1️⃣ Crear Cuenta en Pusher

1. **Ir a**: https://pusher.com/
2. **Sign Up** con Google o email
3. **Crear App**:
   - Name: `WithMIA Production`
   - Cluster: `us2` (más cercano a Railway us-west)
   - Tech Stack: Laravel

---

## 2️⃣ Obtener Credenciales

En el Dashboard de Pusher → App Keys:

```
app_id: 1234567
key: a1b2c3d4e5f6g7h8i9j0
secret: k1l2m3n4o5p6q7r8s9t0
cluster: us2
```

---

## 3️⃣ Configurar en Railway

**Variables de entorno a agregar:**

```bash
# Broadcasting
BROADCAST_DRIVER=pusher

# Pusher Backend
PUSHER_APP_ID=1234567
PUSHER_APP_KEY=a1b2c3d4e5f6g7h8i9j0
PUSHER_APP_SECRET=k1l2m3n4o5p6q7r8s9t0
PUSHER_APP_CLUSTER=us2

# Pusher Frontend (Vite)
VITE_PUSHER_APP_KEY=a1b2c3d4e5f6g7h8i9j0
VITE_PUSHER_APP_CLUSTER=us2
VITE_PUSHER_HOST=
VITE_PUSHER_PORT=443
VITE_PUSHER_SCHEME=https
VITE_PUSHER_FORCE_TLS=true
```

**Variables a ELIMINAR:**

```bash
# Eliminar todas las variables de Reverb:
REVERB_APP_ID
REVERB_APP_KEY
REVERB_APP_SECRET
REVERB_HOST
REVERB_PORT
REVERB_SCHEME
VITE_REVERB_APP_KEY
VITE_REVERB_HOST
VITE_REVERB_PORT
VITE_REVERB_SCHEME
```

---

## 4️⃣ Deploy

1. **Guardar variables** en Railway
2. **Railway hará deploy automático**
3. **Esperar 2-3 minutos**

---

## 5️⃣ Verificar

### En Browser Console:

```javascript
✅ Echo conectado a Pusher exitosamente
📍 Cluster: us2
```

### En Pusher Dashboard:

- **Debug Console** → Ver eventos en tiempo real
- **Connection Explorer** → Ver conexiones activas

---

## 📊 Límites del Plan Gratuito

| Recurso | Límite Gratuito | Suficiente para |
|---------|-----------------|-----------------|
| Mensajes | 200,000/día | ~6,800/hora = 100+ usuarios activos |
| Conexiones | 100 simultáneas | 100 usuarios al mismo tiempo |
| Canales | Ilimitados | ✅ |
| Bandwidth | 100 GB/mes | ✅ |

**Costo del plan pagado**: $49/mes (20M mensajes, 500 conexiones)

---

## 🔧 Configuración Backend (Ya hecha)

El código ya está configurado para usar Pusher:

### `config/broadcasting.php`
```php
'pusher' => [
    'driver' => 'pusher',
    'key' => env('PUSHER_APP_KEY'),
    'secret' => env('PUSHER_APP_SECRET'),
    'app_id' => env('PUSHER_APP_ID'),
    'options' => [
        'cluster' => env('PUSHER_APP_CLUSTER'),
        'useTLS' => true,
    ],
],
```

### Eventos Broadcasting
- `WhatsAppStatusChanged` → `company.{slug}.whatsapp`
- `ConversationUpdated` → `inbox.{id}.conversation`
- `NewMessageReceived` → `inbox.{id}.message`

---

## 🐛 Troubleshooting

### Error: "Failed to connect to Pusher"

**Causa**: Credenciales incorrectas

**Solución**:
1. Verificar que `PUSHER_APP_KEY` y `VITE_PUSHER_APP_KEY` sean iguales
2. Verificar que `PUSHER_APP_CLUSTER` sea correcto (ej: `us2`)
3. Hacer rebuild en Railway

### Error: "Pusher : No callbacks on ping registered"

**Causa**: Normal, Pusher hace ping cada 30s

**Solución**: Ignorar, no es un error

### No aparecen eventos en Pusher Debug Console

**Causa**: Broadcasting no está configurado

**Solución**: Verificar `BROADCAST_DRIVER=pusher` en Railway

---

## 📚 Documentación Oficial

- [Pusher Channels](https://pusher.com/docs/channels)
- [Laravel Broadcasting](https://laravel.com/docs/11.x/broadcasting)
- [Laravel Echo](https://laravel.com/docs/11.x/broadcasting#client-side-installation)

---

## 🎯 Próximos Pasos

1. ✅ Configurar credenciales de Pusher
2. ✅ Deploy en Railway
3. ✅ Verificar conexión en browser
4. ⏳ Monitorear uso en Pusher Dashboard
5. ⏳ Upgrade a plan pagado cuando sea necesario (100+ usuarios)
