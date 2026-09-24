import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
    children: ReactNode;
    title: string;
    subtitle: string;
    footerText: string;
    footerLinkText: string;
    footerLinkHref: string;
};

export function AuthShell({
    children,
    title,
    subtitle,
    footerText,
    footerLinkText,
    footerLinkHref,
}: AuthShellProps) {
    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <div className="grid min-h-screen lg:grid-cols-2">
                {/* Brand / product side */}
                <section className="relative hidden overflow-hidden lg:flex">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(99,102,241,0.28),transparent_32%),radial-gradient(circle_at_80%_75%,rgba(168,85,247,0.20),transparent_30%)]" />

                    <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
                        <Link
                            href="/"
                            className="inline-flex w-fit items-center gap-3"
                        >
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-bold text-slate-950 shadow-lg">
                                M
                            </span>

                            <span className="text-xl font-semibold tracking-tight">
                                Miyor
                            </span>
                        </Link>

                        <div className="max-w-xl">
                            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 backdrop-blur">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                Simple video conversations
                            </div>

                            <h2 className="text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl">
                                Be there,
                                <br />
                                Anywhere.
                            </h2>

                            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
                                Connect face-to-face without making
                                communication complicated. Create a call,
                                share your invitation, and talk.
                            </p>

                            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                                    <p className="text-2xl font-semibold">
                                        1:1
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Private calls
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                                    <p className="text-2xl font-semibold">
                                        HD
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Video ready
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                                    <p className="text-2xl font-semibold">
                                        Web
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        No app required
                                    </p>
                                </div>
                            </div>
                        </div>

                        <p className="text-sm text-slate-500">
                            © {new Date().getFullYear()} Miyor. Be there,
                            Anywhere.
                        </p>
                    </div>

                    {/* Decorative video-call cards */}
                    <div className="pointer-events-none absolute right-[-80px] top-1/2 hidden w-80 -translate-y-1/2 rotate-6 xl:block">
                        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
                            <div className="aspect-[4/5] bg-gradient-to-br from-indigo-500/30 via-slate-900 to-purple-500/20">
                                <div className="flex h-full items-center justify-center">
                                    <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-white/10 text-3xl font-semibold backdrop-blur">
                                        M
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/80 px-5 py-4">
                                <div>
                                    <div className="h-2.5 w-20 rounded-full bg-white/20" />
                                    <div className="mt-2 h-2 w-12 rounded-full bg-white/10" />
                                </div>

                                <div className="flex gap-2">
                                    <span className="h-8 w-8 rounded-full bg-white/10" />
                                    <span className="h-8 w-8 rounded-full bg-white/10" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Form side */}
                <section className="flex min-h-screen items-center justify-center bg-white px-5 py-10 text-slate-950 sm:px-8">
                    <div className="w-full max-w-md">
                        <div className="mb-10 lg:hidden">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-3"
                            >
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-lg font-bold text-white">
                                    M
                                </span>

                                <span className="text-xl font-semibold tracking-tight">
                                    Miyor
                                </span>
                            </Link>
                        </div>

                        <div className="mb-8">
                            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                                {title}
                            </h1>

                            <p className="mt-3 text-sm leading-6 text-slate-500">
                                {subtitle}
                            </p>
                        </div>

                        {children}

                        <p className="mt-8 text-center text-sm text-slate-500">
                            {footerText}{" "}
                            <Link
                                href={footerLinkHref}
                                className="font-semibold text-slate-950 underline-offset-4 hover:underline"
                            >
                                {footerLinkText}
                            </Link>
                        </p>

                        <p className="mt-8 text-center text-xs leading-5 text-slate-400">
                            By continuing, you agree to Miyor&apos;s Terms
                            of Service and Privacy Policy.
                        </p>
                    </div>
                </section>
            </div>
        </main>
    );
}