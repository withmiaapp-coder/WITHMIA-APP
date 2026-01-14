import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';
import { usePage } from '@inertiajs/react';
import { GlobalNotificationProvider } from '@/contexts/GlobalNotificationContext';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => {
    const { component, props: pageProps } = usePage<any>();

    // Obtener inbox_id del usuario autenticado
    const user = pageProps?.auth?.user;
    const inboxId = user?.chatwoot_inbox_id || null;

    // Si es MainDashboard (antes llamado Dashboard), renderizar sin layout de sidebar pero CON notificaciones
    if (component === 'MainDashboard') {
        return (
            <GlobalNotificationProvider inboxId={inboxId}>
                {children}
            </GlobalNotificationProvider>
        );
    }

    // Para todas las demás páginas, usar el layout con sidebar y notificaciones
    return (
        <GlobalNotificationProvider inboxId={inboxId}>
            <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
                {children}
            </AppLayoutTemplate>
        </GlobalNotificationProvider>
    );
};
