<!DOCTYPE html>
<html lang="es">
<script>
// Theme init: runs BEFORE any paint to prevent flash of light theme
(function(){
    var s = localStorage.getItem('withmia_login_theme');
    if (!s) s = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    if (s === 'dark') document.documentElement.classList.add('dark');
})();
</script>
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
                radial-gradient(76vw 76vw at 12% 18%, rgba(200,140,255,.12) 0%, rgba(200,140,255,.05) 50%, transparent 70%),
                radial-gradient(40vw 40vw at 8% 65%, rgba(125,77,255,.18) 0%, transparent 55%),
                radial-gradient(40vw 40vw at 85% 82%, rgba(59,195,255,.14) 0%, transparent 55%),
                radial-gradient(35vw 35vw at 85% 8%, rgba(200,140,255,.09) 0%, transparent 55%),
                radial-gradient(28vw 28vw at 72% 15%, rgba(244,226,166,.12) 0%, transparent 60%),
                radial-gradient(22vw 22vw at 28% 88%, rgba(217,178,76,.08) 0%, transparent 60%);
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
        }
        .left-panel {
            flex: 1 1 50%;
            max-width: 50%;
            background: var(--panel-bg);
            color: var(--text-primary);
            padding: 1rem 3rem 1rem 3rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .right-panel {
            flex: 1 1 50%;
            max-width: 50%;
            background: var(--panel-bg);
            padding: 1rem 3rem 1rem 3rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
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

        /* Laurel logo: invert to white in dark mode */
        html.dark .laurel-img {
            filter: brightness(0) invert(1) brightness(1.1);
        }

        /* Web icon: invert to white in dark mode */
        html.dark .web-icon-img {
            filter: brightness(0) invert(1);
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

        /* ===== ECOSYSTEM HUB v2 — Arc-inspired ===== */
        .left-panel {
            padding: 0 !important;
            overflow: hidden;
            position: relative;
            background: var(--panel-bg);
        }
        .eco-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 28px 20px 20px;
            position: relative;
            z-index: 1;
            gap: 6px;
        }
        /* Ambient background orb */
        .eco-section::before {
            content: "";
            position: absolute;
            width: 260px; height: 260px;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            background: radial-gradient(circle, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.04) 40%, transparent 70%);
            animation: orbFloat 8s ease-in-out infinite;
            pointer-events: none;
        }
        html.dark .eco-section::before {
            background: radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.06) 40%, transparent 70%);
        }
        @keyframes orbFloat {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.08); }
        }
        .eco-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.08));
            border: 1px solid rgba(139,92,246,0.15);
            border-radius: 20px;
            padding: 5px 14px;
            font-size: 0.65rem;
            font-weight: 600;
            color: #a78bfa;
            letter-spacing: 0.3px;
            backdrop-filter: blur(8px);
        }
        html.dark .eco-badge {
            background: linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.08));
            border-color: rgba(139,92,246,0.2);
        }
        .eco-title {
            font-size: 1.25rem;
            font-weight: 800;
            text-align: center;
            color: var(--text-primary);
            line-height: 1.25;
            margin: 0;
            letter-spacing: -0.4px;
        }
        .eco-gradient {
            background: linear-gradient(135deg, #f59e0b, #ea580c);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        /* ── Orbit Container ── */
        .eco-orbit {
            position: relative;
            width: 100%;
            flex: 1;
            min-height: 320px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Orbit rings (animated dashed) */
        .eco-ring {
            position: absolute;
            border-radius: 50%;
            border: 1.5px dashed rgba(139,92,246,0.22);
            animation: ringRotate 60s linear infinite;
        }
        .eco-ring.r1 { width: 130px; height: 130px; border-color: rgba(139,92,246,0.28); }
        .eco-ring.r2 { width: 240px; height: 240px; border-color: rgba(139,92,246,0.20); animation-duration: 80s; animation-direction: reverse; }
        .eco-ring.r3 { width: 350px; height: 350px; border-color: rgba(139,92,246,0.14); animation-duration: 100s; }
        html.dark .eco-ring.r1 { border-color: rgba(139,92,246,0.38); }
        html.dark .eco-ring.r2 { border-color: rgba(139,92,246,0.28); }
        html.dark .eco-ring.r3 { border-color: rgba(139,92,246,0.20); }
        @keyframes ringRotate { to { transform: rotate(360deg); } }

        /* ── Center Logo ── */
        .eco-center {
            position: relative;
            z-index: 20;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .eco-center-box {
            position: relative;
            width: 56px; height: 56px;
            border-radius: 14px;
            background: linear-gradient(145deg, #f8f8fa, #eef0f4);
            border: 1px solid rgba(0,0,0,0.06);
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 24px rgba(0,0,0,0.06);
            overflow: hidden;
        }
        html.dark .eco-center-box {
            background: linear-gradient(145deg, rgba(30,30,50,0.95), rgba(15,15,30,0.98));
            border-color: rgba(255,255,255,0.08);
            box-shadow: 0 4px 30px rgba(139,92,246,0.1);
        }
        .eco-center-box img { width: 34px; height: 34px; object-fit: contain; }
        .eco-live {
            margin-top: 6px;
            display: flex; align-items: center; gap: 4px;
            padding: 2px 10px;
            border-radius: 10px;
            background: rgba(52,211,153,0.08);
            border: 1px solid rgba(52,211,153,0.15);
        }
        html.dark .eco-live {
            background: rgba(52,211,153,0.06);
            border-color: rgba(52,211,153,0.12);
        }
        .eco-live-dot {
            width: 5px; height: 5px; border-radius: 50%;
            background: #34d399;
            animation: livePulse 2s ease-in-out infinite;
        }
        .eco-live-text {
            font-size: 7px; font-family: 'SF Mono', 'Fira Code', monospace;
            font-weight: 700; color: #34d399; letter-spacing: 0.5px;
        }
        @keyframes livePulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

        /* ── Channel Nodes (inner ring) ── */
        .eco-channel {
            position: absolute;
            display: flex; flex-direction: column; align-items: center; gap: 4px;
            z-index: 10;
            transform: translate(-50%, -50%);
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .eco-channel:hover { transform: translate(-50%, -50%) scale(1.08); }
        .eco-channel-icon {
            width: 42px; height: 42px;
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.5);
            background: rgba(255,255,255,0.85);
            box-shadow: 0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02);
            transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        html.dark .eco-channel-icon {
            background: rgba(255,255,255,0.04);
            border-color: rgba(255,255,255,0.08);
            box-shadow: 0 2px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03);
        }
        .eco-channel:hover .eco-channel-icon {
            box-shadow: 0 4px 20px rgba(139,92,246,0.15), 0 0 0 1px rgba(139,92,246,0.1);
            border-color: rgba(139,92,246,0.2);
        }
        .eco-channel-icon img { width: 22px; height: 22px; object-fit: contain; }
        .eco-channel-name {
            font-size: 9px; font-weight: 700; letter-spacing: 0.2px;
            color: var(--text-secondary);
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        .eco-channel:hover .eco-channel-name { opacity: 1; }

        /* ── Integration Nodes (outer ring) ── */
        .eco-integ {
            position: absolute;
            display: flex; align-items: center; gap: 6px;
            z-index: 10;
            transform: translate(-50%, -50%);
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s;
        }
        .eco-integ:hover { transform: translate(-50%, -50%) scale(1.06); }
        .eco-integ-icon {
            width: 30px; height: 30px;
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
            background: rgba(255,255,255,0.6);
            border: 1px solid rgba(0,0,0,0.04);
            box-shadow: 0 1px 6px rgba(0,0,0,0.04);
            transition: all 0.3s ease;
        }
        html.dark .eco-integ-icon {
            background: rgba(255,255,255,0.03);
            border-color: rgba(255,255,255,0.06);
            box-shadow: 0 1px 8px rgba(0,0,0,0.25);
        }
        .eco-integ:hover .eco-integ-icon {
            background: rgba(255,255,255,0.9);
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
        html.dark .eco-integ:hover .eco-integ-icon {
            background: rgba(255,255,255,0.06);
            box-shadow: 0 2px 12px rgba(0,0,0,0.4);
        }
        .eco-integ-icon svg { width: 14px; height: 14px; }
        .eco-integ-icon img { width: 16px; height: 16px; }
        .eco-integ-text { display: flex; flex-direction: column; }
        .eco-integ-name {
            font-size: 10px; font-weight: 700; letter-spacing: 0.2px;
            color: var(--text-muted); opacity: 0.55; line-height: 1.2;
            transition: opacity 0.2s, color 0.2s;
        }
        .eco-integ:hover .eco-integ-name { opacity: 0.85; color: var(--text-primary); }
        .eco-integ-sub {
            font-size: 7px; color: var(--text-muted); opacity: 0.3;
            white-space: nowrap; margin-top: -1px;
        }
        .eco-integ.left-node { flex-direction: row-reverse; }
        .eco-integ.left-node .eco-integ-text { text-align: right; }

        /* ── Connection lines (SVG) ── */
        .eco-lines {
            position: absolute;
            inset: 0;
            width: 100%; height: 100%;
            pointer-events: none;
            z-index: 5;
        }
        @keyframes dashFlow { to { stroke-dashoffset: -16; } }
        @keyframes particleFade { 0%,100% { fill-opacity: 0; } 30%,70% { fill-opacity: 0.5; } }
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
            <div class="eco-section">
                <h2 class="eco-title">Todas tus herramientas,<br><span class="eco-gradient">una sola plataforma</span></h2>

                <div class="eco-orbit">
                    <!-- Animated orbit rings -->
                    <div class="eco-ring r1"></div>
                    <div class="eco-ring r2"></div>
                    <div class="eco-ring r3"></div>

                    <!-- Connection lines SVG -->
                    <svg class="eco-lines" viewBox="0 0 500 400" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <linearGradient id="lg0" x1="250" y1="200" x2="250" y2="120" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#a78bfa" stop-opacity="0.5"/><stop offset="100%" stop-color="#25D366" stop-opacity="0.7"/></linearGradient>
                            <linearGradient id="lg1" x1="250" y1="200" x2="320" y2="155" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#a78bfa" stop-opacity="0.5"/><stop offset="100%" stop-color="#E1306C" stop-opacity="0.7"/></linearGradient>
                            <linearGradient id="lg2" x1="250" y1="200" x2="320" y2="245" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#a78bfa" stop-opacity="0.5"/><stop offset="100%" stop-color="#0084FF" stop-opacity="0.7"/></linearGradient>
                            <linearGradient id="lg3" x1="250" y1="200" x2="250" y2="280" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#a78bfa" stop-opacity="0.5"/><stop offset="100%" stop-color="#EA4335" stop-opacity="0.7"/></linearGradient>
                            <linearGradient id="lg4" x1="250" y1="200" x2="180" y2="245" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#a78bfa" stop-opacity="0.5"/><stop offset="100%" stop-color="#61DAFB" stop-opacity="0.7"/></linearGradient>
                            <linearGradient id="lg5" x1="250" y1="200" x2="180" y2="155" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#a78bfa" stop-opacity="0.5"/><stop offset="100%" stop-color="#34D399" stop-opacity="0.7"/></linearGradient>
                        </defs>
                        <!-- Center → channel lines -->
                        <line x1="250" y1="200" x2="250" y2="120" stroke="url(#lg0)" stroke-width="1.5" stroke-dasharray="4 5" style="animation:dashFlow 4s linear infinite"/>
                        <line x1="250" y1="200" x2="320" y2="155" stroke="url(#lg1)" stroke-width="1.5" stroke-dasharray="4 5" style="animation:dashFlow 4s linear infinite;animation-delay:.6s"/>
                        <line x1="250" y1="200" x2="320" y2="245" stroke="url(#lg2)" stroke-width="1.5" stroke-dasharray="4 5" style="animation:dashFlow 4s linear infinite;animation-delay:1.2s"/>
                        <line x1="250" y1="200" x2="250" y2="280" stroke="url(#lg3)" stroke-width="1.5" stroke-dasharray="4 5" style="animation:dashFlow 4s linear infinite;animation-delay:1.8s"/>
                        <line x1="250" y1="200" x2="180" y2="245" stroke="url(#lg4)" stroke-width="1.5" stroke-dasharray="4 5" style="animation:dashFlow 4s linear infinite;animation-delay:2.4s"/>
                        <line x1="250" y1="200" x2="180" y2="155" stroke="url(#lg5)" stroke-width="1.5" stroke-dasharray="4 5" style="animation:dashFlow 4s linear infinite;animation-delay:3s"/>
                        <!-- Animated particles -->
                        <path id="p0" d="M250 200 L250 120" stroke="none"/><path id="p1" d="M250 200 L320 155" stroke="none"/><path id="p2" d="M250 200 L320 245" stroke="none"/><path id="p3" d="M250 200 L250 280" stroke="none"/><path id="p4" d="M250 200 L180 245" stroke="none"/><path id="p5" d="M250 200 L180 155" stroke="none"/>
                        <circle r="3" fill="#25D366"><animateMotion dur="3s" repeatCount="indefinite"><mpath href="#p0"/></animateMotion><animate attributeName="fill-opacity" values="0;0.85;0.85;0" dur="3s" repeatCount="indefinite"/></circle>
                        <circle r="3" fill="#E1306C"><animateMotion dur="3.2s" repeatCount="indefinite" begin="0.8s"><mpath href="#p1"/></animateMotion><animate attributeName="fill-opacity" values="0;0.85;0.85;0" dur="3.2s" repeatCount="indefinite" begin="0.8s"/></circle>
                        <circle r="3" fill="#0084FF"><animateMotion dur="3.4s" repeatCount="indefinite" begin="1.6s"><mpath href="#p2"/></animateMotion><animate attributeName="fill-opacity" values="0;0.85;0.85;0" dur="3.4s" repeatCount="indefinite" begin="1.6s"/></circle>
                        <circle r="3" fill="#EA4335"><animateMotion dur="3.6s" repeatCount="indefinite" begin="2.4s"><mpath href="#p3"/></animateMotion><animate attributeName="fill-opacity" values="0;0.85;0.85;0" dur="3.6s" repeatCount="indefinite" begin="2.4s"/></circle>
                        <circle r="3" fill="#61DAFB"><animateMotion dur="3.8s" repeatCount="indefinite" begin="3.2s"><mpath href="#p4"/></animateMotion><animate attributeName="fill-opacity" values="0;0.85;0.85;0" dur="3.8s" repeatCount="indefinite" begin="3.2s"/></circle>
                        <circle r="3" fill="#34D399"><animateMotion dur="4s" repeatCount="indefinite" begin="4s"><mpath href="#p5"/></animateMotion><animate attributeName="fill-opacity" values="0;0.85;0.85;0" dur="4s" repeatCount="indefinite" begin="4s"/></circle>
                    </svg>

                    <!-- Center: WITHMIA logo -->
                    <div class="eco-center">
                        <div class="eco-center-box">
                            <img src="/logo-withmia.webp?v=2025-withmia" alt="WITHMIA">
                        </div>
                        <div class="eco-live">
                            <div class="eco-live-dot"></div>
                            <span class="eco-live-text">LIVE</span>
                        </div>
                    </div>

                    <!-- Channel nodes (inner ring) -->
                    <div class="eco-channel" style="top:30%;left:50%">
                        <div class="eco-channel-icon"><img src="/icons/whatsapp.webp"></div>
                        <span class="eco-channel-name">WhatsApp</span>
                    </div>
                    <div class="eco-channel" style="top:38.8%;left:64%">
                        <div class="eco-channel-icon"><img src="/icons/instagram-new.webp"></div>
                        <span class="eco-channel-name">Instagram</span>
                    </div>
                    <div class="eco-channel" style="top:61.2%;left:64%">
                        <div class="eco-channel-icon"><img src="/icons/facebook-new.webp"></div>
                        <span class="eco-channel-name">Messenger</span>
                    </div>
                    <div class="eco-channel" style="top:70%;left:50%">
                        <div class="eco-channel-icon"><img src="/icons/gmail-new.webp"></div>
                        <span class="eco-channel-name">Email</span>
                    </div>
                    <div class="eco-channel" style="top:61.2%;left:36%">
                        <div class="eco-channel-icon"><img src="/icons/web-new.webp"></div>
                        <span class="eco-channel-name">Chat Web</span>
                    </div>
                    <div class="eco-channel" style="top:38.8%;left:36%">
                        <div class="eco-channel-icon"><img src="/icons/api-final.webp"></div>
                        <span class="eco-channel-name">Cloud API</span>
                    </div>

                    <!-- Integration nodes (outer ring) -->
                    <div class="eco-integ" style="top:7%;left:66%">
                        <div class="eco-integ-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h6"/><path d="m9 14 2 2 4-4"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg></div>
                        <div class="eco-integ-text"><span class="eco-integ-name">AgendaPro</span><span class="eco-integ-sub">Citas y reservas</span></div>
                    </div>
                    <div class="eco-integ" style="top:20%;left:78%">
                        <div class="eco-integ-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#006BFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                        <div class="eco-integ-text"><span class="eco-integ-name">Calendly</span><span class="eco-integ-sub">Reuniones automáticas</span></div>
                    </div>
                    <div class="eco-integ" style="top:38%;left:86%">
                        <div class="eco-integ-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#22D3EE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg></div>
                        <div class="eco-integ-text"><span class="eco-integ-name">Dentalink</span><span class="eco-integ-sub">Clínicas dentales</span></div>
                    </div>
                    <div class="eco-integ" style="top:62%;left:86%">
                        <div class="eco-integ-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#4285F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
                        <div class="eco-integ-text"><span class="eco-integ-name">Google Calendar</span><span class="eco-integ-sub">Agenda sincronizada</span></div>
                    </div>
                    <div class="eco-integ" style="top:80%;left:78%">
                        <div class="eco-integ-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#F43F5E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg></div>
                        <div class="eco-integ-text"><span class="eco-integ-name">Medilink</span><span class="eco-integ-sub">Gestión médica</span></div>
                    </div>
                    <div class="eco-integ" style="top:93%;left:66%">
                        <div class="eco-integ-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#FFE600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg></div>
                        <div class="eco-integ-text"><span class="eco-integ-name">MercadoLibre</span><span class="eco-integ-sub">Marketplace</span></div>
                    </div>
                    <div class="eco-integ left-node" style="top:93%;left:34%">
                        <div class="eco-integ-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></div>
                        <div class="eco-integ-text"><span class="eco-integ-name">Outlook</span><span class="eco-integ-sub">Microsoft Calendar</span></div>
                    </div>
                    <div class="eco-integ left-node" style="top:80%;left:22%">
                        <div class="eco-integ-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M17 14h-6"/><path d="M13 18H7"/></svg></div>
                        <div class="eco-integ-text"><span class="eco-integ-name">Reservo</span><span class="eco-integ-sub">Reservas online</span></div>
                    </div>
                    <div class="eco-integ left-node" style="top:62%;left:14%">
                        <div class="eco-integ-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#96BF48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg></div>
                        <div class="eco-integ-text"><span class="eco-integ-name">Shopify</span><span class="eco-integ-sub">E-commerce sync</span></div>
                    </div>
                    <div class="eco-integ left-node" style="top:38%;left:14%">
                        <div class="eco-integ-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#9B5C8F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div>
                        <div class="eco-integ-text"><span class="eco-integ-name">WooCommerce</span><span class="eco-integ-sub">Tienda WordPress</span></div>
                    </div>
                    <div class="eco-integ left-node" style="top:20%;left:22%">
                        <div class="eco-integ-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 12c0 4.4-3.6 8-8 8A4.5 4.5 0 0 1 5 15.5c0-6 8-4 8-8.5a3 3 0 1 0-6 0c0 .8.3 1.4.7 2L5 12"/><path d="M17.5 12H22"/><path d="M17.5 12a5 5 0 0 0 0-8"/></svg></div>
                        <div class="eco-integ-text"><span class="eco-integ-name">API REST</span><span class="eco-integ-sub">Webhooks custom</span></div>
                    </div>
                    <div class="eco-integ left-node" style="top:7%;left:34%">
                        <div class="eco-integ-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#00758F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg></div>
                        <div class="eco-integ-text"><span class="eco-integ-name">MySQL</span><span class="eco-integ-sub">Base de datos</span></div>
                    </div>
                </div>
            </div>
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
        <p style="text-align: center; font-size: 0.65em; color: var(--text-muted); margin: 45px auto 0px auto; width: 100%;">Al continuar, aceptas nuestros <a href="https://withmia.com/terminos/" target="_blank" style="color: var(--text-secondary); text-decoration: underline;">Términos de Servicio</a> y lee nuestra <a href="https://withmia.com/privacidad/" target="_blank" style="color: var(--text-secondary); text-decoration: underline;">Política de Privacidad</a>.</p><br>
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

        // Initialize theme toggle buttons (theme class already set by head script)
        (function() {
            var saved = localStorage.getItem('withmia_login_theme');
            if (!saved) {
                saved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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

