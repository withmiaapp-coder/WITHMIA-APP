<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss: ws:{{ app()->isLocal() ? ' http://localhost:* ws://localhost:*' : '' }}; img-src 'self' https: data: blob:; media-src 'self' https: data: blob:;">
        <meta http-equiv="Cross-Origin-Embedder-Policy" content="unsafe-none">
        
        {{-- Reverb WebSocket Configuration - Uses config() so it works after config:cache --}}
        <meta name="reverb-host" content="{{ config('reverb.servers.reverb.hostname', 'localhost') }}">
        <meta name="reverb-key" content="{{ config('reverb.apps.apps.0.key', '') }}">
        <meta name="reverb-port" content="{{ config('reverb.apps.apps.0.options.port', 443) }}">
        <meta name="reverb-scheme" content="{{ config('reverb.apps.apps.0.options.scheme', 'https') }}">

        {{-- Inline script to detect dark mode from WITHMIA theme system + system preference --}}
        <script>
            (function() {
                // Priority: withmia_theme_mode (localStorage) → system preference
                var mode = null;
                try { mode = localStorage.getItem('withmia_theme_mode'); } catch(e) {}

                var isDark = false;
                if (mode === 'dark') {
                    isDark = true;
                } else if (mode === 'system' || !mode) {
                    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                }

                if (isDark) {
                    document.documentElement.classList.add('dark');
                }

                // Detect transition=1 in URL → show loading overlay while React loads
                var urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('transition') === '1') {
                    document.documentElement.setAttribute('data-loading-transition', isDark ? 'dark' : 'light');
                    // Save auth_token to localStorage if present
                    var authToken = urlParams.get('auth_token');
                    if (authToken) {
                        try { localStorage.setItem('railway_auth_token', authToken); } catch(e) {}
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

            /* ═══ LOADING TRANSITION OVERLAY ═══ */
            #__loading_overlay {
                position: fixed;
                top: 0; left: 0;
                width: 100vw; height: 100vh;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                opacity: 1;
                transition: opacity 0.5s ease-out;
                pointer-events: all;
                /* Light mode gradients */
                background-color: #ffffff;
                background-image:
                    radial-gradient(76vw 76vw at 12% 18%, rgba(230,184,255,.1) 0%, rgba(230,184,255,.05) 50%, rgba(230,184,255,0) 70%),
                    radial-gradient(40vw 40vw at 8% 65%, rgba(125,77,255,.35) 0%, rgba(125,77,255,0) 55%),
                    radial-gradient(40vw 40vw at 85% 82%, rgba(59,195,255,.3) 0%, rgba(59,195,255,0) 55%),
                    radial-gradient(35vw 35vw at 85% 8%, rgba(230,184,255,.18) 0%, rgba(230,184,255,0) 55%),
                    radial-gradient(28vw 28vw at 72% 15%, rgba(244,226,166,.44) 0%, rgba(244,226,166,0) 60%),
                    radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.28) 0%, rgba(217,178,76,0) 60%);
            }

            /* Dark mode overlay */
            html.dark #__loading_overlay {
                background-color: #0d1017;
                background-image:
                    radial-gradient(76vw 76vw at 12% 18%, rgba(129,140,248,.08) 0%, rgba(129,140,248,.03) 50%, rgba(129,140,248,0) 70%),
                    radial-gradient(40vw 40vw at 8% 65%, rgba(99,102,241,.2) 0%, rgba(99,102,241,0) 55%),
                    radial-gradient(40vw 40vw at 85% 82%, rgba(59,130,246,.15) 0%, rgba(59,130,246,0) 55%),
                    radial-gradient(35vw 35vw at 85% 8%, rgba(139,92,246,.12) 0%, rgba(139,92,246,0) 55%),
                    radial-gradient(28vw 28vw at 72% 15%, rgba(245,158,11,.08) 0%, rgba(245,158,11,0) 60%),
                    radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.1) 0%, rgba(217,178,76,0) 60%);
            }

            #__loading_overlay .video-container {
                width: 200px; height: 200px;
                display: flex; justify-content: center; align-items: center;
            }

            #__loading_overlay video {
                width: 100%; height: 100%; object-fit: cover;
            }

            #__loading_overlay .loading-text {
                margin-top: 2rem;
                color: #000;
                font-size: 1.5rem;
                font-weight: 300;
            }

            #__loading_overlay .loading-text strong {
                font-weight: 700;
            }

            html.dark #__loading_overlay .loading-text {
                color: #e2e8f0;
            }

            #__loading_overlay.fade-out {
                opacity: 0;
                pointer-events: none;
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
        {{-- Loading transition overlay: renders instantly ABOVE the Inertia app while React loads --}}
        <script>
            if (document.documentElement.hasAttribute('data-loading-transition')) {
                document.write(
                    '<div id="__loading_overlay">' +
                        '<div class="video-container">' +
                            '<video autoplay muted playsinline loop>' +
                                '<source src="/logo-animated.webm" type="video/webm">' +
                            '</video>' +
                        '</div>' +
                        '<div class="loading-text">WITH YOU, WITH<strong>MIA</strong></div>' +
                    '</div>'
                );
            }
        </script>
        @inertia
 </body>
</html>
