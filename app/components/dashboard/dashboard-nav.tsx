"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/providers/auth-provider";

export function DashboardNav() {
    const router = useRouter();
    const { user, logout } = useAuth();

    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    function handleLogoutClick() {
        setShowLogoutModal(true);
    }

    function handleCancelLogout() {
        if (loggingOut) return;

        setShowLogoutModal(false);
    }

    async function handleConfirmLogout() {
        if (loggingOut) return;

        setLoggingOut(true);

        try {
            await logout();

            setShowLogoutModal(false);

            router.replace("/auth/login");
            router.refresh();
        } catch (error) {
            console.error("Logout failed:", error);
            setLoggingOut(false);
        }
    }

    return (
        <>
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
                    <Link
                        href="/"
                        className="flex items-center gap-3"
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                            M
                        </span>

                        <span className="text-lg font-semibold tracking-tight">
                            Miyor
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="hidden text-right sm:block">
                            <p className="text-sm font-medium text-slate-900">
                                {user?.name ?? "Miyor user"}
                            </p>

                            <p className="text-xs text-slate-400">
                                {user?.email ?? ""}
                            </p>
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                            {user?.name?.charAt(0).toUpperCase() ?? "M"}
                        </div>

                        <button
                            type="button"
                            onClick={handleLogoutClick}
                            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 sm:block"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            {showLogoutModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="logout-title"
                    aria-describedby="logout-description"
                >
                    <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
                        <div className="p-6 sm:p-7">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                                <svg
                                    className="h-6 w-6"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M10 17l5-5-5-5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M15 12H3"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d="M21 19V5a2 2 0 0 0-2-2h-6"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>

                            <h2
                                id="logout-title"
                                className="mt-5 text-xl font-bold tracking-tight text-slate-950"
                            >
                                Are you sure you want to log out?
                            </h2>

                            <p
                                id="logout-description"
                                className="mt-2 text-sm leading-6 text-slate-600"
                            >
                                You are about to log out of your MIYOR
                                account. Click <strong>Log out</strong> to
                                continue, or <strong>Cancel</strong> to keep
                                making calls.
                            </p>

                            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={handleCancelLogout}
                                    disabled={loggingOut}
                                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={handleConfirmLogout}
                                    disabled={loggingOut}
                                    className="flex items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-600/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loggingOut ? (
                                        <>
                                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            Logging out...
                                        </>
                                    ) : (
                                        "Log out"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}