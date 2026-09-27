"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "../hooks/auth/useAuth";
import { UserProfileCard } from "../components/dashboard/userProfileCard";

export default function DashboardPage() {
    const router = useRouter();

    const {
        user,
        isHydrated,
        isLoading,
        logout,
    } = useAuth();

    useEffect(() => {
        if (isHydrated && !user) {
            router.replace("/login");
        }
    }, [
        isHydrated,
        user,
        router,
    ]);

    async function handleLogout() {
        try {
            await logout();
            router.replace("/login");
        } catch {
            // The auth store retains the error.
        }
    }

    if (!isHydrated || isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center">
                <p className="text-sm text-muted-foreground">
                    Loading your Miyor account...
                </p>
            </main>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto w-full max-w-5xl px-6 py-8">
                {/* Dashboard header */}
                <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">
                            Miyor
                        </p>

                        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                            Welcome,{" "}
                            {user.displayName}
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Be there, Anywhere.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/dashboard/conversations"
                            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Conversations
                        </Link>

                        <Link
                            href="/dashboard/discover"
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Discover people
                        </Link>

                        <button
                            type="button"
                            onClick={() =>
                                router.push(
                                    "/dashboard/settings",
                                )
                            }
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Settings
                        </button>

                        <button
                            type="button"
                            onClick={
                                handleLogout
                            }
                            disabled={
                                isLoading
                            }
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoading
                                ? "Signing out..."
                                : "Sign out"}
                        </button>
                    </div>
                </header>

                {/* Quick actions */}
                <section className="mt-8 grid gap-4 sm:grid-cols-2">
                    <Link
                        href="/dashboard/discover"
                        className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                    <svg
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        aria-hidden="true"
                                    >
                                        <circle
                                            cx="9"
                                            cy="7"
                                            r="3"
                                        />
                                        <path
                                            d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"
                                            strokeLinecap="round"
                                        />
                                        <path
                                            d="M16 11a3 3 0 1 0 0-6"
                                            strokeLinecap="round"
                                        />
                                        <path
                                            d="M18 14.5c1.8.9 3 2.9 3 5.5"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </div>

                                <h2 className="mt-4 font-semibold text-slate-950">
                                    Discover people
                                </h2>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Find Miyor users and
                                    connect with people
                                    you know.
                                </p>
                            </div>

                            <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-600">
                                →
                            </span>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/calls/new"
                        className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                    <svg
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M15 10l4.5-2.5v9L15 14"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <rect
                                            x="3"
                                            y="6"
                                            width="12"
                                            height="12"
                                            rx="2"
                                        />
                                    </svg>
                                </div>

                                <h2 className="mt-4 font-semibold text-slate-950">
                                    Start a call
                                </h2>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Create a new Miyor
                                    call and invite
                                    people to join.
                                </p>
                            </div>

                            <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-600">
                                →
                            </span>
                        </div>
                    </Link>
                </section>

                {/* Profile */}
                <section className="mt-8">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-slate-950">
                            Your profile
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Manage the information people
                            see when they connect with you.
                        </p>
                    </div>

                    <UserProfileCard
                        user={user}
                    />
                </section>
            </div>
        </main>
    );
}