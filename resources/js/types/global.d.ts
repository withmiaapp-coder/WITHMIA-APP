import type { route as routeFn } from 'ziggy-js';
import type { Team } from './chatwoot';

declare global {
    const route: typeof routeFn;

    interface Window {
        __prefetchedTeams?: Team[];
        __prefetchedAgents?: Array<{
            id: number;
            name: string;
            email: string;
            role?: string;
            avatar_url?: string;
            availability_status?: string;
        }>;
    }
}
