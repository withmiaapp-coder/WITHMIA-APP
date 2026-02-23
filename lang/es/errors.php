<?php

/**
 * Mensajes de error estandarizados para la API (Español).
 *
 * Usar: __('errors.unauthorized') en controllers.
 * Esto reemplaza las cadenas inline mixtas (ES/EN) y centraliza
 * los mensajes para mantener consistencia de idioma.
 *
 * Cada clave tiene su equivalente en lang/en/errors.php.
 */
return [
    // ── Autenticación / Autorización ──
    'unauthorized'          => 'No autorizado',
    'unauthenticated'       => 'Sesión no válida o expirada',
    'forbidden'             => 'No tienes permiso para realizar esta acción',
    'token_invalid'         => 'Token de autenticación inválido',
    'token_expired'         => 'Token de autenticación expirado',
    'superadmin_required'   => 'Se requiere acceso de superadministrador',
    'admin_required'        => 'Se requiere acceso de administrador',

    // ── Recursos no encontrados ──
    'not_found'             => ':resource no encontrado/a',
    'company_not_found'     => 'Empresa no encontrada',
    'user_not_found'        => 'Usuario no encontrado',
    'conversation_not_found'=> 'Conversación no encontrada',
    'product_not_found'     => 'Producto no encontrado',
    'document_not_found'    => 'Documento no encontrado',
    'integration_not_found' => 'Integración no encontrada',
    'inbox_not_found'       => 'Inbox no encontrado',
    'team_not_found'        => 'Equipo no encontrado',
    'contact_not_found'     => 'Contacto no encontrado',
    'template_not_found'    => 'Plantilla no encontrada',
    'file_not_found'        => 'Archivo no encontrado',
    'invitation_not_found'  => 'Invitación no encontrada',
    'subscription_not_found'=> 'Suscripción no encontrada',

    // ── Validación ──
    'validation_failed'     => 'Los datos proporcionados no son válidos',
    'missing_required'      => 'Faltan campos obligatorios',
    'invalid_format'        => 'Formato inválido',
    'invalid_phone'         => 'Número de teléfono inválido',
    'invalid_email'         => 'Correo electrónico inválido',
    'invalid_status'        => 'Estado no válido',
    'invalid_url'           => 'URL no válida',
    'already_exists'        => ':resource ya existe',
    'limit_exceeded'        => 'Se ha excedido el límite permitido',
    'self_action_forbidden' => 'No puedes realizar esta acción sobre ti mismo',

    // ── Operaciones ──
    'create_failed'         => 'Error al crear :resource',
    'update_failed'         => 'Error al actualizar :resource',
    'delete_failed'         => 'Error al eliminar :resource',
    'sync_failed'           => 'Error al sincronizar :resource',
    'send_failed'           => 'Error al enviar :resource',
    'export_failed'         => 'Error al exportar datos',
    'import_failed'         => 'Error al importar datos',
    'fetch_failed'          => 'Error al obtener :resource',

    // ── Integraciones ──
    'integration_error'     => 'Error de integración con :provider',
    'api_error'             => 'Error en la API externa',
    'connection_failed'     => 'Error de conexión con :service',
    'webhook_failed'        => 'Error al procesar el webhook',
    'oauth_failed'          => 'Error en la autenticación OAuth',
    'not_configured'        => ':service no está configurado',

    // ── WhatsApp / Chatwoot ──
    'whatsapp_disconnected' => 'WhatsApp no está conectado',
    'whatsapp_send_failed'  => 'Error al enviar mensaje de WhatsApp',
    'chatwoot_error'        => 'Error en el servicio de Chatwoot',
    'chatwoot_not_configured' => 'Chatwoot no está configurado para esta empresa',

    // ── Suscripción / Billing ──
    'no_active_subscription'=> 'No hay una suscripción activa',
    'payment_failed'        => 'Error al procesar el pago',

    // ── Servidor ──
    'server_error'          => 'Error interno del servidor',
    'service_unavailable'   => 'Servicio temporalmente no disponible',
    'rate_limited'          => 'Demasiadas solicitudes, intenta de nuevo más tarde',
];
