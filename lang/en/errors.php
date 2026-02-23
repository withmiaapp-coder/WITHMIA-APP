<?php

/**
 * Standardized API error messages (English).
 *
 * Usage: __('errors.unauthorized') — Laravel auto-selects locale.
 * Mirror of lang/es/errors.php for bilingual support.
 *
 * Each key has its equivalent in lang/es/errors.php.
 */
return [
    // ── Authentication / Authorization ──
    'unauthorized'          => 'Unauthorized',
    'unauthenticated'       => 'Invalid or expired session',
    'forbidden'             => 'You do not have permission to perform this action',
    'token_invalid'         => 'Invalid authentication token',
    'token_expired'         => 'Authentication token expired',
    'superadmin_required'   => 'Super admin access required',
    'admin_required'        => 'Admin access required',

    // ── Not Found ──
    'not_found'             => ':resource not found',
    'company_not_found'     => 'Company not found',
    'user_not_found'        => 'User not found',
    'conversation_not_found'=> 'Conversation not found',
    'product_not_found'     => 'Product not found',
    'document_not_found'    => 'Document not found',
    'integration_not_found' => 'Integration not found',
    'inbox_not_found'       => 'Inbox not found',
    'team_not_found'        => 'Team not found',
    'contact_not_found'     => 'Contact not found',
    'template_not_found'    => 'Template not found',
    'file_not_found'        => 'File not found',
    'invitation_not_found'  => 'Invitation not found',
    'subscription_not_found'=> 'Subscription not found',

    // ── Validation ──
    'validation_failed'     => 'The given data is not valid',
    'missing_required'      => 'Required fields are missing',
    'invalid_format'        => 'Invalid format',
    'invalid_phone'         => 'Invalid phone number',
    'invalid_email'         => 'Invalid email address',
    'invalid_status'        => 'Invalid status',
    'invalid_url'           => 'Invalid URL',
    'already_exists'        => ':resource already exists',
    'limit_exceeded'        => 'Allowed limit has been exceeded',
    'self_action_forbidden' => 'You cannot perform this action on yourself',

    // ── Operations ──
    'create_failed'         => 'Failed to create :resource',
    'update_failed'         => 'Failed to update :resource',
    'delete_failed'         => 'Failed to delete :resource',
    'sync_failed'           => 'Failed to sync :resource',
    'send_failed'           => 'Failed to send :resource',
    'export_failed'         => 'Failed to export data',
    'import_failed'         => 'Failed to import data',
    'fetch_failed'          => 'Failed to fetch :resource',

    // ── Integrations ──
    'integration_error'     => 'Integration error with :provider',
    'api_error'             => 'External API error',
    'connection_failed'     => 'Connection error with :service',
    'webhook_failed'        => 'Error processing webhook',
    'oauth_failed'          => 'OAuth authentication error',
    'not_configured'        => ':service is not configured',

    // ── WhatsApp / Chatwoot ──
    'whatsapp_disconnected' => 'WhatsApp is not connected',
    'whatsapp_send_failed'  => 'Failed to send WhatsApp message',
    'chatwoot_error'        => 'Chatwoot service error',
    'chatwoot_not_configured' => 'Chatwoot is not configured for this company',

    // ── Subscription / Billing ──
    'no_active_subscription'=> 'No active subscription',
    'payment_failed'        => 'Payment processing failed',

    // ── Server ──
    'server_error'          => 'Internal server error',
    'service_unavailable'   => 'Service temporarily unavailable',
    'rate_limited'          => 'Too many requests, please try again later',
];
