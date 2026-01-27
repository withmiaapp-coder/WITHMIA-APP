<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitación a {{ $companyName }}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    
                    <!-- Header con gradiente -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 40px 30px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center">
                                        <img src="{{ config('app.url') }}/logo-withmia.webp" alt="WITHMIA" style="height: 50px; margin-bottom: 20px; border-radius: 8px;" onerror="this.outerHTML='<span style=color:#fff;font-size:24px;font-weight:bold>WITHMIA</span>'">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                            ¡Estás invitado!
                                        </h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Contenido -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hola{{ $invitation->name ? ' ' . $invitation->name : '' }},
                            </p>
                            
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                                <strong>{{ $inviterName }}</strong> te ha invitado a unirte a <strong>{{ $companyName }}</strong> en WITHMIA como <strong>{{ $roleName }}</strong>.
                            </p>
                            
                            <p style="margin: 0 0 30px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                WITHMIA es una plataforma de atención al cliente que te permite gestionar todas tus conversaciones de WhatsApp, Instagram y más en un solo lugar con ayuda de inteligencia artificial.
                            </p>
                            
                            <!-- Botón de acción -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 10px 0 30px;">
                                        <a href="{{ $acceptUrl }}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                                            Aceptar Invitación
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Info adicional -->
                            <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                                <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
                                    <strong>📧 Email:</strong> {{ $invitation->email }}
                                </p>
                                <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
                                    <strong>👤 Rol:</strong> {{ $roleName }}
                                </p>
                                <p style="margin: 0; color: #6b7280; font-size: 13px;">
                                    <strong>⏰ Expira:</strong> {{ $invitation->expires_at->format('d/m/Y H:i') }}
                                </p>
                            </div>
                            
                            <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                                Si no esperabas esta invitación, puedes ignorar este correo. El enlace expirará automáticamente.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 25px 40px; border-top: 1px solid #e5e7eb;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 5px; color: #9ca3af; font-size: 12px;">
                                            © {{ date('Y') }} WITHMIA. Todos los derechos reservados.
                                        </p>
                                        <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                                            Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                                            <a href="{{ $acceptUrl }}" style="color: #10b981; word-break: break-all;">{{ $acceptUrl }}</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
