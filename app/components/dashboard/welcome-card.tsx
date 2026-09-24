"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/app/providers/auth-provider";

export function WelcomeCard() {
    const router = useRouter();
    const { user } = useAuth();

    function handleCreateCall() {
        router.push("/dashboard/calls/new");
    }

    function handleViewHistory() {
        router.push("/dashboard/calls");
    }

    return (
        <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-sm sm:p-9">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="absolute -bottom-32 right-20 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

            <div className="relative z-10 max-w-2xl">
                <p className="text-sm font-medium text-slate-400">
                    Your Miyor space
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                    Welcome back
                    {user?.name
                        ? `, ${user.name.split(" ")[0]}`
                        : ""}
                    .
                </h1>

                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                    Create a personal video call and invite someone
                    to join from anywhere. Your guest can join
                    without creating a Miyor account.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={handleCreateCall}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                    >
                        <span className="text-lg leading-none">
                            +
                        </span>

                        Create a call
                    </button>

                    <button
                        type="button"
                        onClick={handleViewHistory}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                        View call history
                    </button>
                </div>
            </div>
        </section>
    );
}