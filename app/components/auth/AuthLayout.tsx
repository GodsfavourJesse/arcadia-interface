import type { ReactNode } from "react";
import { AuthShell } from "./auth-shell";

type AuthLayoutProps = {
    children: ReactNode;
    title: string;
    subtitle?: string;
};

/**
 * Kept for existing imports. Both AuthLayout and AuthShell now render the
 * same layout; AuthShell additionally accepts an optional footer link.
 */
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return (
        <AuthShell title={title} subtitle={subtitle}>
            {children}
        </AuthShell>
    );
}