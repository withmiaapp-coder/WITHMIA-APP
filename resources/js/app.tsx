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

createInertiaApp({
    title: (title) => title ? `${title} - ${appName}` : appName,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, pages),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
