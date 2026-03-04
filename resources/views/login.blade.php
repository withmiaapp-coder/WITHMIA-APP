<!DOCTYPE html>
<html lang="es">
<script>
(function(){
    var s = localStorage.getItem('withmia_login_theme');
    if (!s) s = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    if (s === 'dark') document.documentElement.classList.add('dark');
})();
</script>
<head>
    <meta charset="UTF-8">
    <title>Bienvenido a WITHMIA®</title>
    <link rel="icon" href="/logo-withmia.webp?v=2025-withmia" type="image/webp">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
            --bg: #ffffff;
            --bg-gradient: radial-gradient(76vw 76vw at 12% 18%, rgba(230,184,255,.1) 0%, rgba(230,184,255,.05) 50%, rgba(230,184,255,0) 70%), radial-gradient(40vw 40vw at 8% 65%, rgba(125,77,255,.35) 0%, rgba(125,77,255,0) 55%), radial-gradient(40vw 40vw at 85% 82%, rgba(59,195,255,.3) 0%, rgba(59,195,255,0) 55%), radial-gradient(35vw 35vw at 85% 8%, rgba(230,184,255,.18) 0%, rgba(230,184,255,0) 55%), radial-gradient(28vw 28vw at 72% 15%, rgba(244,226,166,.44) 0%, rgba(244,226,166,0) 60%), radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.28) 0%, rgba(217,178,76,0) 60%);
            --text-primary: #000000;
            --text-secondary: #333333;
            --text-muted: #666666;
            --google-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
            --toggle-bg: rgba(0, 0, 0, 0.06);
            --toggle-icon-active: #f59e0b;
            --toggle-icon-inactive: #94a3b8;
            --container-border: rgba(255, 255, 255, 0.3);
        }

        html.dark {
            --bg: #080a14;
            --bg-gradient:
                radial-gradient(76vw 76vw at 12% 18%, rgba(200,140,255,.12) 0%, rgba(200,140,255,.05) 50%, transparent 70%),
                radial-gradient(40vw 40vw at 8% 65%, rgba(125,77,255,.18) 0%, transparent 55%),
                radial-gradient(40vw 40vw at 85% 82%, rgba(59,195,255,.14) 0%, transparent 55%),
                radial-gradient(35vw 35vw at 85% 8%, rgba(200,140,255,.09) 0%, transparent 55%),
                radial-gradient(28vw 28vw at 72% 15%, rgba(244,226,166,.12) 0%, transparent 60%),
                radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.08) 0%, transparent 60%);
            --text-primary: #eeeef5;
            --text-secondary: #b8b8cc;
            --text-muted: #7a7a96;
            --google-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
            --toggle-bg: rgba(255, 255, 255, 0.06);
            --toggle-icon-active: #a78bfa;
            --toggle-icon-inactive: #475569;
            --container-border: rgba(139, 92, 246, 0.12);
        }

        html { background-color: var(--bg); }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg);
            background-image: var(--bg-gradient);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: background-color 0.4s ease;
        }

        .login-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .login-logo {
            width: 200px;
            height: 200px;
            object-fit: contain;
        }

        .loading-text {
            color: var(--text-primary);
            font-size: 1.5rem;
            font-weight: 300;
            text-align: center;
            transition: color 0.4s ease;
        }

        .loading-text strong {
            font-weight: 700;
        }

        .google-signin-container {
            margin-top: 2rem;
            box-shadow: var(--google-shadow);
            border-radius: 6px;
            padding: 2px;
            transition: box-shadow 0.3s ease;
        }

        html.dark .google-signin-container {
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.06);
        }

        .terms-text {
            text-align: center;
            font-size: 0.65em;
            color: var(--text-muted);
            margin: 30px auto 0 auto;
            max-width: 350px;
            line-height: 1.4;
        }

        .terms-text a {
            color: var(--text-secondary);
            text-decoration: underline;
        }

        .atlantis-credit {
            margin-top: 2rem;
            display: flex;
            align-items: center;
            gap: 6px;
            opacity: 0.4;
            cursor: pointer;
            transition: opacity 0.3s;
        }

        .atlantis-credit:hover {
            opacity: 0.7;
        }

        .atlantis-credit span {
            font-size: 0.6rem;
            color: var(--text-muted);
        }

        .atlantis-credit .name {
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        /* Theme Toggle */
        .theme-toggle {
            position: fixed;
            top: 16px;
            right: 16px;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--toggle-bg);
            backdrop-filter: blur(12px);
            border: 1px solid var(--container-border);
            border-radius: 50px;
            padding: 6px;
            cursor: pointer;
            transition: all 0.4s ease;
        }

        .theme-toggle:hover {
            box-shadow: 0 4px 16px rgba(139, 92, 246, 0.2);
            border-color: rgba(139, 92, 246, 0.3);
        }

        .theme-toggle-btn {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: none;
            background: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all 0.3s ease;
            color: var(--toggle-icon-inactive);
        }

        .theme-toggle-btn.active {
            background: rgba(139, 92, 246, 0.15);
            color: var(--toggle-icon-active);
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.2);
        }

        .error-message {
            display: none;
            color: #e74c3c;
            background: #fdf2f2;
            border: 1px solid #f5c6cb;
            padding: 10px;
            border-radius: 6px;
            margin-top: 10px;
            font-size: 0.9rem;
            text-align: center;
        }
    </style>
</head>
<body>
    <!-- Theme Toggle -->
    <div class="theme-toggle" id="themeToggle">
        <button class="theme-toggle-btn active" id="lightBtn" title="Modo Claro" onclick="setTheme('light')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>
        <button class="theme-toggle-btn" id="darkBtn" title="Modo Oscuro" onclick="setTheme('dark')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
    </div>

    <div class="login-content">
        <video class="login-logo" autoplay loop muted playsinline>
            <source src="/logo-animated.webm" type="video/webm">
            <img src="/logo-withmia.webp?v=2025-withmia" alt="WITHMIA Logo">
        </video>

        <div class="loading-text">
            WITH YOU, WITH<strong>MIA</strong><sup style="font-size: 0.6em; font-weight: 300;">®</sup>
        </div>

        <div class="google-signin-container">
            <script>
async function handleCredentialResponse(response) {
    try {
        const responsePayload = parseJwt(response.credential);
        console.log("Procesando login de Google...");

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/auth/google';
        form.style.display = 'none';

        let csrfToken = '';
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        if (csrfMeta) {
            csrfToken = csrfMeta.getAttribute('content') || '';
        } else {
            const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            if (match) csrfToken = decodeURIComponent(match[1]);
        }

        const fields = {
            '_token': csrfToken,
            'credential': response.credential,
            'google_id': responsePayload.sub,
            'email': responsePayload.email,
            'name': responsePayload.name,
            'picture': responsePayload.picture
        };

        const pendingPlan = @json($plan ?? null);
        if (pendingPlan) {
            fields['plan'] = pendingPlan;
        }

        for (const [key, value] of Object.entries(fields)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
    } catch (error) {
        console.error('Error:', error);
        alert('Error en el login. Por favor intenta de nuevo.');
    }
}

function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}
            </script>
            <div id="g_id_onload"
                 data-client_id="{{ config('services.google.client_id') }}"
                 data-callback="handleCredentialResponse"
                 data-auto_prompt="false">
            </div>
            <div class="g_id_signin"
                 data-type="standard"
                 data-shape="rectangular"
                 data-theme="outline"
                 data-text="signin_with"
                 data-size="large"
                 data-logo_alignment="left">
            </div>
        </div>

        <p class="terms-text">Al continuar, aceptas nuestros <a href="https://withmia.com/terminos/" target="_blank">Términos de Servicio</a> y lee nuestra <a href="https://withmia.com/privacidad/" target="_blank">Política de Privacidad</a>.</p>

        <div class="atlantis-credit" onclick="window.open('https://atlantisproducciones.cl/', '_blank')">
            <span>Desarrollado por</span>
            <img src="/Logo-Atlantis.webp" style="height: 14px;">
            <span class="name">ATLANTIS PRODUCCIONES</span>
        </div>
    </div>

    <script>
        function setTheme(theme) {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            localStorage.setItem('withmia_login_theme', theme);
            updateToggleButtons(theme);
            updateGoogleTheme(theme);
        }

        function updateToggleButtons(theme) {
            var lightBtn = document.getElementById('lightBtn');
            var darkBtn = document.getElementById('darkBtn');
            if (theme === 'dark') {
                lightBtn.classList.remove('active');
                darkBtn.classList.add('active');
            } else {
                lightBtn.classList.add('active');
                darkBtn.classList.remove('active');
            }
        }

        function updateGoogleTheme(theme) {
            var container = document.querySelector('.g_id_signin');
            if (container && window.google && google.accounts && google.accounts.id) {
                container.setAttribute('data-theme', theme === 'dark' ? 'filled_black' : 'outline');
                try {
                    google.accounts.id.renderButton(container, {
                        type: 'standard',
                        shape: 'rectangular',
                        theme: theme === 'dark' ? 'filled_black' : 'outline',
                        text: 'signin_with',
                        size: 'large',
                        logo_alignment: 'left'
                    });
                } catch(e) {}
            }
        }

        (function() {
            var saved = localStorage.getItem('withmia_login_theme');
            if (!saved) {
                saved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            document.addEventListener('DOMContentLoaded', function() {
                updateToggleButtons(saved);
                setTimeout(function() { updateGoogleTheme(saved); }, 1000);
            });
        })();
    </script>

    <script>
        (function() {
            fetch("/check-session", { credentials: 'include' })
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    if (data.authenticated) {
                        window.location.href = "/onboarding";
                    }
                })
                .catch(function() {});
        })();
    </script>
</body>
</html>

