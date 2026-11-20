"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { AuthMotionSection } from "./auth-motion-section";

const display = Bricolage_Grotesque({
    subsets: ["latin"],
    variable: "--font-display",
    display: "swap",
});

const body = Instrument_Sans({
    subsets: ["latin"],
    variable: "--font-body",
    display: "swap",
});

const ease = [0.22, 1, 0.36, 1] as const;

type AuthShellProps = {
    children: ReactNode;
    title: string;
    subtitle?: string;
    footerText?: string;
    footerLinkText?: string;
    footerLinkHref?: string;
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
        <main
            className={`${display.variable} ${body.variable} min-h-screen bg-white font-[family-name:var(--font-body)] text-[#0C1A2E] antialiased`}
        >
            <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
                {/* Form side */}
                <section className="relative flex min-h-screen flex-col overflow-hidden">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-[#E4EFFE] to-transparent lg:hidden"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-[#0971ED]/[0.07] blur-3xl"
                    />

                    <header className="relative flex items-center justify-between px-5 py-6 sm:px-10 lg:px-14">
                        <MiyorLogo />

                        <Link
                            href="/"
                            className="rounded-full px-3 py-2 text-sm font-medium text-[#0C1A2E]/60 transition-colors hover:bg-[#0C1A2E]/5 hover:text-[#0C1A2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0971ED]"
                        >
                            Back to home
                        </Link>
                    </header>

                    <div className="relative flex flex-1 items-center justify-center px-5 pb-10 pt-2 sm:px-10">
                        <div className="w-full max-w-[420px]">
                            <AuthMotionSection>
                                <h1 className="font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-tight tracking-[-0.03em] sm:text-[2.25rem]">
                                    {title}
                                </h1>

                                {subtitle && (
                                    <p className="mt-3 text-[15px] leading-7 text-[#0C1A2E]/60">
                                        {subtitle}
                                    </p>
                                )}
                            </AuthMotionSection>

                            <AuthMotionSection delay={0.1} className="mt-8">
                                {children}
                            </AuthMotionSection>

                            {footerText && footerLinkText && footerLinkHref && (
                                <AuthMotionSection delay={0.18}>
                                    <p className="mt-8 text-center text-sm text-[#0C1A2E]/60">
                                        {footerText}{" "}
                                        <Link
                                            href={footerLinkHref}
                                            className="font-semibold text-[#0971ED] underline-offset-4 hover:underline"
                                        >
                                            {footerLinkText}
                                        </Link>
                                    </p>
                                </AuthMotionSection>
                            )}
                        </div>
                    </div>

                    <footer className="relative px-5 pb-7 text-center text-xs leading-5 text-[#0C1A2E]/50 sm:px-10">
                        By continuing, you agree to Miyor’s{" "}
                        <Link
                            href="/terms"
                            className="font-medium text-[#0C1A2E]/70 underline underline-offset-2 hover:text-[#0971ED]"
                        >
                            Terms of use
                        </Link>{" "}
                        and{" "}
                        <Link
                            href="/privacy"
                            className="font-medium text-[#0C1A2E]/70 underline underline-offset-2 hover:text-[#0971ED]"
                        >
                            Privacy policy
                        </Link>
                        .
                    </footer>
                </section>

                {/* Brand side */}
                <aside className="hidden p-4 lg:block">
                    <BrandPanel />
                </aside>
            </div>
        </main>
    );
}

/* -------------------------------------------------------------------------- */
/* Logo (the M mark)                                                          */
/* -------------------------------------------------------------------------- */

export function MiyorLogo() {
    return (
        <Link
            href="/"
            aria-label="Miyor home"
            className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0971ED]"
        >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2BA6FF] to-[#0971ED] font-[family-name:var(--font-display)] text-xl font-bold text-white shadow-[0_8px_20px_-6px_rgba(9,113,237,0.6)]">
                M
            </span>

            <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
                Miyor
            </span>
        </Link>
    );
}

/* -------------------------------------------------------------------------- */
/* Brand panel                                                                */
/* -------------------------------------------------------------------------- */

const facts = [
    "Guests join without an account",
    "Works in any modern browser",
    "Messages and calls in one place",
];

function BrandPanel() {
    const reduce = useReducedMotion();

    const enter = (delay: number, x = 0, y = 20) =>
        reduce
            ? {}
            : {
                  initial: { opacity: 0, x, y, filter: "blur(10px)" },
                  animate: { opacity: 1, x: 0, y: 0, filter: "blur(0px)" },
                  transition: { duration: 0.8, delay, ease },
              };

    const float = (duration: number, amount: number) =>
        reduce
            ? {}
            : {
                  animate: { y: [0, -amount, 0] },
                  transition: {
                      duration,
                      repeat: Infinity,
                      ease: "easeInOut" as const,
                  },
              };

    return (
        <div className="sticky top-4 flex h-[calc(100vh-2rem)] min-h-[620px] flex-col justify-between overflow-hidden rounded-[2rem] bg-[linear-gradient(150deg,#0658C4_0%,#0971ED_48%,#2BA6FF_100%)] p-10 text-white xl:p-14">
            {/* Blur and gradient fields */}
            <motion.div
                aria-hidden="true"
                animate={reduce ? undefined : { x: [0, 40, -20, 0], y: [0, -20, 30, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="pointer-events-none absolute -right-24 -top-24 h-[380px] w-[380px] rounded-full bg-white/30 blur-[90px]"
            />
            <motion.div
                aria-hidden="true"
                animate={reduce ? undefined : { x: [0, -30, 20, 0], y: [0, 30, -20, 0] }}
                transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
                className="pointer-events-none absolute -bottom-32 -left-20 h-[360px] w-[460px] rounded-full bg-[#062B5B]/45 blur-[100px]"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_0%,rgba(255,255,255,0.22),transparent)]"
            />

            {/* Top */}
            <motion.p
                {...enter(0.2, 0, 12)}
                className="relative inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur-xl"
            >
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Face-to-face, wherever you are
            </motion.p>

            {/* Middle */}
            <div className="relative">
                <motion.h2
                    {...enter(0.3)}
                    className="max-w-md font-[family-name:var(--font-display)] text-5xl font-semibold leading-[1] tracking-[-0.04em] xl:text-6xl"
                >
                    Be there,
                    <br />
                    anywhere.
                </motion.h2>

                <motion.p
                    {...enter(0.45)}
                    className="mt-5 max-w-sm text-base leading-7 text-white/80"
                >
                    Messages and calls in one place, with a link your guests
                    can open from any browser.
                </motion.p>

                {/* Call composition */}
                <div className="relative mt-10 h-[300px] max-w-md [@media(max-height:820px)]:hidden">
                    <motion.div
                        {...enter(0.6, 0, 24)}
                        className="absolute right-0 top-0 aspect-[5/6] w-[58%] overflow-hidden rounded-[1.75rem] border border-white/30 bg-[#CFE3FB] shadow-[0_30px_60px_-20px_rgba(6,43,91,0.6)]"
                    >
                        <Portrait
                            bg="#CFE3FB"
                            skin="#8D5A3B"
                            hair="#1B1410"
                            shirt="#0971ED"
                            style="short"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#062B5B]/45 via-transparent to-white/10" />
                        <span className="absolute bottom-3 left-3 rounded-lg border border-white/25 bg-[#0C1A2E]/40 px-2.5 py-1.5 text-xs font-medium backdrop-blur-md">
                            Amara, Lagos
                        </span>
                    </motion.div>

                    <motion.div
                        {...enter(0.8, -24, 0)}
                        className="absolute bottom-0 left-0 w-[40%]"
                    >
                        <motion.div
                            {...float(6, 8)}
                            className="relative aspect-square overflow-hidden rounded-[1.5rem] border-[4px] border-white/80 bg-[#FFE7C7] shadow-[0_20px_40px_-12px_rgba(6,43,91,0.5)]"
                        >
                            <Portrait
                                bg="#FFE7C7"
                                skin="#E8B894"
                                hair="#5A3A22"
                                shirt="#0C1A2E"
                                style="long"
                            />
                            <span className="absolute bottom-2 left-2 rounded-lg border border-white/25 bg-[#0C1A2E]/40 px-2 py-1 text-[11px] font-medium backdrop-blur-md">
                                Daniel, Toronto
                            </span>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        {...enter(1.1, 0, -10)}
                        className="absolute left-[8%] top-2"
                    >
                        <motion.span
                            {...float(5, 6)}
                            className="flex items-center gap-2.5 rounded-2xl border border-white/30 bg-white/20 py-2 pl-2 pr-4 text-sm backdrop-blur-xl"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-[#0971ED]">
                                D
                            </span>
                            <span className="font-semibold">Daniel joined</span>
                        </motion.span>
                    </motion.div>
                </div>
            </div>

            {/* Bottom */}
            <motion.ul {...enter(0.9, 0, 12)} className="relative space-y-3">
                {facts.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white/85">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                            <svg
                                className="h-3 w-3"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 11.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </span>
                        {f}
                    </li>
                ))}
            </motion.ul>
        </div>
    );
}

function Portrait({
    bg,
    skin,
    hair,
    shirt,
    style,
}: {
    bg: string;
    skin: string;
    hair: string;
    shirt: string;
    style: "short" | "long";
}) {
    return (
        <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 200 200"
            preserveAspectRatio="xMidYMax slice"
            aria-hidden="true"
        >
            <rect width="200" height="200" fill={bg} />
            {style === "long" && (
                <path
                    d="M58 100 C54 52 80 40 100 40 C122 40 146 52 142 100 L146 150 L54 150Z"
                    fill={hair}
                />
            )}
            <path
                d="M14 200 C14 156 56 140 100 140 C144 140 186 156 186 200Z"
                fill={shirt}
            />
            <rect x="87" y="108" width="26" height="36" rx="10" fill={skin} />
            <ellipse cx="100" cy="90" rx="33" ry="38" fill={skin} />
            {style === "short" ? (
                <path
                    d="M66 88 C62 50 88 40 102 40 C122 40 140 54 134 88 C128 70 114 62 100 62 C86 62 72 70 66 88Z"
                    fill={hair}
                />
            ) : (
                <path
                    d="M66 92 C64 54 88 44 102 44 C120 44 138 56 134 92 C124 72 112 64 100 64 C86 64 74 72 66 92Z"
                    fill={hair}
                />
            )}
            <circle cx="88" cy="92" r="2.6" fill="#1B1410" />
            <circle cx="112" cy="92" r="2.6" fill="#1B1410" />
            <path
                d="M91 106 Q100 114 109 106"
                fill="none"
                stroke="#1B1410"
                strokeWidth="2.4"
                strokeLinecap="round"
            />
        </svg>
    );
}