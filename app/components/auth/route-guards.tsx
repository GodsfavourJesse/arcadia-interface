"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";

function AuthLoadingScreen() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                    M
                </div>
                <div className="mt-4 h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950" />
                <p className="mt-3 text-sm text-slate-400">Loading Miyor...</p>
            </div>
        </main>
    );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (loading) {
            return;
        }

        if (!user) {
            const next = encodeURIComponent(pathname || "/dashboard");
            router.replace(`/auth/login?next=${next}`);
            return;
        }

        if (!user.emailVerifiedAt) {
            const email = encodeURIComponent(user.email);
            const next = encodeURIComponent(pathname || "/dashboard");
            router.replace(`/auth/verify-email?email=${email}&next=${next}`);
        }
    }, [loading, pathname, router, user]);

    if (loading || !user || !user.emailVerifiedAt) {
        return <AuthLoadingScreen />;
    }

    return <>{children}</>;
}

export function GuestOnlyRoute({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && user) {
            router.replace("/dashboard");
        }
    }, [loading, router, user]);

    if (loading || user) {
        return <AuthLoadingScreen />;
    }

    return <>{children}</>;
}
