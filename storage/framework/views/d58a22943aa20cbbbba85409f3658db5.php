<!DOCTYPE html>
<html>
<head>
    <title>Nuevo Usuario en WITHMIA</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FFD700; color: #333; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .logo { height: 50px; margin-bottom: 10px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #FFD700; }
        .label { font-weight: bold; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://app.withmia.com/logo-mia-original.png" alt="WITHMIA Logo" class="logo">
            <h1>🎉 Nuevo Usuario Completó Onboarding</h1>
        </div>
        <div class="content">
            <div class="info-box">
                <div class="label">👤 Usuario:</div>
                <p><strong>Nombre:</strong> <?php echo e($user->full_name); ?></p>
                <p><strong>Email:</strong> <?php echo e($user->email); ?></p>
                <p><strong>Teléfono:</strong> <?php echo e($user->phone); ?></p>
                <p><strong>IP:</strong> <?php echo e($userIP); ?></p>
                <p><strong>Empresa:</strong> <?php echo e($company->name ?? 'No especificada'); ?></p>
                <p><strong>Descripción:</strong> <?php echo e($company->description ?? 'No especificada'); ?></p>
            </div>
            
            <div class="info-box">
                <div class="label">🕐 Registro:</div>
                <p><strong>Completado:</strong> <?php echo e(now()->format('d M Y, H:i T')); ?></p>
            </div>
            
            <p style="text-align: center; color: #666;">
                <strong>Panel Admin WITHMIA</strong><br>
                Notificación automática del sistema
            </p>
        </div>
    </div>
</body>
</html>
<?php /**PATH /var/www/mia-app/resources/views/emails/onboarding-completed-notification.blade.php ENDPATH**/ ?>