"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/app/services/api.service";
import { useAuth } from "@/app/providers/auth-provider";
import { AuthShell } from "@/app/components/auth/auth-shell";

type VerificationState =
    | "verifying"
    | "success"
    | "error"
    | "waiting";

export default function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const { refreshUser } = useAuth();

    const token = searchParams.get("token");
    const email = searchParams.get("email");
    const next = searchParams.get("next");

    const [state, setState] =
        useState<VerificationState>(
            token ? "verifying" : "waiting",
        );

    const [message, setMessage] = useState("");

    const [resending, setResending] = useState(false);

    /*
     * Prevent duplicate verification requests caused by
     * React Strict Mode during development.
     */
    const verificationStarted = useRef(false);

    /*
     * Prevent the verification result from being affected
     * by auth-provider refreshes or component cleanup.
     */
    const verificationFinished = useRef(false);

    useEffect(() => {
        if (!token) {
            return;
        }

        if (verificationStarted.current) {
            return;
        }

        verificationStarted.current = true;

        async function verify() {
            try {
                const response =
                    await apiFetch<{
                        status: "ok";
                        message: string;
                    }>("/auth/verify-email", {
                        method: "POST",
                        body: JSON.stringify({
                            token,
                        }),
                    });

                /*
                 * The backend has successfully verified the
                 * account. Mark the operation as complete before
                 * refreshing auth state.
                 */
                verificationFinished.current = true;

                setMessage(
                    response.message ||
                        "Your email has been verified successfully.",
                );

                setState("success");

                /*
                 * Refresh authentication state in the background.
                 * It must not control whether the success screen
                 * is displayed.
                 */
                void refreshUser();
            } catch (error) {
                if (verificationFinished.current) {
                    return;
                }

                setState("error");

                setMessage(
                    error instanceof Error
                        ? error.message
                        : "This verification link is invalid or has expired.",
                );
            }
        }

        void verify();
    }, [token]);

    async function resendVerification() {
        if (!email || resending) {
            return;
        }

        setResending(true);

        try {
            const response =
                await apiFetch<{
                    status: "ok";
                    message: string;
                }>("/auth/resend-verification", {
                    method: "POST",
                    body: JSON.stringify({
                        email,
                    }),
                });

            setMessage(response.message);

            setState("waiting");
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to resend verification email.",
            );
        } finally {
            setResending(false);
        }
    }

    const dashboardHref =
        next?.startsWith("/")
            ? `/dashboard?verified=1&next=${encodeURIComponent(next)}`
            : "/dashboard?verified=1";

    const loginHref =
        next?.startsWith("/")
            ? `/auth/login?verified=1&next=${encodeURIComponent(next)}`
            : "/auth/login?verified=1";

    return (
        <AuthShell
            title={
                state === "success"
                    ? "You're verified"
                    : state === "error"
                      ? "Verification failed"
                      : "Verify your email"
            }
            subtitle={
                state === "success"
                    ? "Your Miyor account is ready. Welcome to a new way to connect."
                    : "Confirm your email address to finish setting up your account."
            }
            footerText=""
            footerLinkText=""
            footerLinkHref="/"
        >
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                {/* VERIFYING */}
                {state === "verifying" && (
                    <div className="relative overflow-hidden px-6 py-12 text-center sm:px-10">
                        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-100/60 blur-3xl" />
                        <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-violet-100/60 blur-3xl" />

                        <div className="relative">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950 shadow-lg shadow-indigo-200">
                                <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                            </div>

                            <h2 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">
                                Verifying your email
                            </h2>

                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                                Please wait while we securely confirm
                                your Miyor account.
                            </p>
                        </div>
                    </div>
                )}

                {/* SUCCESS */}
                {state === "success" && (
                    <div className="relative overflow-hidden px-6 py-10 text-center sm:px-10 sm:py-12">
                        {/* Decorative background */}
                        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />
                        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-100/70 blur-3xl" />

                        <div className="relative">
                            {/* Success icon */}
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200">
                                <svg
                                    className="h-10 w-10 text-white"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M5 12l4 4L19 6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>

                            <div className="mx-auto mt-7 max-w-md">
                                <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                                    Account verified
                                </div>

                                <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
                                    Welcome to Miyor
                                </h2>

                                <p className="mt-3 text-sm leading-7 text-slate-500">
                                    Your email has been verified and your
                                    account is ready to go.
                                </p>

                                <p className="mt-3 text-sm leading-7 text-slate-600">
                                    Connect with people from anywhere,
                                    share a call, and make every
                                    conversation feel closer.
                                </p>
                            </div>

                            {/* CTA */}
                            <div className="mx-auto mt-8 max-w-md">
                                <Link
                                    href={dashboardHref}
                                    className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200/50 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                                >
                                    Go to Dashboard

                                    <svg
                                        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M5 12h14"
                                            strokeLinecap="round"
                                        />
                                        <path
                                            d="m13 6 6 6-6 6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </Link>

                                <p className="mt-4 text-xs text-slate-400">
                                    Your Miyor journey starts here.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ERROR */}
                {state === "error" && (
                    <div className="relative overflow-hidden px-6 py-10 text-center sm:px-10">
                        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-red-100/60 blur-3xl" />

                        <div className="relative">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                                <svg
                                    className="h-8 w-8"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M12 8v4M12 16h.01"
                                        strokeLinecap="round"
                                    />

                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="9"
                                    />
                                </svg>
                            </div>

                            <h2 className="mt-6 text-xl font-semibold text-slate-900">
                                Verification failed
                            </h2>

                            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
                                {message}
                            </p>

                            {email && (
                                <button
                                    type="button"
                                    onClick={resendVerification}
                                    disabled={resending}
                                    className="mt-7 w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {resending
                                        ? "Sending..."
                                        : "Send a new verification email"}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* WAITING */}
                {state === "waiting" && (
                    <div className="relative overflow-hidden px-6 py-10 text-center sm:px-10">
                        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl" />

                        <div className="relative">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200">
                                <svg
                                    className="h-8 w-8"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    aria-hidden="true"
                                >
                                    <path d="M4 4h16v16H4z" />

                                    <path d="M4 6l8 6 8-6" />
                                </svg>
                            </div>

                            <h2 className="mt-6 text-xl font-semibold text-slate-900">
                                Check your inbox
                            </h2>

                            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
                                We sent a fresh verification link to{" "}
                                <span className="font-medium text-slate-700">
                                    {email ?? "your email address"}
                                </span>
                                .
                            </p>

                            {email && (
                                <button
                                    type="button"
                                    onClick={resendVerification}
                                    disabled={resending}
                                    className="mt-7 w-full rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {resending
                                        ? "Sending..."
                                        : "Resend verification email"}
                                </button>
                            )}

                            {message && (
                                <p className="mt-4 text-xs leading-5 text-slate-400">
                                    {message}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AuthShell>
    );
}