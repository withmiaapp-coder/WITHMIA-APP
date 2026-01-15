<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WITHMIA</title>
    <link rel="icon" href="/logo-withmia.webp?v=2025-withmia" type="image/webp">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: radial-gradient(76vw 76vw at 12% 18%, rgba(230,184,255,.1) 0%, rgba(230,184,255,.05) 50%, rgba(230,184,255,0) 70%), radial-gradient(40vw 40vw at 8% 65%, rgba(125,77,255,.35) 0%, rgba(125,77,255,0) 55%), radial-gradient(40vw 40vw at 85% 82%, rgba(59,195,255,.3) 0%, rgba(59,195,255,0) 55%), radial-gradient(35vw 35vw at 85% 8%, rgba(230,184,255,.18) 0%, rgba(230,184,255,0) 55%), radial-gradient(28vw 28vw at 72% 15%, rgba(244,226,166,.44) 0%, rgba(244,226,166,0) 60%), radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.28) 0%, rgba(217,178,76,0) 60%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .transition-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        .logo-video {
            width: 160px;
            height: 160px;
            object-fit: contain;
        }
    </style>
</head>
<body>
    <div class="transition-container">
        <video class="logo-video" autoplay loop muted playsinline>
            <source src="/logo-animated.webm" type="video/webm" />
            <img src="/logo-withmia.webp?v=2025-withmia" alt="WITHMIA" style="width: 160px; height: 160px;" />
        </video>
    </div>

    <script>
        // Redirigir después de 3 segundos para que el logo se dibuje completo
        setTimeout(function() {
            window.location.href = "{{ $redirect ?? '/login' }}";
        }, 3000);
    </script>
</body>
</html>
