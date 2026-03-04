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
                // mode === 'light' → isDark stays false

                if (isDark) {
                    document.documentElement.classList.add('dark');
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
        @inertia
 </body>
</html>
