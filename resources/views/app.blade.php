<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="user-id" content="{{ auth()->id() ?? '' }}">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss: ws: http://localhost:* ws://localhost:*;">
        <meta http-equiv="Cross-Origin-Embedder-Policy" content="unsafe-none">

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
        @inertia
 </body>
</html>
