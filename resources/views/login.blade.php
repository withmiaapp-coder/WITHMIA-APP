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

        /* ===== INTEGRATION DASHBOARD ===== */
        .intg-dash {
            position: relative;
            width: 100%;
            height: 100%;
            min-height: 520px;
            border-radius: 16px;
            overflow: hidden;
            background: linear-gradient(180deg, #060610 0%, #08081a 50%, #060610 100%);
            border: 1px solid rgba(255,255,255,0.06);
        }

        /* ── Title bar (macOS style) ── */
        .intg-titlebar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 16px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            background: rgba(255,255,255,0.015);
        }
        .intg-dots { display: flex; gap: 6px; }
        .intg-dot { width: 9px; height: 9px; border-radius: 50%; }
        .intg-dot-r { background: rgba(255,95,87,0.6); }
        .intg-dot-y { background: rgba(254,188,46,0.6); }
        .intg-dot-g { background: rgba(40,200,64,0.6); }
        .intg-titlebar-url {
            font-size: 10px;
            font-family: 'SF Mono', 'Fira Code', monospace;
            color: rgba(255,255,255,0.2);
            letter-spacing: 0.02em;
        }
        .intg-status-pill {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 3px 10px;
            border-radius: 6px;
            background: rgba(52,211,153,0.06);
            border: 1px solid rgba(52,211,153,0.1);
        }
        .intg-status-dot {
            width: 5px; height: 5px;
            border-radius: 50%;
            background: rgba(52,211,153,0.8);
            animation: intg-pulse 2s ease-in-out infinite;
        }
        .intg-status-text {
            font-size: 8px;
            font-family: monospace;
            color: rgba(52,211,153,0.6);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }
        @keyframes intg-pulse {
            0%, 100% { opacity: 0.6; box-shadow: 0 0 0 0 rgba(52,211,153,0.3); }
            50% { opacity: 1; box-shadow: 0 0 8px 3px rgba(52,211,153,0.2); }
        }

        /* ── Node map area ── */
        .intg-map {
            position: relative;
            width: 100%;
            aspect-ratio: 1 / 1;
            max-height: 360px;
        }

        .intg-dot-grid {
            position: absolute; inset: 0;
            background-image: radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px);
            background-size: 24px 24px;
            animation: intg-grid-fade 8s ease-in-out infinite alternate;
        }
        @keyframes intg-grid-fade {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.65; }
        }

        /* Ambient glows */
        .intg-glow {
            position: absolute; border-radius: 50%; pointer-events: none; filter: blur(60px);
        }
        .intg-glow-v {
            width: 200px; height: 200px;
            top: 30%; left: 20%;
            background: rgba(139,92,246,0.06);
            animation: intg-glow-move 14s ease-in-out infinite alternate;
        }
        .intg-glow-a {
            width: 150px; height: 150px;
            bottom: 20%; right: 15%;
            background: rgba(245,158,11,0.04);
            animation: intg-glow-move 18s ease-in-out infinite alternate-reverse;
        }
        @keyframes intg-glow-move {
            0% { transform: scale(1) translate(0, 0); }
            50% { transform: scale(1.2) translate(10px, -8px); }
            100% { transform: scale(0.9) translate(-8px, 6px); }
        }

        /* SVG overlay */
        .intg-svg {
            position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;
        }
        .intg-ring { transform-origin: center; }
        .intg-ring-cw { animation: intg-spin 45s linear infinite; }
        .intg-ring-ccw { animation: intg-spin 55s linear infinite reverse; }
        @keyframes intg-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .intg-flow {
            animation: intg-dash 2s linear infinite;
        }
        @keyframes intg-dash {
            from { stroke-dashoffset: 20; }
            to { stroke-dashoffset: 0; }
        }

        /* Center hub */
        .intg-hub {
            position: absolute;
            left: 50%; top: 50%;
            transform: translate(-50%, -50%);
            z-index: 20;
        }
        .intg-hub-ring-outer {
            position: absolute; border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.015);
        }
        .intg-hub-ring-1 { inset: -55px; animation: intg-spin 40s linear infinite; }
        .intg-hub-ring-2 { inset: -40px; border-color: rgba(139,92,246,0.04); animation: intg-spin 50s linear infinite reverse; }
        .intg-hub-ring-3 { inset: -25px; border-color: rgba(139,92,246,0.06); }

        .intg-hub-pulse {
            position: absolute; border-radius: 50%;
            border: 1px solid rgba(139,92,246,0.08);
            animation: intg-expand 3.5s ease-out infinite;
        }
        .intg-hub-p1 { inset: -28px; }
        .intg-hub-p2 { inset: -48px; animation-delay: 1.5s; border-color: rgba(139,92,246,0.04); }
        @keyframes intg-expand {
            0% { transform: scale(0.85); opacity: 0.5; }
            70% { opacity: 0.12; }
            100% { transform: scale(1.5); opacity: 0; }
        }

        .intg-hub-glow {
            position: absolute; inset: -16px;
            border-radius: 18px;
            background: linear-gradient(135deg, rgba(139,92,246,0.14), rgba(245,158,11,0.07));
            filter: blur(18px);
            animation: intg-breathe 4s ease-in-out infinite;
        }
        @keyframes intg-breathe {
            0%, 100% { opacity: 0.35; transform: scale(1); }
            50% { opacity: 0.65; transform: scale(1.12); }
        }

        .intg-hub-box {
            position: relative;
            width: 56px; height: 56px;
            border-radius: 16px;
            background: linear-gradient(135deg, rgba(139,92,246,0.22), #0a0a18, rgba(245,158,11,0.16));
            border: 1px solid rgba(255,255,255,0.1);
            display: flex; align-items: center; justify-content: center;
            overflow: hidden;
        }
        .intg-hub-label {
            position: absolute;
            bottom: -24px; left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            display: flex; flex-direction: column; align-items: center; gap: 2px;
        }
        .intg-hub-name {
            font-size: 8px; font-weight: 700;
            color: rgba(167,139,250,0.45);
            letter-spacing: 0.15em; text-transform: uppercase;
        }
        .intg-hub-live {
            display: flex; align-items: center; gap: 3px;
        }
        .intg-hub-live-dot {
            width: 4px; height: 4px; border-radius: 50%;
            background: rgba(52,211,153,0.7);
            animation: intg-pulse 2s ease-in-out infinite;
        }
        .intg-hub-live-text {
            font-size: 7px; font-family: monospace;
            color: rgba(52,211,153,0.35);
        }

        /* ── Integration nodes ── */
        .intg-node {
            position: absolute; z-index: 10;
            transform: translate(-50%, -50%);
            display: flex; flex-direction: column; align-items: center; gap: 3px;
            animation: intg-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes intg-pop {
            from { opacity: 0; transform: translate(-50%,-50%) scale(0.5); }
            to { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        .intg-node-box {
            width: 38px; height: 38px;
            border-radius: 11px;
            display: flex; align-items: center; justify-content: center;
            border: 1px solid; position: relative;
            transition: all 0.3s ease;
        }
        .intg-node-box:hover {
            transform: scale(1.15) translateY(-3px);
        }
        .intg-node-box img {
            width: 18px; height: 18px; object-fit: contain;
        }
        .intg-node-active {
            position: absolute; top: -1px; right: -1px;
            width: 7px; height: 7px; border-radius: 50%;
            border: 1.5px solid #060610;
        }
        .intg-node-name {
            font-size: 8px; font-weight: 700;
            color: rgba(255,255,255,0.22);
            white-space: nowrap; letter-spacing: 0.03em;
        }

        /* ── Live feed ── */
        .intg-feed {
            border-top: 1px solid rgba(255,255,255,0.06);
            background: rgba(255,255,255,0.01);
        }
        .intg-feed-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 8px 14px;
            border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .intg-feed-title {
            display: flex; align-items: center; gap: 6px;
        }
        .intg-feed-dot {
            width: 5px; height: 5px; border-radius: 50%;
            background: rgba(245,158,11,0.6);
            animation: intg-pulse 2s ease-in-out infinite;
        }
        .intg-feed-label {
            font-size: 9px; font-weight: 600;
            color: rgba(255,255,255,0.3);
            text-transform: uppercase; letter-spacing: 0.1em;
        }
        .intg-feed-badge {
            display: flex; align-items: center; gap: 4px;
            padding: 2px 8px; border-radius: 4px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.04);
        }
        .intg-feed-badge-dot {
            width: 4px; height: 4px; border-radius: 50%;
            background: rgba(52,211,153,0.6);
            animation: intg-pulse 2s ease-in-out infinite;
        }
        .intg-feed-badge-text {
            font-size: 7px; font-family: monospace;
            color: rgba(255,255,255,0.18);
        }

        .intg-event {
            display: flex; align-items: center; gap: 10px;
            padding: 7px 14px;
            border-bottom: 1px solid rgba(255,255,255,0.02);
            transition: background 0.3s;
            animation: intg-event-in 0.5s ease-out both;
        }
        .intg-event:hover {
            background: rgba(255,255,255,0.015);
        }
        @keyframes intg-event-in {
            from { opacity: 0; transform: translateX(10px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .intg-event-icon {
            width: 24px; height: 24px;
            border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .intg-event-icon svg {
            width: 12px; height: 12px;
        }
        .intg-event-body { flex: 1; min-width: 0; }
        .intg-event-action {
            font-size: 10px; font-weight: 600;
            color: rgba(255,255,255,0.5);
            line-height: 1.3;
        }
        .intg-event-new {
            display: inline-block;
            margin-left: 6px;
            font-size: 7px; font-weight: 700;
            color: rgba(245,158,11,0.6);
            background: rgba(245,158,11,0.08);
            padding: 1px 5px; border-radius: 3px;
            text-transform: uppercase; letter-spacing: 0.08em;
            vertical-align: middle;
        }
        .intg-event-meta {
            font-size: 8px; color: rgba(255,255,255,0.18);
            line-height: 1.3;
        }
        .intg-event-meta span { color: rgba(255,255,255,0.25); }
        .intg-event-time {
            font-size: 8px; font-family: monospace;
            color: rgba(255,255,255,0.12);
            flex-shrink: 0;
        }

        /* ── Footer bar ── */
        .intg-footer {
            display: flex; align-items: center; justify-content: space-between;
            padding: 7px 14px;
            border-top: 1px solid rgba(255,255,255,0.05);
            background: rgba(255,255,255,0.012);
        }
        .intg-footer-cats {
            display: flex; align-items: center; gap: 10px;
        }
        .intg-footer-cat {
            display: flex; align-items: center; gap: 4px;
        }
        .intg-footer-cat-dot {
            width: 6px; height: 6px; border-radius: 2px;
        }
        .intg-footer-cat-name {
            font-size: 8px; color: rgba(255,255,255,0.2); font-weight: 500;
        }
        .intg-footer-cat-count {
            font-size: 7px; font-family: monospace;
            color: rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.03);
            padding: 1px 5px; border-radius: 3px;
        }
        .intg-footer-meta {
            font-size: 7px; font-family: monospace;
            color: rgba(255,255,255,0.1);
        }

        @media (max-width: 768px) {
            .intg-map { max-height: 280px; }
            .intg-node-name { display: none; }
            .intg-footer-cat-name { display: none; }
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
            <div class="intg-dash">
                <!-- ── Title bar ── -->
                <div class="intg-titlebar">
                    <div style="display:flex;align-items:center;gap:10px">
                        <div class="intg-dots">
                            <div class="intg-dot intg-dot-r"></div>
                            <div class="intg-dot intg-dot-y"></div>
                            <div class="intg-dot intg-dot-g"></div>
                        </div>
                        <div style="width:1px;height:12px;background:rgba(255,255,255,0.06)"></div>
                        <span class="intg-titlebar-url">withmia.integrations</span>
                    </div>
                    <div class="intg-status-pill">
                        <div class="intg-status-dot"></div>
                        <span class="intg-status-text">En línea</span>
                    </div>
                </div>

                <!-- ── Node map ── -->
                <div class="intg-map">
                    <div class="intg-dot-grid"></div>
                    <div class="intg-glow intg-glow-v"></div>
                    <div class="intg-glow intg-glow-a"></div>

                    <!-- SVG connections + particles -->
                    <svg class="intg-svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <filter id="pg"><feGaussianBlur stdDeviation="2"/></filter>
                        </defs>
                        <!-- Orbit rings -->
                        <circle cx="200" cy="200" r="72" fill="none" stroke="white" stroke-width="0.3" stroke-opacity="0.025" stroke-dasharray="2 8" class="intg-ring intg-ring-cw"/>
                        <circle cx="200" cy="200" r="115" fill="none" stroke="white" stroke-width="0.3" stroke-opacity="0.018" stroke-dasharray="3 10" class="intg-ring intg-ring-ccw"/>
                        <circle cx="200" cy="200" r="155" fill="none" stroke="white" stroke-width="0.3" stroke-opacity="0.012" stroke-dasharray="2 12" class="intg-ring intg-ring-cw"/>

                        <!-- WhatsApp connection -->
                        <line x1="200" y1="200" x2="200" y2="56" stroke="#25D366" stroke-width="0.5" stroke-opacity="0.06"/>
                        <line x1="200" y1="200" x2="200" y2="56" stroke="#25D366" stroke-width="1" stroke-opacity="0.35" stroke-dasharray="4 6" class="intg-flow" style="animation-delay:0s"/>
                        <path id="cp0" d="M200,200 L200,56" fill="none"/>
                        <circle r="2" fill="#25D366" filter="url(#pg)"><animateMotion dur="2s" repeatCount="indefinite"><mpath href="#cp0"/></animateMotion><animate attributeName="fill-opacity" values="0;0.8;0.8;0" dur="2s" repeatCount="indefinite"/><animate attributeName="r" values="1;2.5;2.5;1" dur="2s" repeatCount="indefinite"/></circle>

                        <!-- Instagram connection -->
                        <line x1="200" y1="200" x2="325" y2="128" stroke="#E1306C" stroke-width="0.5" stroke-opacity="0.06"/>
                        <line x1="200" y1="200" x2="325" y2="128" stroke="#E1306C" stroke-width="1" stroke-opacity="0.35" stroke-dasharray="4 6" class="intg-flow" style="animation-delay:0.4s"/>
                        <path id="cp1" d="M200,200 L325,128" fill="none"/>
                        <circle r="2" fill="#E1306C" filter="url(#pg)"><animateMotion dur="2.5s" repeatCount="indefinite" begin="0.3s"><mpath href="#cp1"/></animateMotion><animate attributeName="fill-opacity" values="0;0.8;0.8;0" dur="2.5s" repeatCount="indefinite" begin="0.3s"/><animate attributeName="r" values="1;2.5;2.5;1" dur="2.5s" repeatCount="indefinite" begin="0.3s"/></circle>

                        <!-- Messenger connection -->
                        <line x1="200" y1="200" x2="344" y2="272" stroke="#0084FF" stroke-width="0.5" stroke-opacity="0.06"/>
                        <line x1="200" y1="200" x2="344" y2="272" stroke="#0084FF" stroke-width="1" stroke-opacity="0.35" stroke-dasharray="4 6" class="intg-flow" style="animation-delay:0.8s"/>
                        <path id="cp2" d="M200,200 L344,272" fill="none"/>
                        <circle r="2" fill="#0084FF" filter="url(#pg)"><animateMotion dur="2s" repeatCount="indefinite" begin="0.6s"><mpath href="#cp2"/></animateMotion><animate attributeName="fill-opacity" values="0;0.8;0.8;0" dur="2s" repeatCount="indefinite" begin="0.6s"/><animate attributeName="r" values="1;2.5;2.5;1" dur="2s" repeatCount="indefinite" begin="0.6s"/></circle>

                        <!-- Email connection -->
                        <line x1="200" y1="200" x2="200" y2="344" stroke="#EA4335" stroke-width="0.5" stroke-opacity="0.06"/>
                        <line x1="200" y1="200" x2="200" y2="344" stroke="#EA4335" stroke-width="1" stroke-opacity="0.35" stroke-dasharray="4 6" class="intg-flow" style="animation-delay:1.2s"/>
                        <path id="cp3" d="M200,200 L200,344" fill="none"/>
                        <circle r="2" fill="#EA4335" filter="url(#pg)"><animateMotion dur="2.5s" repeatCount="indefinite" begin="1s"><mpath href="#cp3"/></animateMotion><animate attributeName="fill-opacity" values="0;0.8;0.8;0" dur="2.5s" repeatCount="indefinite" begin="1s"/><animate attributeName="r" values="1;2.5;2.5;1" dur="2.5s" repeatCount="indefinite" begin="1s"/></circle>

                        <!-- Chat Web connection -->
                        <line x1="200" y1="200" x2="75" y2="272" stroke="#61DAFB" stroke-width="0.5" stroke-opacity="0.06"/>
                        <line x1="200" y1="200" x2="75" y2="272" stroke="#61DAFB" stroke-width="1" stroke-opacity="0.35" stroke-dasharray="4 6" class="intg-flow" style="animation-delay:1.6s"/>
                        <path id="cp4" d="M200,200 L75,272" fill="none"/>
                        <circle r="2" fill="#61DAFB" filter="url(#pg)"><animateMotion dur="2s" repeatCount="indefinite" begin="1.3s"><mpath href="#cp4"/></animateMotion><animate attributeName="fill-opacity" values="0;0.8;0.8;0" dur="2s" repeatCount="indefinite" begin="1.3s"/><animate attributeName="r" values="1;2.5;2.5;1" dur="2s" repeatCount="indefinite" begin="1.3s"/></circle>

                        <!-- Cloud API connection -->
                        <line x1="200" y1="200" x2="75" y2="128" stroke="#34D399" stroke-width="0.5" stroke-opacity="0.06"/>
                        <line x1="200" y1="200" x2="75" y2="128" stroke="#34D399" stroke-width="1" stroke-opacity="0.35" stroke-dasharray="4 6" class="intg-flow" style="animation-delay:2s"/>
                        <path id="cp5" d="M200,200 L75,128" fill="none"/>
                        <circle r="2" fill="#34D399" filter="url(#pg)"><animateMotion dur="2.5s" repeatCount="indefinite" begin="1.7s"><mpath href="#cp5"/></animateMotion><animate attributeName="fill-opacity" values="0;0.8;0.8;0" dur="2.5s" repeatCount="indefinite" begin="1.7s"/><animate attributeName="r" values="1;2.5;2.5;1" dur="2.5s" repeatCount="indefinite" begin="1.7s"/></circle>
                    </svg>

                    <!-- Center Hub -->
                    <div class="intg-hub">
                        <div class="intg-hub-ring-outer intg-hub-ring-1"></div>
                        <div class="intg-hub-ring-outer intg-hub-ring-2"></div>
                        <div class="intg-hub-ring-outer intg-hub-ring-3"></div>
                        <div class="intg-hub-pulse intg-hub-p1"></div>
                        <div class="intg-hub-pulse intg-hub-p2"></div>
                        <div class="intg-hub-glow"></div>
                        <div class="intg-hub-box">
                            <video autoplay loop muted playsinline style="width:34px;height:34px;object-fit:contain;pointer-events:none">
                                <source src="/logo-animated.webm" type="video/webm">
                            </video>
                        </div>
                        <div class="intg-hub-label">
                            <span class="intg-hub-name">WITHMIA</span>
                            <div class="intg-hub-live"><span class="intg-hub-live-dot"></span><span class="intg-hub-live-text">LIVE</span></div>
                        </div>
                    </div>

                    <!-- 6 Channel nodes (positioned at 60° intervals, radius 36%) -->
                    <!-- WhatsApp: 0° (top) -->
                    <div class="intg-node" style="left:50%;top:14%;animation-delay:0.1s">
                        <div class="intg-node-box" style="background:rgba(37,211,102,0.08);border-color:rgba(37,211,102,0.2);box-shadow:0 0 16px rgba(37,211,102,0.06)">
                            <img src="/icons/whatsapp.webp">
                            <div class="intg-node-active" style="background:rgba(37,211,102,0.9)"></div>
                        </div>
                        <span class="intg-node-name">WhatsApp</span>
                    </div>
                    <!-- Instagram: 60° -->
                    <div class="intg-node" style="left:81%;top:32%;animation-delay:0.16s">
                        <div class="intg-node-box" style="background:rgba(225,48,108,0.08);border-color:rgba(225,48,108,0.2);box-shadow:0 0 16px rgba(225,48,108,0.06)">
                            <img src="/icons/instagram-new.webp">
                            <div class="intg-node-active" style="background:rgba(225,48,108,0.9)"></div>
                        </div>
                        <span class="intg-node-name">Instagram</span>
                    </div>
                    <!-- Messenger: 120° -->
                    <div class="intg-node" style="left:81%;top:68%;animation-delay:0.22s">
                        <div class="intg-node-box" style="background:rgba(0,132,255,0.08);border-color:rgba(0,132,255,0.2);box-shadow:0 0 16px rgba(0,132,255,0.06)">
                            <img src="/icons/facebook-new.webp">
                            <div class="intg-node-active" style="background:rgba(0,132,255,0.9)"></div>
                        </div>
                        <span class="intg-node-name">Messenger</span>
                    </div>
                    <!-- Email: 180° (bottom) -->
                    <div class="intg-node" style="left:50%;top:86%;animation-delay:0.28s">
                        <div class="intg-node-box" style="background:rgba(234,67,53,0.08);border-color:rgba(234,67,53,0.2);box-shadow:0 0 16px rgba(234,67,53,0.06)">
                            <img src="/icons/gmail-new.webp">
                            <div class="intg-node-active" style="background:rgba(234,67,53,0.9)"></div>
                        </div>
                        <span class="intg-node-name">Email</span>
                    </div>
                    <!-- Chat Web: 240° -->
                    <div class="intg-node" style="left:19%;top:68%;animation-delay:0.34s">
                        <div class="intg-node-box" style="background:rgba(97,218,251,0.08);border-color:rgba(97,218,251,0.2);box-shadow:0 0 16px rgba(97,218,251,0.06)">
                            <img src="/icons/web-new.webp" style="filter:brightness(0) invert(1)">
                            <div class="intg-node-active" style="background:rgba(97,218,251,0.9)"></div>
                        </div>
                        <span class="intg-node-name">Chat Web</span>
                    </div>
                    <!-- Cloud API: 300° -->
                    <div class="intg-node" style="left:19%;top:32%;animation-delay:0.4s">
                        <div class="intg-node-box" style="background:rgba(52,211,153,0.08);border-color:rgba(52,211,153,0.2);box-shadow:0 0 16px rgba(52,211,153,0.06)">
                            <img src="/icons/api-final.webp">
                            <div class="intg-node-active" style="background:rgba(52,211,153,0.9)"></div>
                        </div>
                        <span class="intg-node-name">Cloud API</span>
                    </div>
                </div>

                <!-- ── Live feed ── -->
                <div class="intg-feed">
                    <div class="intg-feed-header">
                        <div class="intg-feed-title">
                            <div class="intg-feed-dot"></div>
                            <span class="intg-feed-label">Actividad en tiempo real</span>
                        </div>
                        <div class="intg-feed-badge">
                            <div class="intg-feed-badge-dot"></div>
                            <span class="intg-feed-badge-text">stream</span>
                        </div>
                    </div>
                    <div class="intg-event" style="animation-delay:0s">
                        <div class="intg-event-icon" style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.12)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
                        </div>
                        <div class="intg-event-body">
                            <div class="intg-event-action">Cita confirmada<span class="intg-event-new">Nuevo</span></div>
                            <div class="intg-event-meta"><span>AgendaPro</span> → <span>WhatsApp</span></div>
                        </div>
                        <span class="intg-event-time">ahora</span>
                    </div>
                    <div class="intg-event" style="animation-delay:0.12s">
                        <div class="intg-event-icon" style="background:rgba(150,191,72,0.08);border:1px solid rgba(150,191,72,0.12)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#96BF48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
                        </div>
                        <div class="intg-event-body">
                            <div class="intg-event-action">Pedido #4821</div>
                            <div class="intg-event-meta"><span>Shopify</span> → <span>Email</span></div>
                        </div>
                        <span class="intg-event-time">12s</span>
                    </div>
                    <div class="intg-event" style="animation-delay:0.24s">
                        <div class="intg-event-icon" style="background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.12)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#22D3EE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        </div>
                        <div class="intg-event-body">
                            <div class="intg-event-action">Paciente agendado</div>
                            <div class="intg-event-meta"><span>Dentalink</span> → <span>WhatsApp</span></div>
                        </div>
                        <span class="intg-event-time">34s</span>
                    </div>
                    <div class="intg-event" style="animation-delay:0.36s">
                        <div class="intg-event-icon" style="background:rgba(255,230,0,0.08);border:1px solid rgba(255,230,0,0.12)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#FFE600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
                        </div>
                        <div class="intg-event-body">
                            <div class="intg-event-action">Pregunta respondida</div>
                            <div class="intg-event-meta"><span>MercadoLibre</span> → <span>IA Bot</span></div>
                        </div>
                        <span class="intg-event-time">1m</span>
                    </div>
                </div>

                <!-- ── Footer ── -->
                <div class="intg-footer">
                    <div class="intg-footer-cats">
                        <div class="intg-footer-cat">
                            <div class="intg-footer-cat-dot" style="background:rgba(59,130,246,0.7)"></div>
                            <span class="intg-footer-cat-name">Productividad</span>
                            <span class="intg-footer-cat-count">5</span>
                        </div>
                        <div class="intg-footer-cat">
                            <div class="intg-footer-cat-dot" style="background:rgba(34,211,238,0.7)"></div>
                            <span class="intg-footer-cat-name">Salud</span>
                            <span class="intg-footer-cat-count">2</span>
                        </div>
                        <div class="intg-footer-cat">
                            <div class="intg-footer-cat-dot" style="background:rgba(245,158,11,0.7)"></div>
                            <span class="intg-footer-cat-name">E-commerce</span>
                            <span class="intg-footer-cat-count">3</span>
                        </div>
                        <div class="intg-footer-cat">
                            <div class="intg-footer-cat-dot" style="background:rgba(16,185,129,0.7)"></div>
                            <span class="intg-footer-cat-name">Dev</span>
                            <span class="intg-footer-cat-count">2</span>
                        </div>
                    </div>
                    <span class="intg-footer-meta">uptime: 99.98% · v2.4.1</span>
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

