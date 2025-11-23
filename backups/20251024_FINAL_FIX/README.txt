BACKUP COMPLETO - 24 Octubre 2025
==================================

PROBLEMA RESUELTO:
- Integración Chatwoot/Evolution API completamente funcional
- Notificaciones de mensajes entrantes únicamente (sin duplicados al enviar)
- Badge de mensajes nuevos se mantiene limpio después de F5

ARCHIVOS INCLUIDOS:

1. ConversationsInterface.tsx
   - Filtros de notificaciones (solo incoming, no outgoing)
   - Actualización optimista sin incrementar unread_count en mensajes salientes
   - Badge " Nuevos mensajes\ filtra por message_type === 0
 - Marca conversación como leída al abrir

2. useChatwoot.ts
 - markConversationAsRead() con refetch después de 800ms
 - Obtiene unread_count actualizado desde Chatwoot
 - Previene badge persistente después de refresh

3. useRealtimeConversations.ts
 - Sin filtros en WebSocket (pasa todos los eventos)
 - Logging para debugging

4. EvolutionApiController.php
 - Filtra mensajes fromMe en handleMessageUpsert
 - Filtra mensajes fromMe en handleMessageUpdate
 - Cache invalidation después de broadcasts

5. ChatwootController.php
 - Nuevo método getConversation() para obtener conversación individual
 - Validaciones de seguridad por inbox_id
 - markAsRead() para update_last_seen

6. api.php
 - Nueva ruta GET /conversations/{id}
 - Orden correcto: /export-all antes de /{id}

7. broadcasting.php
 - Configuración completa de Reverb WebSocket

TECNOLOGÍAS:
- Laravel 11 + Reverb WebSockets
- Evolution API v2.3.4
- Chatwoot (Docker)
- React/TypeScript
- Redis caching

FUNCIONAMIENTO:
 Mensajes de WhatsApp aparecen en tiempo real
 Mensajes propios NO generan notificaciones
 Badge de no leídos solo para mensajes entrantes
 Al abrir chat, se marca como leído en servidor
 Después de F5, badge NO reaparece (refetch funciona)
 WebSocket broadcasting correcto
 Cache invalidation automático
