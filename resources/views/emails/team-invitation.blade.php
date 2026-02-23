<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitación a {{ $companyName }}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FFD700; color: #333; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .logo { height: 50px; margin-bottom: 10px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #FFD700; }
        .label { font-weight: bold; color: #666; }
        .button { background: #FFD700; color: #333; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="{{ config('app.url') }}/logo-mia-original.png" alt="WITHMIA Logo" class="logo">
            <h1 style="color: #333;">¡Estás invitado!</h1>
        </div>
        <div class="content">
            <p>Hola{{ $invitation->name ? ' ' . $invitation->name : '' }},</p>
            
            <p><strong>{{ $inviterName }}</strong> te ha invitado a unirte a <strong>{{ $companyName }}</strong> en WITHMIA como <strong>{{ $roleName }}</strong>.</p>
            
            <p style="color: #666;">WITHMIA es una plataforma de atención al cliente que te permite gestionar todas tus conversaciones de WhatsApp, Instagram y más en un solo lugar con ayuda de inteligencia artificial.</p>
            
            <div style="text-align: center;">
                <a href="{{ $acceptUrl }}" class="button">Aceptar Invitación</a>
            </div>
            
            <div class="info-box">
                <p style="margin: 5px 0;"><strong>📧 Email:</strong> {{ $invitation->email }}</p>
                <p style="margin: 5px 0;"><strong>👤 Rol:</strong> {{ $roleName }}</p>
                <p style="margin: 5px 0;"><strong>⏰ Expira:</strong> {{ $invitation->expires_at->format('d/m/Y H:i') }}</p>
            </div>
            
            <p style="color: #999; font-size: 12px;">Si no esperabas esta invitación, puedes ignorar este correo. El enlace expirará automáticamente.</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="text-align: center; color: #666; font-size: 12px;">
                © {{ date('Y') }} WITHMIA. Todos los derechos reservados.<br>
                <span style="font-size: 11px;">Si el botón no funciona, copia y pega este enlace: <a href="{{ $acceptUrl }}" style="color: #D9B24C;">{{ $acceptUrl }}</a></span>
            </p>
        </div>
    </div>
</body>
</html>
