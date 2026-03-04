@php
    // Detect user's theme mode from DB settings (no need to pass from controller)
    $themeMode = null; // null = no DB value, let JS check localStorage
    try {
        $authUser = auth()->user();
        if ($authUser && !empty($authUser->settings['theme_mode'])) {
            $themeMode = $authUser->settings['theme_mode'];
        }
    } catch (\Throwable $e) {}
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WITHMIA</title>
    <script>
        // 🎨 Detect dark mode: DB value from server → localStorage fallback → system preference
        (function() {
            var serverMode = @json($themeMode);
            var isDark = false;

            // Determine the effective mode: server DB → localStorage → default light
            var effectiveMode = serverMode;
            if (!effectiveMode) {
                // No DB value — check localStorage
                try { effectiveMode = localStorage.getItem('withmia_theme_mode'); } catch(e) {}
            }

            if (effectiveMode === 'dark') {
                isDark = true;
            } else if (effectiveMode === 'system') {
                isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
            // 'light' or null/undefined → isDark stays false

            if (isDark) {
                document.documentElement.classList.add('dark-loading');
            }
        })();

        // 🔑 PRE-GUARDAR TOKEN INMEDIATAMENTE
        (function() {
            var targetUrl = @json($redirect);
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
        
        /* ═══ LIGHT MODE (default) ═══ */
        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #ffffff;
        }
        
        .background-frame {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: 1;
            border: none;
            background: #ffffff;
        }
        
        .background-frame.active {
            z-index: 10000;
        }
        
        .video-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background-color: #ffffff;
            background-image:
                radial-gradient(76vw 76vw at 12% 18%, rgba(230,184,255,.1) 0%, rgba(230,184,255,.05) 50%, rgba(230,184,255,0) 70%),
                radial-gradient(40vw 40vw at 8% 65%, rgba(125,77,255,.35) 0%, rgba(125,77,255,0) 55%),
                radial-gradient(40vw 40vw at 85% 82%, rgba(59,195,255,.3) 0%, rgba(59,195,255,0) 55%),
                radial-gradient(35vw 35vw at 85% 8%, rgba(230,184,255,.18) 0%, rgba(230,184,255,0) 55%),
                radial-gradient(28vw 28vw at 72% 15%, rgba(244,226,166,.44) 0%, rgba(244,226,166,0) 60%),
                radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.28) 0%, rgba(217,178,76,0) 60%);
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
            transition: opacity 0.4s ease-out;
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

        /* ═══ DARK MODE ═══ */
        html.dark-loading, html.dark-loading body {
            background-color: #0d1017;
        }

        html.dark-loading .background-frame {
            background: #0d1017;
        }

        html.dark-loading .video-overlay {
            background-color: #0d1017;
            background-image:
                radial-gradient(76vw 76vw at 12% 18%, rgba(129,140,248,.08) 0%, rgba(129,140,248,.03) 50%, rgba(129,140,248,0) 70%),
                radial-gradient(40vw 40vw at 8% 65%, rgba(99,102,241,.2) 0%, rgba(99,102,241,0) 55%),
                radial-gradient(40vw 40vw at 85% 82%, rgba(59,130,246,.15) 0%, rgba(59,130,246,0) 55%),
                radial-gradient(35vw 35vw at 85% 8%, rgba(139,92,246,.12) 0%, rgba(139,92,246,0) 55%),
                radial-gradient(28vw 28vw at 72% 15%, rgba(245,158,11,.08) 0%, rgba(245,158,11,0) 60%),
                radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.1) 0%, rgba(217,178,76,0) 60%);
        }

        html.dark-loading .loading-text {
            color: #e2e8f0;
        }
    </style>
</head>
<body>
    <!-- Iframe carga el destino INMEDIATAMENTE detrás del video -->
    <iframe id="backgroundFrame" class="background-frame" src="{{ e($redirect) }}"></iframe>

    <!-- Video overlay encima -->
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
            var targetUrl = @json($redirect);
            var overlay = document.getElementById('videoOverlay');
            var backgroundFrame = document.getElementById('backgroundFrame');
            var iframeLoaded = false;
            
            // Construir URL absoluta
            var absoluteUrl = new URL(targetUrl, window.location.origin).href;
            console.log('[Auth-Loading] Target URL:', absoluteUrl);
            console.log('[Auth-Loading] Video playing, destination loading in iframe...');
            
            // Detectar cuando iframe termina de cargar
            backgroundFrame.onload = function() {
                iframeLoaded = true;
                console.log('[Auth-Loading] Iframe loaded completely');
            };
            
            // A los 3 segundos: fade overlay → reveal iframe → navigate
            setTimeout(function() {
                console.log('[Auth-Loading] Starting transition...');
                
                // Step 1: Fade out the overlay to reveal the iframe underneath
                overlay.classList.add('fade-out');
                
                // Step 2: After fade completes, promote iframe and navigate
                setTimeout(function() {
                    // Make iframe the top layer (user already sees it from the fade)
                    backgroundFrame.classList.add('active');
                    
                    // Step 3: After a brief moment, do the actual navigation
                    // The user already sees the app in the iframe, so the flash is invisible
                    setTimeout(function() {
                        console.log('[Auth-Loading] Navigating to:', absoluteUrl);
                        top.location.replace(absoluteUrl);
                    }, 300);
                }, 400); // matches fade-out transition duration
            }, 3000);
        })();
    </script>
</body>
</html>
