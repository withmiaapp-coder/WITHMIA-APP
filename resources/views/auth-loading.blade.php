<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WITHMIA</title>
    <script>
        // 🔑 PRE-GUARDAR TOKEN INMEDIATAMENTE
        (function() {
            var targetUrl = "{{ $redirect }}";
            try {
                var url = new URL(targetUrl, window.location.origin);
                var token = url.searchParams.get('auth_token');
                if (token) {
                    localStorage.setItem('railway_auth_token', token);
                    console.log('[Auth-Loading] Token saved:', token.substring(0, 8) + '...');
                }
            } catch(e) {}
        })();
    </script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #fff;
        }
        
        /* El iframe carga el dashboard DETRÁS del video overlay */
        .background-loader {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: 1;
            border: none;
            opacity: 0;
            transition: opacity 0.3s ease-in;
        }
        
        .background-loader.ready {
            opacity: 1;
        }
        
        /* Video overlay ENCIMA del iframe */
        .video-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background-color: #fff;
            background-image: radial-gradient(76vw 76vw at 12% 18%, rgba(230,184,255,.1) 0%, rgba(230,184,255,.05) 50%, rgba(230,184,255,0) 70%), radial-gradient(40vw 40vw at 8% 65%, rgba(125,77,255,.35) 0%, rgba(125,77,255,0) 55%), radial-gradient(40vw 40vw at 85% 82%, rgba(59,195,255,.3) 0%, rgba(59,195,255,0) 55%), radial-gradient(35vw 35vw at 85% 8%, rgba(230,184,255,.18) 0%, rgba(230,184,255,0) 55%), radial-gradient(28vw 28vw at 72% 15%, rgba(244,226,166,.44) 0%, rgba(244,226,166,0) 60%), radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.28) 0%, rgba(217,178,76,0) 60%);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            opacity: 1;
            transition: opacity 0.4s ease-out;
        }
        
        .video-overlay.fade-out {
            opacity: 0;
            pointer-events: none;
        }
        
        .video-container {
            width: 200px;
            height: 200px;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .loading-text {
            margin-top: 2rem;
            color: #000;
            font-size: 1.5rem;
            font-weight: 300;
        }
        
        .loading-text strong {
            font-weight: 700;
        }
    </style>
</head>
<body>
    <!-- Iframe que carga el dashboard DETRÁS del video (z-index 1) -->
    <iframe id="backgroundLoader" class="background-loader" src="{{ $redirect }}"></iframe>

    <!-- Video overlay ENCIMA (z-index 9999) -->
    <div id="videoOverlay" class="video-overlay">
        <div class="video-container">
            <video id="loadingVideo" autoplay muted playsinline loop>
                <source src="/logo-animated.webm" type="video/webm">
            </video>
        </div>
        <div class="loading-text">
            WITH YOU, WITH<strong>MIA</strong>
        </div>
    </div>
    
    <script>
        (function() {
            var targetUrl = "{{ $redirect }}";
            var overlay = document.getElementById('videoOverlay');
            var backgroundLoader = document.getElementById('backgroundLoader');
            var dashboardReady = false;
            
            console.log('[Auth-Loading] Loading dashboard behind video...');
            
            // Cuando el iframe carga, marcar como listo
            backgroundLoader.onload = function() {
                dashboardReady = true;
                backgroundLoader.classList.add('ready');
                console.log('[Auth-Loading] Dashboard loaded in background!');
            };
            
            // A los 3 segundos: fade out del video y mostrar el dashboard debajo
            setTimeout(function() {
                console.log('[Auth-Loading] Fading out video overlay...');
                overlay.classList.add('fade-out');
                
                // Después del fade, redirigir para que la URL sea correcta
                setTimeout(function() {
                    // El dashboard ya está visible en el iframe
                    // Ahora hacemos redirect para tener la URL correcta
                    window.location.replace(targetUrl);
                }, 400);
            }, 3000);
        })();
    </script>
</body>
</html>
                window.location.replace(targetUrl);
            }, 3000);
        })();
    </script>
</body>
</html>
