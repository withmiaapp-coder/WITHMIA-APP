<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp {{ $isConnected ? 'Conectado' : 'Desconectado' }}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { padding: 25px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .header-connected { background: linear-gradient(135deg, #059669, #10B981); }
        .header-disconnected { background: linear-gradient(135deg, #DC2626, #EF4444); }
        .logo { height: 40px; margin-bottom: 10px; }
        .header h1 { color: white; margin: 10px 0 0; font-size: 22px; }
        .header p { color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 14px; }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
        .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; margin: 10px 0; }
        .badge-connected { background: #D1FAE5; color: #065F46; }
        .badge-disconnected { background: #FEE2E2; color: #991B1B; }
        .info-box { background: #F9FAFB; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #FFD700; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E5E7EB; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #6B7280; font-size: 13px; }
        .info-value { color: #111827; font-size: 13px; }
        .alert-box { padding: 15px; margin: 15px 0; border-radius: 8px; font-size: 14px; }
        .alert-warning { background: #FEF3C7; border-left: 4px solid #F59E0B; color: #92400E; }
        .alert-success { background: #D1FAE5; border-left: 4px solid #10B981; color: #065F46; }
        .button { display: inline-block; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; margin: 15px 0; }
        .btn-primary { background: #FFD700; color: #333; }
        .footer { text-align: center; color: #9CA3AF; font-size: 12px; padding: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header {{ $isConnected ? 'header-connected' : 'header-disconnected' }}">
            <img src="{{ config('app.url') }}/logo-mia-original.png" alt="WITHMIA" class="logo">
            <h1>
                @if($isConnected)
                    ✅ WhatsApp Conectado
                @else
                    🔴 WhatsApp Desconectado
                @endif
            </h1>
            <p>{{ $companyName }}</p>
        </div>
        
        <div class="content">
            @if($isConnected)
                <div class="alert-box alert-success">
                    <strong>¡Conexión restaurada!</strong><br>
                    Tu integración de WhatsApp está funcionando correctamente. Los mensajes se están recibiendo y enviando con normalidad.
                </div>
            @else
                <div class="alert-box alert-warning">
                    <strong>⚠️ Atención:</strong> Tu integración de WhatsApp se ha desconectado. 
                    Los mensajes <strong>no se están recibiendo</strong> hasta que reconectes.<br><br>
                    Esto puede ocurrir si:
                    <ul style="margin: 8px 0; padding-left: 20px;">
                        <li>Alguien desvinculó el dispositivo desde el teléfono</li>
                        <li>WhatsApp cerró la sesión por inactividad</li>
                        <li>Hubo un reinicio del servidor</li>
                    </ul>
                </div>
            @endif
            
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">Estado</span>
                    <span class="status-badge {{ $isConnected ? 'badge-connected' : 'badge-disconnected' }}">
                        {{ $isConnected ? '🟢 Conectado' : '🔴 Desconectado' }}
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">Estado anterior</span>
                    <span class="info-value">{{ $previousState ?? 'Desconocido' }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Empresa</span>
                    <span class="info-value">{{ $companyName }}</span>
                </div>
                @if($profileName)
                <div class="info-row">
                    <span class="info-label">Perfil WhatsApp</span>
                    <span class="info-value">{{ $profileName }}</span>
                </div>
                @endif
                @if($phoneNumber)
                <div class="info-row">
                    <span class="info-label">Número</span>
                    <span class="info-value">+{{ $phoneNumber }}</span>
                </div>
                @endif
                <div class="info-row">
                    <span class="info-label">Instancia</span>
                    <span class="info-value">{{ $instanceName }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Fecha y hora</span>
                    <span class="info-value">{{ $timestamp }}</span>
                </div>
            </div>
            
            @if(!$isConnected)
                <div style="text-align: center;">
                    <a href="{{ $dashboardUrl }}" class="button btn-primary">
                        🔗 Ir al Dashboard y Reconectar
                    </a>
                </div>
                <p style="color: #6B7280; font-size: 13px; text-align: center;">
                    Desde el dashboard podrás escanear un nuevo código QR para restaurar la conexión.
                </p>
            @endif
            
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;">
            
            <div class="footer">
                <p>© {{ date('Y') }} WITHMIA. Todos los derechos reservados.</p>
                <p style="font-size: 11px;">Este es un correo automático de monitoreo. No responder.</p>
            </div>
        </div>
    </div>
</body>
</html>
