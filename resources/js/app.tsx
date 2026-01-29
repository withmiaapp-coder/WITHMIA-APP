import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import axios from 'axios';

// Inicializar Laravel Echo para WebSocket en tiempo real
// DESHABILITADO: No hay servidor WebSocket en Railway por ahora
// import './echo-config';

const appName = import.meta.env.VITE_APP_NAME || 'WITHMIA';

// Pre-load del glob para asegurar que todas las páginas se incluyan en el manifest
const pages = import.meta.glob('./pages/**/*.tsx');

// Railway Edge Auth Token Handler
// Railway Edge stripea los Set-Cookie headers, así que usamos tokens en localStorage
const RAILWAY_TOKEN_KEY = 'railway_auth_token';

function saveRailwayToken(token: string | null) {
    if (token) {
        localStorage.setItem(RAILWAY_TOKEN_KEY, token);
        console.log('[Railway Auth] Token saved to localStorage');
    }
}

function getRailwayToken(): string | null {
    return localStorage.getItem(RAILWAY_TOKEN_KEY);
}

// Configurar axios para enviar credenciales y token de Railway
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Interceptor de axios para agregar el token de Railway
axios.interceptors.request.use((config) => {
    const token = getRailwayToken();
    if (token) {
        config.headers['X-Railway-Auth-Token'] = token;
    }
    // Agregar CSRF token si existe
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
        config.headers['X-CSRF-TOKEN'] = csrfToken;
    }
    return config;
});

// Verificar si la URL es del mismo origen (para no agregar token a APIs externas)
function isSameOrigin(input: RequestInfo | URL): boolean {
    try {
        const url = typeof input === 'string' ? new URL(input, window.location.origin) : 
                    input instanceof URL ? input : 
                    new URL(input.url, window.location.origin);
        return url.origin === window.location.origin;
    } catch {
        // Si es una URL relativa, es del mismo origen
        return true;
    }
}

// Interceptar fetch para agregar el token SOLO a peticiones del mismo dominio
const originalFetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = getRailwayToken();
    // Solo agregar token a peticiones del mismo origen (no a Google, etc.)
    if (token && isSameOrigin(input)) {
        init = init || {};
        init.headers = init.headers || {};
        if (init.headers instanceof Headers) {
            if (!init.headers.has('X-Railway-Auth-Token')) {
                init.headers.set('X-Railway-Auth-Token', token);
            }
        } else if (Array.isArray(init.headers)) {
            init.headers.push(['X-Railway-Auth-Token', token]);
        } else {
            (init.headers as Record<string, string>)['X-Railway-Auth-Token'] = token;
        }
    }
    return originalFetch.call(this, input, init);
};

createInertiaApp({
    title: (title) => title ? `${title} - ${appName}` : appName,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, pages),
    setup({ el, App, props }) {
        const root = createRoot(el);
        
        // Guardar el token de Railway si viene en los props iniciales
        const pageProps = props.initialPage?.props as any;
        if (pageProps?.railwayAuthToken) {
            saveRailwayToken(pageProps.railwayAuthToken);
        }

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
