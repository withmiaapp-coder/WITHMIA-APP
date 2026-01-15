import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';

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

// Interceptar fetch para agregar el token a todas las peticiones
const originalFetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = getRailwayToken();
    if (token) {
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
