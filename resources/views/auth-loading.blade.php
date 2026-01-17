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
    <!-- Prefetch de recursos -->
    <link rel="prefetch" href="{{ $redirect }}" as="document">
    <link rel="prefetch" href="/logo-withmia.webp" as="image">
    <link rel="prefetch" href="/laurel-logo.webp" as="image">
    <link rel="prefetch" href="/Logo-Atlantis.webp" as="image">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            /* Fondo blanco base para evitar flash negro */
            background-color: oklch(1 0 0);
            background-image: radial-gradient(76vw 76vw at 12% 18%, rgba(230,184,255,.1) 0%, rgba(230,184,255,.05) 50%, rgba(230,184,255,0) 70%), radial-gradient(40vw 40vw at 8% 65%, rgba(125,77,255,.35) 0%, rgba(125,77,255,0) 55%), radial-gradient(40vw 40vw at 85% 82%, rgba(59,195,255,.3) 0%, rgba(59,195,255,0) 55%), radial-gradient(35vw 35vw at 85% 8%, rgba(230,184,255,.18) 0%, rgba(230,184,255,0) 55%), radial-gradient(28vw 28vw at 72% 15%, rgba(244,226,166,.44) 0%, rgba(244,226,166,0) 60%), radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.28) 0%, rgba(217,178,76,0) 60%);
        }
        
        .video-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            /* Mismo fondo que html/body */
            background-color: oklch(1 0 0);
            background-image: inherit;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            opacity: 1;
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

        /* Iframe oculto para precargar */
        .preload-frame {
            position: absolute;
            width: 1px;
            height: 1px;
            opacity: 0;
            pointer-events: none;
            visibility: hidden;
        }
    </style>
</head>
<body>
    <!-- Iframe oculto que precarga la página destino -->
    <iframe id="preloadFrame" class="preload-frame" aria-hidden="true"></iframe>

    <!-- Video overlay -->
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
            var preloadFrame = document.getElementById('preloadFrame');
            var preloadReady = false;
            var isLoginPage = targetUrl.includes('/login');
            
            console.log('[Auth-Loading] Starting preload for:', targetUrl);
            
            // Precargar recursos comunes inmediatamente
            var preloadImages = [
                '/logo-withmia.webp',
                '/laurel-logo.webp',
                '/Logo-Atlantis.webp',
                '/logo-animated.webm'
            ];
            
            preloadImages.forEach(function(src) {
                var img = new Image();
                img.src = src;
            });
            
            // Para login.html usar fetch para precargar el HTML
            if (isLoginPage) {
                // Empezar a precargar a los 2 segundos (1 segundo antes de redirigir)
                setTimeout(function() {
                    console.log('[Auth-Loading] Preloading login page...');
                    fetch(targetUrl, { credentials: 'same-origin' })
                        .then(function(response) {
                            preloadReady = true;
                            console.log('[Auth-Loading] Login page preloaded via fetch!');
                        })
                        .catch(function() {
                            preloadReady = true;
                        });
                }, 2000);
            } else {
                // Para dashboard, usar iframe - empezar a los 2 segundos
                setTimeout(function() {
                    console.log('[Auth-Loading] Preloading dashboard in iframe...');
                    preloadFrame.src = targetUrl;
                    preloadFrame.onload = function() {
                        preloadReady = true;
                        console.log('[Auth-Loading] Page preloaded via iframe!');
                    };
                }, 2000);
            }
            
            // Garantizar que preloadReady sea true después de 2.8s
            setTimeout(function() {
                preloadReady = true;
            }, 2800);
            
            // A los 3 segundos, redirigir (el dashboard tuvo 1s para prepararse)
            setTimeout(function() {
                console.log('[Auth-Loading] Redirecting now... (preloaded:', preloadReady, ')');
                window.location.replace(targetUrl);
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
