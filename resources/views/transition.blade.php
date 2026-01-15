<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WITHMIA</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: #000;
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
            width: 128px;
            height: 128px;
            object-fit: contain;
        }
    </style>
</head>
<body>
    <div class="transition-container">
        <video class="logo-video" autoplay loop muted playsinline>
            <source src="/logo-animated.webm" type="video/webm" />
            <img src="/logo-withmia.webp?v=2025-withmia" alt="WITHMIA" style="width: 128px; height: 128px;" />
        </video>
    </div>

    <script>
        // Redirigir después de 1.5 segundos
        setTimeout(function() {
            window.location.href = "{{ $redirect ?? '/dashboard' }}";
        }, 1500);
    </script>
</body>
</html>
