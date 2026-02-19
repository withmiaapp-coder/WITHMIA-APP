<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="user-id" content="{{ auth()->id() ?? '' }}">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss: ws: http://localhost:* ws://localhost:*; img-src 'self' https: data: blob:; media-src 'self' https: data: blob:;">
        <meta http-equiv="Cross-Origin-Embedder-Policy" content="unsafe-none">
        
        {{-- Reverb WebSocket Configuration - Uses config() so it works after config:cache --}}
        <meta name="reverb-host" content="{{ config('reverb.servers.reverb.hostname', 'localhost') }}">
        <meta name="reverb-key" content="{{ config('reverb.apps.apps.0.key', '') }}">
        <meta name="reverb-port" content="{{ config('reverb.apps.apps.0.options.port', 443) }}">
        <meta name="reverb-scheme" content="{{ config('reverb.apps.apps.0.options.scheme', 'https') }}">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html, body {
                background-color: oklch(1 0 0);
                min-height: 100vh;
            }

            html.dark, html.dark body {
                background-color: oklch(0.145 0 0);
            }

            /* Prevenir flash blanco/negro durante la carga */
            #app {
                min-height: 100vh;
                background-color: inherit;
            }

            /* Suavizar transición de carga */
            body {
                opacity: 1;
                transition: opacity 0.15s ease-in;
            }
        </style>

        <title inertia>@yield('title', 'WITHMIA')</title>

        <link rel="icon" href="/logo-withmia.webp" sizes="any">
        <link rel="icon" href="/logo-withmia.webp" type="image/webp">
        <link rel="apple-touch-icon" href="/logo-withmia.webp">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        {{-- Splash screen mientras carga el bundle de React/Vite --}}
        <div id="app-splash" style="position:fixed;inset:0;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;background-image:radial-gradient(76vw 76vw at 12% 18%,rgba(230,184,255,.1) 0%,rgba(230,184,255,0) 70%),radial-gradient(40vw 40vw at 8% 65%,rgba(125,77,255,.35) 0%,rgba(125,77,255,0) 55%),radial-gradient(40vw 40vw at 85% 82%,rgba(59,195,255,.3) 0%,rgba(59,195,255,0) 55%),radial-gradient(28vw 28vw at 72% 15%,rgba(244,226,166,.44) 0%,rgba(244,226,166,0) 60%);transition:opacity 0.4s ease-out;font-family:'Segoe UI','Roboto','Helvetica Neue',Arial,sans-serif;">
            <video autoplay loop muted playsinline style="width:160px;height:160px;object-fit:contain;">
                <source src="/logo-animated.webm" type="video/webm">
                <img src="/logo-withmia.webp?v=2025-withmia" alt="WITHMIA" style="width:160px;height:160px;">
            </video>
            <div style="margin-top:1.2rem;font-size:1.3rem;font-weight:300;color:#1a1a1a;letter-spacing:0.5px;">WITH YOU, WITH<strong style="font-weight:600;">MIA</strong><sup style="font-size:0.6em;">®</sup></div>
            <div style="margin-top:1.2rem;display:flex;gap:6px;">
                <span style="width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,0.2);animation:sp 1.4s ease-in-out infinite;"></span>
                <span style="width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,0.2);animation:sp 1.4s ease-in-out 0.2s infinite;"></span>
                <span style="width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,0.2);animation:sp 1.4s ease-in-out 0.4s infinite;"></span>
            </div>
            <style>@keyframes sp{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1.2)}}</style>
        </div>
        <script>
            // Remover splash cuando React monte el app
            (function() {
                var observer = new MutationObserver(function(mutations) {
                    var app = document.getElementById('app');
                    if (app && app.children.length > 0) {
                        observer.disconnect();
                        var splash = document.getElementById('app-splash');
                        if (splash) {
                            splash.style.opacity = '0';
                            setTimeout(function() { splash.remove(); }, 500);
                        }
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
                // Fallback: quitar después de 8 segundos
                setTimeout(function() {
                    var splash = document.getElementById('app-splash');
                    if (splash) { splash.style.opacity = '0'; setTimeout(function() { splash.remove(); }, 500); }
                }, 8000);
            })();
        </script>
        @inertia
 </body>
</html>
