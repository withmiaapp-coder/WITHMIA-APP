import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css', 
                'resources/js/app.tsx',
                'resources/js/pages/MainDashboard.tsx'
            ],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    esbuild: {
        jsx: 'automatic',
    },
    build: {
        // Minificar en producción para reducir tamaño
        minify: 'esbuild',
        // Sourcemaps solo en desarrollo
        sourcemap: false,
        // Optimizar chunks
        rollupOptions: {
            output: {
                manualChunks: {
                    // Separar vendor de la app
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-ui': ['lucide-react', '@headlessui/react'],
                    'vendor-websocket': ['pusher-js', 'laravel-echo'],
                },
            },
        },
    },
    resolve: {
        alias: {
            'ziggy-js': resolve(__dirname, 'vendor/tightenco/ziggy'),
        },
    },
});
