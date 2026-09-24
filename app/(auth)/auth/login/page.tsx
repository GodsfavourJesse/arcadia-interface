"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ApiRequestError, apiFetch } from "@/app/services/api.service";
import { useAuth } from "@/app/providers/auth-provider";
import { AuthResponse } from "@/app/types/auth.types";
import { AuthShell } from "@/app/components/auth/auth-shell";

export default function LoginPage() {
    const router = useRouter();
    const { refreshUser } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);

    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const verified = new URLSearchParams(
            window.location.search,
        ).get("verified");

        if (verified === "1") {
            setNotice(
                "Your email has been verified. You can now sign in.",
            );
        }
    }, []);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            await apiFetch<AuthResponse>("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            // Make sure the AuthProvider knows the user is authenticated
            // before navigating to the protected dashboard.
            await refreshUser();

            const next = new URLSearchParams(
                window.location.search,
            ).get("next");

            const destination = next?.startsWith("/")
                ? next
                : "/dashboard";

            // Only add the welcome flag when we're actually going
            // to the dashboard.
            if (destination === "/dashboard") {
                router.replace("/dashboard?welcome=1");
            } else {
                router.replace(destination);
            }
        } catch (error) {
            if (
                error instanceof ApiRequestError &&
                error.code === "EMAIL_NOT_VERIFIED"
            ) {
                const next = new URLSearchParams(
                    window.location.search,
                ).get("next");

                const query = new URLSearchParams({
                    email,
                    ...(next?.startsWith("/")
                        ? { next }
                        : {}),
                });

                router.replace(
                    `/auth/verify-email?${query.toString()}`,
                );

                return;
            }

            setError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthShell
            title="Welcome back"
            subtitle="Sign in to your Miyor account to create and manage your video calls."
            footerText="Don't have an account?"
            footerLinkText="Create one"
            footerLinkHref="/auth/signup"
        >
            <form
                onSubmit={handleSubmit}
                className="space-y-5"
            >
                <div>
                    <label
                        htmlFor="email"
                        className="mb-2 block text-sm font-medium text-slate-700"
                    >
                        Email address
                    </label>

                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(event) =>
                            setEmail(event.target.value)
                        }
                        autoComplete="email"
                        placeholder="you@example.com"
                        required
                        disabled={loading}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                </div>

                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-slate-700"
                        >
                            Password
                        </label>

                        <span className="text-xs text-slate-400">
                            Secure sign in
                        </span>
                    </div>

                    <div className="relative">
                        <input
                            id="password"
                            name="password"
                            type={
                                showPassword
                                    ? "text"
                                    : "password"
                            }
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            required
                            disabled={loading}
                            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5 disabled:cursor-not-allowed disabled:bg-slate-50"
                        />

                        <button
                            type="button"
                            onClick={() =>
                                setShowPassword(
                                    (value) => !value,
                                )
                            }
                            disabled={loading}
                            aria-label={
                                showPassword
                                    ? "Hide password"
                                    : "Show password"
                            }
                            className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-slate-400 transition hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-950/10 disabled:cursor-not-allowed"
                        >
                            {showPassword ? (
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-5 w-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3.5 3.5 20.5 20.5"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M10.6 10.7a2 2 0 0 0 2.7 2.7"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9.9 5.1A10.7 10.7 0 0 1 12 4.9c5.1 0 8.5 4.1 9.7 7.1a10.8 10.8 0 0 1-3.2 4.3"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6.2 6.3C4.6 7.5 3.4 9.3 2.3 12c1.2 3 4.8 7.1 9.7 7.1 1.3 0 2.5-.3 3.6-.8"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-5 w-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M2.3 12s3.5-7 9.7-7 9.7 7 9.7 7-3.5 7-9.7 7-9.7-7-9.7-7Z"
                                    />
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="2.8"
                                    />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {notice && (
                    <div
                        role="status"
                        className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                    >
                        {notice}
                    </div>
                )}

                {error && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-950/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? (
                        <>
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Signing in...
                        </>
                    ) : (
                        "Sign in"
                    )}
                </button>

                <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-100" />
                    </div>

                    <div className="relative flex justify-center">
                        <span className="bg-white px-3 text-xs text-slate-400">
                            Secure account access
                        </span>
                    </div>
                </div>

                <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-center text-xs leading-5 text-slate-500">
                        Joining someone&apos;s Miyor call?
                        <br />
                        <span className="font-medium text-slate-700">
                            You don&apos;t need an account.
                        </span>
                    </p>
                </div>
            </form>

            <div className="mt-6 text-center">
                <Link
                    href="/"
                    className="text-sm text-slate-400 transition hover:text-slate-950"
                >
                    ← Back to Miyor
                </Link>
            </div>
        </AuthShell>
    );
}