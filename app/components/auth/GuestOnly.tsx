"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/auth/useAuth";

type GuestOnlyProps = {
    children: ReactNode;
};

export function GuestOnly({
    children,
}: GuestOnlyProps) {
    const router = useRouter();

    const {
        user,
        isHydrated,
    } = useAuth();

    useEffect(() => {
        if (isHydrated && user) {
            router.replace("/dashboard");
        }
    }, [isHydrated, user, router]);

    if (!isHydrated) {
        return (
            <main className="flex min-h-screen items-center justify-center">
                <p className="text-sm text-muted-foreground">
                    Loading...
                </p>
            </main>
        );
    }

    if (user) {
        return null;
    }

    return children;
}