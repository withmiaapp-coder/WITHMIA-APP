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
                    console.log('[Auth-Loading] Token saved to localStorage:', token.substring(0, 8) + '...');
                }
            } catch(e) {
                console.error('[Auth-Loading] Error saving token:', e);
            }
        })();
    </script>
    <!-- Prefetch del destino -->
    <link rel="prefetch" href="{{ $redirect }}">
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
            background: #000;
        }
        
        /* Iframe oculto que precarga el destino */
        #preloadFrame {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
            z-index: 1;
            opacity: 0;
            visibility: hidden;
        }
        
        #preloadFrame.ready {
            opacity: 1;
            visibility: visible;
        }
        
        /* Video overlay encima de todo */
        .video-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(76vw 76vw at 12% 18%, rgba(230,184,255,.1) 0%, rgba(230,184,255,.05) 50%, rgba(230,184,255,0) 70%), radial-gradient(40vw 40vw at 8% 65%, rgba(125,77,255,.35) 0%, rgba(125,77,255,0) 55%), radial-gradient(40vw 40vw at 85% 82%, rgba(59,195,255,.3) 0%, rgba(59,195,255,0) 55%), radial-gradient(35vw 35vw at 85% 8%, rgba(230,184,255,.18) 0%, rgba(230,184,255,0) 55%), radial-gradient(28vw 28vw at 72% 15%, rgba(244,226,166,.44) 0%, rgba(244,226,166,0) 60%), radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.28) 0%, rgba(217,178,76,0) 60%);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            transition: opacity 0.5s ease-out;
            pointer-events: auto;
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
    <!-- Video overlay - SIEMPRE visible primero -->
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
            var targetUrl = "{{ $redirect }}";
            var overlay = document.getElementById('videoOverlay');
            var minTime = 3000;
            var startTime = Date.now();
            var iframeLoaded = false;
            var minTimePassed = false;
            var transitioned = false;
            var iframe = null;
            
            console.log('[Auth-Loading] Starting, target:', targetUrl);
            
            // Crear iframe después de un pequeño delay para asegurar que el token está guardado
            setTimeout(function() {
                iframe = document.createElement('iframe');
                iframe.id = 'preloadFrame';
                iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:1;opacity:0;visibility:hidden;';
                
                iframe.onload = function() {
                    console.log('[Auth-Loading] Iframe loaded');
                    iframeLoaded = true;
                    tryTransition();
                };
                
                iframe.onerror = function() {
                    console.log('[Auth-Loading] Iframe error, will redirect');
                    iframeLoaded = true;
                    tryTransition();
                };
                
                // Insertar al inicio del body (debajo del overlay)
                document.body.insertBefore(iframe, document.body.firstChild);
                iframe.src = targetUrl;
                
                console.log('[Auth-Loading] Iframe created and loading...');
            }, 100);
            
            // Timer del tiempo mínimo
            setTimeout(function() {
                console.log('[Auth-Loading] Min time reached');
                minTimePassed = true;
                tryTransition();
            }, minTime);
            
            // Timeout de seguridad - si después de 8s no ha cargado, redirigir directamente
            setTimeout(function() {
                if (!transitioned) {
                    console.log('[Auth-Loading] Safety timeout - redirecting');
                    window.location.replace(targetUrl);
                }
            }, 8000);
            
            function tryTransition() {
                if (transitioned) return;
                if (!minTimePassed || !iframeLoaded) return;
                
                transitioned = true;
                console.log('[Auth-Loading] Transitioning...');
                
                // Mostrar iframe
                if (iframe) {
                    iframe.style.opacity = '1';
                    iframe.style.visibility = 'visible';
                }
                
                // Fade out del overlay
                overlay.classList.add('fade-out');
                
                // Actualizar URL y limpiar
                setTimeout(function() {
                    try {
                        history.replaceState(null, '', targetUrl);
                        console.log('[Auth-Loading] URL updated');
                    } catch(e) {}
                    
                    // Remover overlay
                    setTimeout(function() {
                        overlay.remove();
                    }, 500);
                }, 100);
            }
        })();
    </script>
</body>
</html>
