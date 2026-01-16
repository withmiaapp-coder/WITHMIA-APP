<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WITHMIA</title>
    <script>
        // 🔑 PRE-GUARDAR TOKEN INMEDIATAMENTE antes de cualquier cosa
        (function() {
            var targetUrl = "{{ $redirect }}";
            try {
                var url = new URL(targetUrl, window.location.origin);
                var token = url.searchParams.get('auth_token');
                if (token) {
                    localStorage.setItem('railway_auth_token', token);
                    console.log('[Auth-Loading] Token pre-saved:', token.substring(0, 8) + '...');
                }
            } catch(e) {
                console.error('[Auth-Loading] Error pre-saving token:', e);
            }
        })();
    </script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #fff;
        }
        
        /* Iframe que carga el destino - OCULTO inicialmente */
        .destination-iframe {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
            z-index: 1;
            visibility: hidden;
            opacity: 0;
        }
        
        .destination-iframe.show {
            visibility: visible;
            opacity: 1;
        }
        
        /* Overlay del video que cubre todo mientras carga */
        .video-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(76vw 76vw at 12% 18%, rgba(230,184,255,.1) 0%, rgba(230,184,255,.05) 50%, rgba(230,184,255,0) 70%), radial-gradient(40vw 40vw at 8% 65%, rgba(125,77,255,.35) 0%, rgba(125,77,255,0) 55%), radial-gradient(40vw 40vw at 85% 82%, rgba(59,195,255,.3) 0%, rgba(59,195,255,0) 55%), radial-gradient(35vw 35vw at 85% 8%, rgba(230,184,255,.18) 0%, rgba(230,184,255,0) 55%), radial-gradient(28vw 28vw at 72% 15%, rgba(244,226,166,.44) 0%, rgba(244,226,166,0) 60%), radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.28) 0%, rgba(217,178,76,0) 60%);
            z-index: 9999999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
            text-align: center;
        }
        
        .loading-text strong {
            font-weight: 700;
        }
    </style>
</head>
<body>
    <!-- Iframe que carga el destino en background -->
    <iframe id="destinationFrame" class="destination-iframe" src="{{ $redirect }}"></iframe>
    
    <!-- Overlay con video que cubre mientras carga -->
    <div id="videoOverlay" class="video-overlay">
        <div class="video-container">
            <video id="loadingVideo" autoplay muted playsinline>
                <source src="/logo-animated.webm" type="video/webm">
            </video>
        </div>
        <div class="loading-text">
            WITH YOU, WITH<strong>MIA</strong>
        </div>
    </div>
    
    <script>
        (function() {
            var iframe = document.getElementById('destinationFrame');
            var overlay = document.getElementById('videoOverlay');
            var targetUrl = "{{ $redirect }}";
            var minDisplayTime = 3000; // 3 segundos mínimo
            var startTime = Date.now();
            var iframeReady = false;
            
            // Cuando el iframe termine de cargar
            iframe.onload = function() {
                console.log('[Auth-Loading] Iframe loaded');
                iframeReady = true;
                tryTransition();
            };
            
            // Timer de seguridad - después de 3s intentar transición
            setTimeout(function() {
                console.log('[Auth-Loading] Min time reached');
                tryTransition();
            }, minDisplayTime);
            
            function tryTransition() {
                var elapsed = Date.now() - startTime;
                
                // Solo transicionar si:
                // 1. Pasaron al menos 3 segundos Y
                // 2. El iframe cargó (o pasaron 6 segundos de timeout)
                if (elapsed >= minDisplayTime && (iframeReady || elapsed >= 6000)) {
                    console.log('[Auth-Loading] Starting transition');
                    
                    // Mostrar iframe
                    iframe.classList.add('show');
                    
                    // Fade out del overlay
                    overlay.classList.add('fade-out');
                    
                    // Actualizar URL sin recargar
                    setTimeout(function() {
                        try {
                            history.replaceState(null, '', targetUrl);
                            console.log('[Auth-Loading] URL updated to:', targetUrl);
                        } catch(e) {
                            console.log('[Auth-Loading] Could not update URL:', e);
                        }
                        
                        // Remover overlay del DOM después del fade
                        setTimeout(function() {
                            overlay.remove();
                        }, 500);
                    }, 400);
                }
            }
        })();
    </script>
</body>
</html>
