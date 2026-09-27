"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/auth/useAuth";
import { ProfileSettingsForm } from "@/app/components/auth/ProfileSettingsForm";

export default function SettingsPage() {
    const router = useRouter();

    const {
        user,
        isHydrated,
        isLoading,
    } = useAuth();

    useEffect(() => {
        if (isHydrated && !user) {
            router.replace("/login");
        }
    }, [isHydrated, user, router]);

    if (!isHydrated || isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center">
                <p className="text-sm text-muted-foreground">
                    Loading your account...
                </p>
            </main>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <main className="min-h-screen">
            <div className="mx-auto w-full max-w-2xl px-6 py-8">
                <div className="mb-8">
                    <button
                        type="button"
                        onClick={() =>
                            router.push("/dashboard")
                        }
                        className="text-sm font-medium underline"
                    >
                        ← Back to dashboard
                    </button>

                    <h1 className="mt-6 text-3xl font-semibold">
                        Profile settings
                    </h1>

                    <p className="mt-2 text-sm text-muted-foreground">
                        Manage the information shown on your
                        Miyor profile.
                    </p>
                </div>

                <ProfileSettingsForm />
            </div>
        </main>
    );
}