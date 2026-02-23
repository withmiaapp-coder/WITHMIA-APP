<!DOCTYPE html>
<html>
<head>
    <title>Bienvenido a WITHMIA</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FFD700; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .logo { height: 60px; margin-bottom: 10px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { background: #FFD700; color: #333; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="{{ config('app.url') }}/logo-mia-original.png" alt="WITHMIA Logo" class="logo" style="border-radius: 8px;">
            <h1 style="color: #333;">¡Bienvenido a WITHMIA!</h1>
        </div>
        <div class="content">
            <h2>¡Felicitaciones!</h2>
            <p>Has completado exitosamente el proceso de onboarding de WITHMIA.</p>
            <p>Estamos emocionados de tenerte como parte de nuestra comunidad.</p>
            <p>Ahora puedes comenzar a explorar todas las funcionalidades que WITHMIA tiene para ofrecerte.</p>
            <a href="{{ config('app.url') }}" class="button">Comenzar ahora</a>
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p>¡Que tengas un excelente día!</p>
            <p><strong>El equipo de WITHMIA</strong></p>
        </div>
    </div>
</body>
</html>
