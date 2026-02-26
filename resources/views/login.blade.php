<!DOCTYPE html>
<html lang="es">
<head>
 <meta charset=UTF-8>
 <title>Bienvenido a WITHMIA®</title>
    <link rel="icon" href="/logo-withmia.webp?v=2025-withmia" type="image/webp">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        }

        /* ===== LIGHT / DARK CSS VARIABLES ===== */
        :root {
            --bg: #ffffff;
            --bg-gradient: radial-gradient(76vw 76vw at 12% 18%, rgba(230,184,255,.1) 0%, rgba(230,184,255,.05) 50%, rgba(230,184,255,0) 70%), radial-gradient(40vw 40vw at 8% 65%, rgba(125,77,255,.35) 0%, rgba(125,77,255,0) 55%), radial-gradient(40vw 40vw at 85% 82%, rgba(59,195,255,.3) 0%, rgba(59,195,255,0) 55%), radial-gradient(35vw 35vw at 85% 8%, rgba(230,184,255,.18) 0%, rgba(230,184,255,0) 55%), radial-gradient(28vw 28vw at 72% 15%, rgba(244,226,166,.44) 0%, rgba(244,226,166,0) 60%), radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.28) 0%, rgba(217,178,76,0) 60%);
            --container-bg: rgba(255, 255, 255, 0.95);
            --container-border: rgba(255, 255, 255, 0.3);
            --container-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
            --panel-bg: #ffffff;
            --text-primary: #000000;
            --text-secondary: #333333;
            --text-muted: #666666;
            --text-faint: #9ca3af;
            --box-bg: #ffffff;
            --box-border: rgba(0, 0, 0, 0.05);
            --box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            --btn-bg: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            --btn-border: #e0e0e0;
            --btn-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            --btn-text: #000000;
            --google-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
            --terms-color: #666666;
            --star-color: inherit;
            --toggle-bg: rgba(0, 0, 0, 0.06);
            --toggle-icon-active: #f59e0b;
            --toggle-icon-inactive: #94a3b8;
            --border-shimmer: linear-gradient(45deg, rgba(255,215,0,0.6), rgba(255,165,0,0.4), rgba(255,255,0,0.5), rgba(255,215,0,0.6));
        }

        html.dark {
            --bg: #080a14;
            --bg-gradient:
                radial-gradient(60vw 60vw at 15% 20%, rgba(99,66,174,.15) 0%, transparent 70%),
                radial-gradient(50vw 50vw at 80% 80%, rgba(30,120,200,.10) 0%, transparent 60%),
                radial-gradient(35vw 35vw at 50% 50%, rgba(139,92,246,.05) 0%, transparent 55%);
            --container-bg: rgba(12, 14, 28, 0.85);
            --container-border: rgba(139, 92, 246, 0.12);
            --container-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 80px rgba(139, 92, 246, 0.06);
            --panel-bg: transparent;
            --text-primary: #eeeef5;
            --text-secondary: #b8b8cc;
            --text-muted: #7a7a96;
            --text-faint: #50506a;
            --box-bg: rgba(255, 255, 255, 0.04);
            --box-border: rgba(255, 255, 255, 0.06);
            --box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            --btn-bg: linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(59,195,255,0.08) 100%);
            --btn-border: rgba(139, 92, 246, 0.2);
            --btn-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            --btn-text: #eeeef5;
            --google-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
            --terms-color: #7a7a96;
            --star-color: #f5c518;
            --toggle-bg: rgba(255, 255, 255, 0.06);
            --toggle-icon-active: #a78bfa;
            --toggle-icon-inactive: #475569;
            --border-shimmer: linear-gradient(45deg, rgba(139,92,246,0.4), rgba(59,195,255,0.25), rgba(167,139,250,0.3), rgba(139,92,246,0.4));
        }

        /* Fondo base inmediato para evitar flash */
        html {
            background-color: var(--bg);
        }

        body {
            font-weight: 350;
            font-family: Arial, sans-serif;
            background-color: var(--bg);
            background-image: var(--bg-gradient);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.4s ease;
        }

        @keyframes gasMovement {
            0% { transform: translateX(0px) translateY(0px) rotate(0deg); }
            20% { transform: translateX(25px) translateY(15px) rotate(5deg) scale(1.1); }
            40% { transform: translateX(-15px) translateY(30px) rotate(-3deg) scale(1.2); }
            60% { transform: translateX(35px) translateY(-10px) rotate(8deg) scale(0.9); }
            80% { transform: translateX(-20px) translateY(25px) rotate(-5deg) scale(1.15); }
            100% { transform: translateX(0px) translateY(0px) rotate(0deg); }
        }
        @keyframes gasMovementOld {
            0%, 100% { transform: translateX(0px) translateY(0px); }
            25% { transform: translateX(15px) translateY(8px) scale(1.1); } 50% { transform: translateX(30px) translateY(20px) scale(1.2); } 75% { transform: translateX(10px) translateY(15px) scale(1.05); }
        }

        .login-container {
            position: relative;
            background: var(--container-bg);
            backdrop-filter: blur(10px);
            border: 1px solid var(--container-border);
            box-shadow: var(--container-shadow);
            border-radius: 30px;
            max-width: 1000px;
            width: 90%; margin: auto;
            overflow: hidden;
            display: flex;
            min-height: 500px;
            transition: background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
        .left-panel {
            flex: 1;
            background: var(--panel-bg);
            color: var(--text-primary);
            padding: 1rem 3rem 1rem 3rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .right-panel {
            flex: 1;
            background: var(--panel-bg);
            padding: 1rem 3rem 1rem 3rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        }

        .login-container::before {
            content: "";
 position: absolute;
 top: -2px;
 left: -2px;
 right: -2px;
 bottom: -2px;
 background: var(--border-shimmer);
 background-size: 300% 300%;
 border-radius: 32px;
 z-index: -1;
 animation: borderShimmer 6s ease-in-out infinite;
        }

        .login-logo {
            width: 200px;
            height: 200px;
            margin: -10px 0 -10px 0;
            object-fit: contain;
        }

.exclusive-text {
            font-size: 2.0em;
            text-align: center;
            color: var(--text-primary);
            margin: 8px 0 15px 0;
            font-style: normal;
            line-height: 1.4;
            font-weight: bold;
            transition: color 0.4s ease;
        }
        .terms-text {
            font-size: 0.65em;
            color: var(--text-muted);
            text-align: center;
            margin: 15px auto 0 auto;
            line-height: 1.4;
            display: block;
            width: 100%;
            padding: 0 20px;
            box-sizing: border-box;
            text-align: center !important;
        }
            font-size: 2.0em;
            text-align: center;
            display: flex;
            justify-content: center;
        }



 50% {
 background-position: 200% 50%;
 }
 75% {
 background-position: 300% 50%;
 }
 }

        @keyframes borderShimmer {
            0% { filter: hue-rotate(0deg) brightness(1); }
            25% { filter: hue-rotate(90deg) brightness(1.05); }
            50% { filter: hue-rotate(180deg) brightness(1.02); }
            75% { filter: hue-rotate(270deg) brightness(1.05); }
            100% { filter: hue-rotate(360deg) brightness(1); }
        }
        .atlantis-box {
            display: inline-block;
            background: var(--box-bg); box-shadow: var(--box-shadow);
            padding: 6px 10px 6px 10px;
            border-radius: 12px;
            font-size: 1em;
            color: var(--text-primary);
            margin-bottom: 0px; margin-top: 8px;
            text-align: center;
            transition: background 0.4s ease, color 0.4s ease, box-shadow 0.4s ease;
        }

        /* Botón Atlantis con iluminación */
        .atlantis-btn {
            cursor: pointer;
            background: var(--btn-bg);
            color: var(--btn-text);
            border: 1px solid var(--btn-border);
            box-shadow: var(--btn-shadow);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10px 18px;
            border-radius: 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .atlantis-btn:hover {
            border-color: #9f7aea;
            box-shadow: 0 4px 20px rgba(139, 92, 246, 0.35), 0 0 30px rgba(167, 139, 250, 0.2), inset 0 0 20px rgba(196, 181, 253, 0.08);
            transform: translateY(-2px);
        }

        .atlantis-btn:active {
            transform: translateY(0);
            box-shadow: 0 2px 10px rgba(139, 92, 246, 0.3);
        }

        .atlantis-btn span {
            font-weight: 600;
            letter-spacing: 1px;
            color: var(--btn-text);
            transition: all 0.3s ease;
        }

        .atlantis-btn:hover span {
            color: var(--btn-text);
        }

        /* Mejorar sombra en marquee */
        marquee {
            padding: 10px 0;
        }

        marquee .atlantis-box {
            box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
            margin: 5px 0;
        }

        /* Ajustar límites del marquee */
        marquee {
            margin: 0;
            width: 100%;
            overflow: visible;
        }
        
        .left-panel {
            overflow: hidden;
        }

        /* Mejorar marquee sutilmente */
        marquee {
            white-space: nowrap;
        }

        /* Ampliar área del marquee balanceado */
        marquee {
            margin-left: -2.5rem;
            margin-right: -2.5rem;
            padding-left: 2.5rem;
            padding-right: 2.5rem;
            width: calc(100% + 5rem);
        }

        /* Mejorar contenedores de testimonios */
        marquee .atlantis-box {
            padding: 10px 15px !important;
            min-height: 100px !important;
            text-align: left !important;
            line-height: 1.4 !important;
            font-size: 0.9em !important;
            border: 1px solid var(--box-border) !important;
            position: relative;
        }

        marquee .atlantis-box strong {
            font-size: 1em;
            color: var(--text-secondary);
            display: block;
            margin-top: 5px;
        }


        /* Mover contenido hacia arriba */
        .left-panel {
            padding-top: 0.5rem !important;
        }

        /* Uniformar ancho de contenedores */
        marquee .atlantis-box {
            width: 200px !important;
            min-width: 200px !important;
            max-width: 200px !important;
            box-sizing: border-box !important;
        }

        /* Loading spinner y error handling */
        .loading-spinner {
            display: none;
            width: 24px;
            height: 24px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 15px auto;
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

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Reducir espacio entre título y testimonios */
        .exclusive-text {
            margin-bottom: 5px !important;
        }
        
        marquee {
            margin-top: 5px !important;
        }    

        /* Mover todo el contenido izquierdo hacia arriba */
        .left-panel {
            padding-top: 0 !important;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
        }
        
        /* Imagen del laurel pegada al borde superior */
        .left-panel center:first-child {
            margin-top: 0;
            margin-bottom: 5px;
        }
        
        .left-panel center:first-child img {
            margin-top: 0;
            margin-bottom: 0;
        }

        /* Mover contenido izquierdo hacia arriba (normal) */
        .left-panel {
            padding-top: 0 !important;
        }
        
        /* Imagen del laurel sin espacios extras */
        .left-panel center:first-child {
            margin-top: 0;
            margin-bottom: 5px;
        }
        
        .left-panel center:first-child img {
            margin-top: 0;
            margin-bottom: 0;
        }

        /* Sombra natural para botón de Google */
        .google-signin-container {
            box-shadow: var(--google-shadow);
            border-radius: 6px;
            padding: 2px;
            transition: box-shadow 0.3s ease;
        }

        .google-signin-container:hover {
            box-shadow: var(--google-shadow);
        }

        /* ===== THEME TOGGLE ===== */
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

        /* Google button dark theme override */
        html.dark .google-signin-container {
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.06);
        }

        /* Invert Atlantis logo in dark mode */
        html.dark .atlantis-btn img {
            filter: invert(1) brightness(0.9);
        }

        /* Laurel logo: ensure transparency, no white bg */
        html.dark .laurel-img {
            filter: brightness(1.3) contrast(1.1);
        }

        /* Testimonial text color in dark */
        html.dark marquee .atlantis-box span {
            color: var(--text-muted);
        }

        /* Testimonial cards dark: subtle glass */
        html.dark marquee .atlantis-box {
            background: rgba(255,255,255,0.03) !important;
            border-color: rgba(255,255,255,0.06) !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3) !important;
            backdrop-filter: blur(8px);
        }

        /* Right panel text */
        html.dark .right-panel p {
            color: var(--text-secondary);
        }

        /* Dark mode: small boxes (Disponible para, icons row) */
        html.dark .atlantis-box {
            border: 1px solid rgba(255,255,255,0.06);
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

    <div class="login-container">
        <div class="left-panel">
            <center><img src="/laurel-logo.ico" width="250" class="laurel-img" style="margin-bottom: 0px;"></center>
            <center><div class=atlantis-box style=position:relative;top:-65px;margin-bottom:0px;>Disponible para</div></center>
            <center><div style=margin-top:-60px><div class=atlantis-box style=display:inline-flex;gap:15px;padding:9px;align-items:center><img src=/icons/whatsapp.webp style=width:24px;height:24px title=WhatsApp><img src=/icons/instagram-new.webp style=width:24px;height:24px title=Instagram><img src=/icons/facebook-new.webp style=width:28px;height:28px title=Facebook><img src=/icons/gmail-new.webp style=width:40px;height:40px;margin:-8px title=Gmail><img src=/icons/web-new.webp style=width:24px;height:24px title=Web><img src=/icons/api-final.webp style=width:24px;height:24px;margin-left:-4px title=API></div></div></center>
<center><p class=exclusive-text style=font-size:1.2em;margin-top:10px;font-weight:300;color:var(--text-secondary)>Cientos de clientes confían en nosotros</p></center>
<marquee behavior=scroll direction=left scrollamount=6 scrolldelay=0><div class=atlantis-box><strong>¡WITHMIA es increíble!</strong>⭐⭐⭐⭐⭐<br><span style="font-size:0.7em">WITHMIA revolucionó mi empresa.<br>Responde clientes automáticamente<br>y gestiona consultas complejas<br>las 24 horas. Increíble IA.</span><br><strong>María González</strong><img src="/images/maria-gonzalez.webp" style="width:40px;height:40px;border-radius:50%;float:right;margin-top:-25px;margin-right:5px;"> <span style="font-size:0.7em">Contadora</span></div>&nbsp;&nbsp;&nbsp;<div class=atlantis-box><strong>¡Excelente herramienta!</strong>⭐⭐⭐⭐⭐<br><span style="font-size:0.7em">WITHMIA automatiza mi negocio.<br>Gestiona clientes perfectamente<br>y optimiza todos mis procesos<br>empresariales diariamente.</span><br><strong>Luis Martínez</strong><img src="/images/luis-martinez.webp" style="width:40px;height:40px;border-radius:50%;float:right;margin-top:-25px;margin-right:5px;"> <span style="font-size:0.7em">Empresario</span></div>&nbsp;&nbsp;&nbsp;<div class=atlantis-box><strong>¡Diseño increíble!</strong>⭐⭐⭐⭐⭐<br><span style="font-size:0.7em">WITHMIA transformó mis diseños.<br>Optimiza flujos creativos<br>y mejora la comunicación<br>con clientes constantemente.</span><br><strong>Sofía Herrera</strong><img src="/images/sofia-herrera.webp" style="width:40px;height:40px;border-radius:50%;float:right;margin-top:-25px;margin-right:5px;"> <span style="font-size:0.7em">Diseñadora</span></div>&nbsp;&nbsp;&nbsp;<div class=atlantis-box><strong>¡Gestión perfecta!</strong>⭐⭐⭐⭐⭐<br><span style="font-size:0.7em">WITHMIA gestiona mis clientes.<br>Agenda citas automáticamente<br>y organiza toda mi agenda<br>de manera muy eficiente.</span><br><strong>Carlos Ruiz</strong><img src="/images/carlos-ruiz.webp" style="width:40px;height:40px;border-radius:50%;float:right;margin-top:-25px;margin-right:5px;"> <span style="font-size:0.7em">Abogado</span></div>&nbsp;&nbsp;&nbsp;<div class=atlantis-box><strong>¡RRHH automatizado!</strong>⭐⭐⭐⭐⭐<br><span style="font-size:0.7em">WITHMIA gestiona mis RRHH.<br>Envía liquidaciones automáticamente<br>y organiza procesos de personal<br>de manera muy eficiente.</span><br><strong>Ana López</strong><img src="/images/ana-lopez.webp" style="width:40px;height:40px;border-radius:50%;float:right;margin-top:-25px;margin-right:5px;"> <span style="font-size:0.7em">Consultora</span></div>&nbsp;&nbsp;&nbsp;<div class=atlantis-box><strong>¡WITHMIA es increíble!</strong>⭐⭐⭐⭐⭐<br><span style="font-size:0.7em">WITHMIA revolucionó mi empresa.<br>Responde clientes automáticamente<br>y gestiona consultas complejas<br>las 24 horas. Increíble IA.</span><br><strong>María González</strong><img src="/images/maria-gonzalez.webp" style="width:40px;height:40px;border-radius:50%;float:right;margin-top:-25px;margin-right:5px;"> <span style="font-size:0.7em">Contadora</span></div>&nbsp;&nbsp;&nbsp;<div class=atlantis-box><strong>¡Excelente herramienta!</strong>⭐⭐⭐⭐⭐<br><span style="font-size:0.7em">WITHMIA automatiza mi negocio.<br>Gestiona clientes perfectamente<br>y optimiza todos mis procesos<br>empresariales diariamente.</span><br><strong>Luis Martínez</strong><img src="/images/luis-martinez.webp" style="width:40px;height:40px;border-radius:50%;float:right;margin-top:-25px;margin-right:5px;"> <span style="font-size:0.7em">Empresario</span></div>&nbsp;&nbsp;&nbsp;<div class=atlantis-box><strong>¡Diseño increíble!</strong>⭐⭐⭐⭐⭐<br><span style="font-size:0.7em">WITHMIA transformó mis diseños.<br>Optimiza flujos creativos<br>y mejora la comunicación<br>con clientes constantemente.</span><br><strong>Sofía Herrera</strong><img src="/images/sofia-herrera.webp" style="width:40px;height:40px;border-radius:50%;float:right;margin-top:-25px;margin-right:5px;"> <span style="font-size:0.7em">Diseñadora</span></div>&nbsp;&nbsp;&nbsp;<div class=atlantis-box><strong>¡Gestión perfecta!</strong>⭐⭐⭐⭐⭐<br><span style="font-size:0.7em">WITHMIA gestiona mis clientes.<br>Agenda citas automáticamente<br>y organiza toda mi agenda<br>de manera muy eficiente.</span><br><strong>Carlos Ruiz</strong><img src="/images/carlos-ruiz.webp" style="width:40px;height:40px;border-radius:50%;float:right;margin-top:-25px;margin-right:5px;"> <span style="font-size:0.7em">Abogado</span></div>&nbsp;&nbsp;&nbsp;<div class=atlantis-box><strong>¡RRHH automatizado!</strong>⭐⭐⭐⭐⭐<br><span style="font-size:0.7em">WITHMIA gestiona mis RRHH.<br>Envía liquidaciones automáticamente<br>y organiza procesos de personal<br>de manera muy eficiente.</span><br><strong>Ana López</strong><img src="/images/ana-lopez.webp" style="width:40px;height:40px;border-radius:50%;float:right;margin-top:-25px;margin-right:5px;"> <span style="font-size:0.7em">Consultora</span></div></marquee>
        </div>
        <div class="right-panel">
        <p>Desarrollado por</p><br>
        <div class="atlantis-btn" onclick="window.open('https://atlantisproducciones.cl/', '_blank')">
            <img src="/Logo-Atlantis.webp" style="height: 22px; margin-right: 10px; vertical-align: middle;">
            <span style="font-size: 14px;">ATLANTIS PRODUCCIONES</span>
        </div>
        <video class="login-logo" autoplay loop muted playsinline>
            <source src="/logo-animated.webm" type="video/webm">
            <img src="/logo-withmia.webp?v=2025-withmia" alt="WITHMIA Logo">
        </video>
        <p class="exclusive-text" style="font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; font-weight: 350; color: var(--text-primary);">WITH YOU, WITH<strong style="font-weight: 450;">MIA</strong><sup style="font-size: 0.6em; font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; font-weight: 350;">®</sup></p><br>

        <div class="google-signin-container">
            <script>
async function handleCredentialResponse(response) {
    try {
        const responsePayload = parseJwt(response.credential);
        console.log("Procesando login de Google...");
        
        // Usar formulario POST tradicional en lugar de fetch
        // Esto garantiza que las cookies se establezcan antes del redirect
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/auth/google';
        form.style.display = 'none';

        // Get CSRF token from meta tag or cookie (no Sanctum endpoint needed)
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
        <p style="text-align: center; font-size: 0.65em; color: var(--text-muted); margin: 45px auto 0px auto; width: 100%;">Al continuar, aceptas nuestros Términos de Servicio y lee nuestra Política de Privacidad.</p><br>
        </div>
    </div>

    <script>
        // ===== THEME TOGGLE =====
        function setTheme(theme) {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            localStorage.setItem('withmia_login_theme', theme);
            updateToggleButtons(theme);
            // Update Google Sign-In button theme
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
            // Re-render Google Sign-In button with appropriate theme
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

        // Initialize theme on load (before render)
        (function() {
            var saved = localStorage.getItem('withmia_login_theme');
            // Respect OS preference if no saved preference
            if (!saved) {
                saved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            if (saved === 'dark') {
                document.documentElement.classList.add('dark');
            }
            // Update buttons after DOM is ready
            document.addEventListener('DOMContentLoaded', function() {
                updateToggleButtons(saved);
                // Also update Google button once it loads
                setTimeout(function() { updateGoogleTheme(saved); }, 1000);
            });
        })();
    </script>

    <script>
        // Si ya está autenticado, redirigir directamente sin splash
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

