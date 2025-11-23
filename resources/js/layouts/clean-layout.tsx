import { type ReactNode } from 'react';

interface CleanLayoutProps {
    children: ReactNode;
}

export default function CleanLayout({ children }: CleanLayoutProps) {
    return (
        <div className="min-h-screen">
            {children}
        </div>
    );
}