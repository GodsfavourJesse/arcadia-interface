import type { ReactNode } from "react";

type DashboardShellProps = {
    children: ReactNode;
};

export function DashboardShell({
    children,
}: DashboardShellProps) {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-950">
            {children}
        </div>
    );
}