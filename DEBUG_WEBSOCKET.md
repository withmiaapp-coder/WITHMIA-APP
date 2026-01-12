# Debug WebSocket - Instrucciones

## Paso 1: Verificar conexión WebSocket

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Verificar si Echo está disponible
console.log('Echo disponible:', !!window.Echo);

// Verificar estado de conexión Pusher
if (window.Echo && window.Echo.connector && window.Echo.connector.pusher) {
    const pusher = window.Echo.connector.pusher;
    console.log('Estado conexión Pusher:', pusher.connection.state);
    console.log('Socket ID:', pusher.connection.socket_id);
    console.log('Canales suscritos:', Object.keys(pusher.channels.channels));
}
```

## Paso 2: Suscribirse manualmente al canal

```javascript
// Forzar suscripción al canal
window.Echo.private('inbox.1')
    .listen('.message.received', (event) => {
        console.log('🎉 MENSAJE RECIBIDO:', event);
    })
    .listen('.conversation.updated', (event) => {
        console.log('🎉 CONVERSACIÓN ACTUALIZADA:', event);
    });

console.log('✅ Suscrito manualmente al canal inbox.1');
```

## Paso 3: Verificar autenticación del canal

```javascript
// Verificar si hay error de autenticación
if (window.Echo.connector.pusher.channels.channels['private-inbox.1']) {
    const channel = window.Echo.connector.pusher.channels.channels['private-inbox.1'];
    console.log('Estado del canal:', channel.subscribed ? 'SUSCRITO' : 'NO SUSCRITO');
    console.log('Pendiente:', channel.subscriptionPending);
    console.log('Error:', channel.subscriptionError);
}
```

## Paso 4: Probar broadcast manualmente

En otra terminal o navegador, visita:
```
https://app.withmia.com/api/test-broadcast/1
```

Deberías ver en la consola del navegador:
```
🎉 MENSAJE RECIBIDO: {...}
```

## Errores comunes:

### Error 403 en /broadcasting/auth
- Significa que la autenticación del canal falló
- Verificar que el usuario tiene `chatwoot_inbox_id` = 1

### Estado "connecting" persistente
- Puede ser problema de CORS o configuración de Pusher
- Verificar que VITE_PUSHER_APP_KEY y VITE_PUSHER_APP_CLUSTER son correctos

### Canal nunca se suscribe
- Verificar que `userInboxId` no sea null
- Verificar que `realtimeEnabled` sea true
