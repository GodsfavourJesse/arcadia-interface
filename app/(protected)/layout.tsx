import type { ReactNode } from "react";
import { ProtectedRoute } from "../components/auth/route-guards";
import { DashboardShell } from "../components/dashboard/dashboard-shell";
import { DashboardNav } from "../components/dashboard/dashboard-nav";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
    return (
        <ProtectedRoute>
            <DashboardShell>
                <DashboardNav />
                {children}
            </DashboardShell>
        </ProtectedRoute>
    );
}
