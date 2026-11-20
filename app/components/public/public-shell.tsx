"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
    AnimatePresence,
    motion,
    useMotionValueEvent,
    useScroll,
    useSpring,
} from "framer-motion";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import {
    Blob,
    Press,
    ease,
    focusRing,
    focusRingLight,
    primaryBtn,
} from "./public-ui";

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

const navLinks = [
    { href: "/#how-it-works", label: "How it works" },
    { href: "/services", label: "Services" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
];

export function PublicShell({ children }: { children: ReactNode }) {
    return (
        <div
            className={`${display.variable} ${body.variable} min-h-screen overflow-x-clip bg-white font-[family-name:var(--font-body)] text-[#0C1A2E] antialiased`}
        >
            <ScrollProgress />
            <SiteHeader />
            {children}
            <SiteFooter />
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

function ScrollProgress() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 120,
        damping: 28,
        restDelta: 0.001,
    });

    return (
        <motion.div
            aria-hidden="true"
            style={{ scaleX }}
            className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-[#0971ED] via-[#2BA6FF] to-[#7CC8FF]"
        />
    );
}

function SiteHeader() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [hovered, setHovered] = useState<string | null>(null);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 12));

    const solid = scrolled || open;

    return (
        <motion.header
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease }}
            className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ${
                solid
                    ? "border-b border-[#0C1A2E]/[0.06] bg-white/75 shadow-[0_1px_30px_rgba(9,113,237,0.08)] backdrop-blur-xl"
                    : "border-b border-transparent bg-transparent"
            }`}
        >
            <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5 sm:px-8">
                <Logo />

                <nav
                    aria-label="Public navigation"
                    className="hidden items-center gap-1 md:flex"
                    onMouseLeave={() => setHovered(null)}
                >
                    {navLinks.map((l) => {
                        const current = pathname === l.href;

                        return (
                            <Link
                                key={l.label}
                                href={l.href}
                                aria-current={current ? "page" : undefined}
                                onMouseEnter={() => setHovered(l.label)}
                                onFocus={() => setHovered(l.label)}
                                onBlur={() => setHovered(null)}
                                className={`relative rounded-full px-4 py-2 text-[15px] font-medium transition-colors ${
                                    current
                                        ? "text-[#0971ED]"
                                        : "text-[#0C1A2E]/70 hover:text-[#0C1A2E]"
                                } ${focusRing}`}
                            >
                                {hovered === l.label && (
                                    <motion.span
                                        layoutId="public-nav-pill"
                                        className="absolute inset-0 -z-10 rounded-full bg-[#0971ED]/10"
                                        transition={{
                                            type: "spring",
                                            stiffness: 380,
                                            damping: 30,
                                        }}
                                    />
                                )}
                                {l.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-2">
                    <Link
                        href="/login"
                        className={`hidden rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors hover:bg-[#0C1A2E]/5 sm:block ${focusRing}`}
                    >
                        Sign in
                    </Link>

                    <Press>
                        <Link
                            href="/signup"
                            className={`rounded-full px-5 py-2.5 text-[15px] font-semibold transition ${primaryBtn} ${focusRing}`}
                        >
                            Get started
                        </Link>
                    </Press>

                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        aria-expanded={open}
                        aria-controls="public-mobile-menu"
                        aria-label={open ? "Close menu" : "Open menu"}
                        className={`ml-1 flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#0C1A2E]/5 md:hidden ${focusRing}`}
                    >
                        <svg
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        >
                            {open ? (
                                <path d="M6 6l12 12M18 6L6 18" />
                            ) : (
                                <path d="M4 8h16M4 16h16" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.nav
                        id="public-mobile-menu"
                        aria-label="Mobile"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease }}
                        className="overflow-hidden px-5 sm:px-8 md:hidden"
                    >
                        <div className="pb-5 pt-1">
                            {[...navLinks, { href: "/login", label: "Sign in" }].map(
                                (l, i) => (
                                    <motion.div
                                        key={l.label}
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{
                                            delay: 0.08 + i * 0.05,
                                            duration: 0.4,
                                            ease,
                                        }}
                                    >
                                        <Link
                                            href={l.href}
                                            onClick={() => setOpen(false)}
                                            aria-current={pathname === l.href ? "page" : undefined}
                                            className={`block border-b border-[#0C1A2E]/10 py-4 text-lg font-medium ${
                                                pathname === l.href ? "text-[#0971ED]" : ""
                                            }`}
                                        >
                                            {l.label}
                                        </Link>
                                    </motion.div>
                                )
                            )}
                        </div>
                    </motion.nav>
                )}
            </AnimatePresence>
        </motion.header>
    );
}

function Logo({ light = false }: { light?: boolean }) {
    const id = light ? "public-logo-light" : "public-logo-dark";

    return (
        <Link
            href="/"
            aria-label="Miyor home"
            className={`flex items-center gap-2.5 rounded ${
                light ? focusRingLight : focusRing
            }`}
        >
            {/* Two circles meeting: two people, one conversation */}
            <svg className="h-8 w-8" viewBox="0 0 32 32" aria-hidden="true">
                <defs>
                    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor={light ? "#fff" : "#2BA6FF"} />
                        <stop offset="1" stopColor={light ? "#CFE3FB" : "#0971ED"} />
                    </linearGradient>
                </defs>
                <circle cx="11.5" cy="16" r="9" fill={`url(#${id})`} />
                <circle
                    cx="20.5"
                    cy="16"
                    r="9"
                    fill={light ? "#fff" : "#0971ED"}
                    fillOpacity="0.55"
                />
            </svg>

            <span
                className={`font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight ${
                    light ? "text-white" : "text-[#0C1A2E]"
                }`}
            >
                Miyor
            </span>
        </Link>
    );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                     */
/* -------------------------------------------------------------------------- */

const footerGroups = [
    {
        title: "Miyor",
        links: [
            { label: "How it works", href: "/#how-it-works" },
            { label: "Services", href: "/services" },
        ],
    },
    {
        title: "Legal",
        links: [
            { label: "Privacy policy", href: "/privacy" },
            { label: "Terms of use", href: "/terms" },
        ],
    },
    {
        title: "Account",
        links: [
            { label: "Sign in", href: "/login" },
            { label: "Get started", href: "/signup" },
        ],
    },
];

function SiteFooter() {
    return (
        <footer className="relative overflow-hidden bg-gradient-to-b from-[#062B5B] to-[#041E42] text-white">
            <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2BA6FF]/70 to-transparent"
            />
            <Blob
                className="-bottom-40 left-1/4 h-[320px] w-[520px] bg-[#0971ED]/30 blur-[120px]"
                duration={24}
            />

            <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-14 sm:px-8 sm:pt-16">
                <div className="grid gap-12 md:grid-cols-[1.4fr_2fr]">
                    <div>
                        <Logo light />

                        <p className="mt-5 max-w-xs text-base leading-7 text-white/65">
                            Messaging and face-to-face calls in one place. Be
                            there, anywhere.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
                        {footerGroups.map((g) => (
                            <nav key={g.title} aria-label={g.title}>
                                <p className="text-sm font-semibold">{g.title}</p>

                                <ul className="mt-4 space-y-3">
                                    {g.links.map((l) => (
                                        <li key={l.label}>
                                            <Link
                                                href={l.href}
                                                className={`inline-block rounded text-sm text-white/65 transition duration-200 hover:translate-x-1 hover:text-white ${focusRingLight}`}
                                            >
                                                {l.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        ))}
                    </div>
                </div>

                <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
                    <p>© {new Date().getFullYear()} Miyor. All rights reserved.</p>

                    <nav aria-label="Policies" className="flex flex-wrap gap-x-5 gap-y-2">
                        <Link href="/terms" className="transition-colors hover:text-white">
                            Terms of use
                        </Link>
                        <Link href="/privacy" className="transition-colors hover:text-white">
                            Privacy policy
                        </Link>
                        <Link href="/services" className="transition-colors hover:text-white">
                            Services
                        </Link>
                    </nav>
                </div>
            </div>
        </footer>
    );
}