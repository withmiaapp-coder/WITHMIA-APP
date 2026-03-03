<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Uso de Mensajes IA — {{ $companyName }}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { padding: 25px 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .header-warning { background: linear-gradient(135deg, #D97706, #F59E0B); }
        .header-danger { background: linear-gradient(135deg, #DC2626, #EF4444); }
        .logo { height: 40px; margin-bottom: 10px; }
        .header h1 { color: white; margin: 10px 0 0; font-size: 22px; }
        .header p { color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 14px; }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
        .progress-bar { width: 100%; height: 12px; background: #E5E7EB; border-radius: 6px; overflow: hidden; margin: 15px 0; }
        .progress-fill { height: 100%; border-radius: 6px; transition: width 0.3s; }
        .progress-warning { background: linear-gradient(90deg, #F59E0B, #D97706); }
        .progress-danger { background: linear-gradient(90deg, #EF4444, #DC2626); }
        .info-box { background: #F9FAFB; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #FFD700; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E5E7EB; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: 600; color: #6B7280; font-size: 13px; }
        .info-value { color: #111827; font-size: 13px; }
        .alert-box { padding: 15px; margin: 15px 0; border-radius: 8px; font-size: 14px; }
        .alert-warning { background: #FEF3C7; border-left: 4px solid #F59E0B; color: #92400E; }
        .alert-danger { background: #FEE2E2; border-left: 4px solid #EF4444; color: #991B1B; }
        .alert-info { background: #DBEAFE; border-left: 4px solid #3B82F6; color: #1E40AF; }
        .button { display: inline-block; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; margin: 15px 0; }
        .btn-primary { background: #FFD700; color: #333; }
        .btn-upgrade { background: #6366F1; color: white; }
        .footer { text-align: center; color: #9CA3AF; font-size: 12px; padding: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header {{ $percentage >= 100 ? 'header-danger' : 'header-warning' }}">
            <img src="{{ config('app.url') }}/logo-mia-original.png" alt="WITHMIA" class="logo">
            <h1>
                @if($percentage >= 100)
                    🚫 Límite de mensajes IA alcanzado
                @else
                    ⚠️ Uso de mensajes IA al {{ $percentage }}%
                @endif
            </h1>
            <p>{{ $companyName }}</p>
        </div>

        <div class="content">
            <!-- Usage progress bar -->
            <div class="progress-bar">
                <div class="progress-fill {{ $percentage >= 100 ? 'progress-danger' : 'progress-warning' }}"
                     style="width: {{ min($percentage, 100) }}%">
                </div>
            </div>

            <!-- Stats -->
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">Mensajes usados</span>
                    <span class="info-value">{{ number_format($messagesUsed, 0, ',', '.') }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Límite del plan</span>
                    <span class="info-value">{{ number_format($messagesLimit, 0, ',', '.') }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Porcentaje usado</span>
                    <span class="info-value">{{ $percentage }}%</span>
                </div>
                @if($overageMessages > 0)
                <div class="info-row">
                    <span class="info-label">Mensajes de overage</span>
                    <span class="info-value">{{ number_format($overageMessages, 0, ',', '.') }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Costo extra acumulado</span>
                    <span class="info-value" style="color: #DC2626; font-weight: bold;">${{ number_format($overageCostClp, 0, ',', '.') }} CLP</span>
                </div>
                @endif
            </div>

            @if($percentage >= 100 && $overageEnabled)
                <div class="alert-box alert-danger">
                    <strong>Has superado el límite de tu plan.</strong><br>
                    Los mensajes adicionales se cobran a <strong>$5.990 CLP por cada 1.000 mensajes</strong> extra.
                    @if($overageMessages > 0)
                        <br>Llevas <strong>{{ number_format($overageMessages, 0, ',', '.') }} mensajes de overage</strong>
                        con un costo acumulado de <strong>${{ number_format($overageCostClp, 0, ',', '.') }} CLP</strong>.
                    @endif
                </div>
            @elseif($percentage >= 100 && !$overageEnabled)
                <div class="alert-box alert-danger">
                    <strong>Has alcanzado el límite de mensajes IA.</strong><br>
                    Tu bot no podrá responder hasta el próximo periodo de facturación.
                    Actualiza tu plan para continuar usando el servicio.
                </div>
            @else
                <div class="alert-box alert-warning">
                    <strong>Tu uso de mensajes IA está al {{ $percentage }}%.</strong><br>
                    Considera actualizar tu plan si necesitas más capacidad.
                </div>
            @endif

            <div class="alert-box alert-info">
                <strong>💡 Tip:</strong> Puedes comprar packs de mensajes extra o subir de plan desde la página de suscripción.
            </div>

            <div style="text-align: center;">
                <a href="{{ $subscriptionUrl }}" class="button btn-primary">
                    Ver mi suscripción
                </a>
            </div>
        </div>

        <div class="footer">
            <p>© {{ date('Y') }} WITHMIA — Automatización inteligente con IA</p>
            <p>Este email fue enviado automáticamente. No respondas a este correo.</p>
        </div>
    </div>
</body>
</html>
