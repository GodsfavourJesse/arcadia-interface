"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/hooks/auth/useAuth";
import { ProfileSettingsForm } from "@/app/components/auth/ProfileSettingsForm";
import { PushNotificationSettings } from "@/app/components/pwa/push-notification-settings";
import { useTheme } from "@/app/providers/theme-provider";
import { toast } from "sonner";

export default function SettingsPage() {
    const router = useRouter();

    const {
        user,
        isHydrated,
        isLoading,
    } = useAuth();
    const { theme, setTheme } = useTheme();

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
                        Settings
                    </h1>

                    <p className="mt-2 text-sm text-muted-foreground">
                        Personalize your workspace, manage your profile and choose how Miyor reaches you.
                    </p>
                </div>

                <div className="space-y-5">
                    <section className="rounded-2xl border border-[var(--miyor-border)] bg-white p-5 shadow-sm">
                        <div className="mb-4"><h2 className="font-semibold text-slate-900">Appearance</h2><p className="mt-1 text-sm text-slate-500">Choose the look that feels right on every device.</p></div>
                        <div className="grid grid-cols-2 gap-3">
                            {(["light", "dark"] as const).map((option) => <button key={option} type="button" aria-pressed={theme === option} onClick={() => { setTheme(option); toast.success(`${option === "dark" ? "Dark" : "Light"} appearance enabled`); }} className={`flex items-center gap-3 rounded-xl border p-4 text-left capitalize transition ${theme === option ? "border-[#0971ED] bg-blue-50 text-[#0971ED] ring-2 ring-blue-100" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${option === "dark" ? "bg-slate-900 text-white" : "bg-amber-50 text-amber-600"}`}>{option === "dark" ? "◐" : "☼"}</span><span><strong className="block text-sm">{option}</strong><small className="text-xs opacity-70">{option === "dark" ? "Low-light workspace" : "Bright and clear"}</small></span></button>)}
                        </div>
                    </section>
                    <ProfileSettingsForm />
                    <PushNotificationSettings />
                    <section className="rounded-2xl border border-[var(--miyor-border)] bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Trust and policies</h2><p className="mt-1 text-sm text-slate-500">Read how Miyor protects your account and sets expectations for using the service.</p><div className="mt-4 flex flex-wrap gap-2">{[["Terms of use", "/terms"], ["Privacy policy", "/privacy"], ["Services", "/services"]].map(([label, href]) => <Link key={href} href={href} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-[#0971ED] hover:text-[#0971ED]">{label}</Link>)}</div></section>
                </div>
            </div>
        </main>
    );
}
