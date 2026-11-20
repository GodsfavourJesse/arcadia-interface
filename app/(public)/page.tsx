"use client";

import Link from "next/link";
import {
    Fragment,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    AnimatePresence,
    motion,
    useInView,
    useMotionValueEvent,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform,
    type MotionValue,
    type Variants,
} from "framer-motion";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";

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

/*
 * Design tokens
 * Miyor blue  #0971ED  primary
 * Sky         #2BA6FF  gradient partner
 * Deep blue   #062B5B  dark sections
 * Ink         #0C1A2E  text
 * Mist        #F2F7FD  soft backgrounds
 * Sand        #FFE7C7  warm counterpoint (human moments)
 */

const ease = [0.22, 1, 0.36, 1] as const;

const focusRing =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0971ED]";

const focusRingLight =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const glass =
    "border border-white/70 bg-white/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(9,113,237,0.12)]";

const glassDark = "border border-white/15 bg-white/[0.07] backdrop-blur-xl";

const primaryBtn =
    "bg-gradient-to-b from-[#2B8CF5] to-[#0971ED] text-white shadow-[0_12px_30px_-8px_rgba(9,113,237,0.65),inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-110";

export default function HomePage() {
    return <PublicHome />;
}

function PublicHome() {
    return (
        <main
            className={`${display.variable} ${body.variable} min-h-screen overflow-x-clip bg-white font-[family-name:var(--font-body)] text-[#0C1A2E] antialiased`}
        >
            <ScrollProgress />
            <SiteHeader />
            <Hero />
            <Occasions />
            <HowItWorks />
            <ForGuests />
            <GoodToKnow />
            <FinalCta />
            <SiteFooter />
        </main>
    );
}

/* -------------------------------------------------------------------------- */
/* Motion primitives                                                          */
/* -------------------------------------------------------------------------- */

const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const item: Variants = {
    hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
    show: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.7, ease },
    },
};

/** Fades, rises and un-blurs once when scrolled into view. */
function Reveal({
    children,
    className,
    delay = 0,
    y = 24,
}: {
    children: ReactNode;
    className?: string;
    delay?: number;
    y?: number;
}) {
    const reduce = useReducedMotion();

    return (
        <motion.div
            className={className}
            initial={reduce ? false : { opacity: 0, y, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay, ease }}
        >
            {children}
        </motion.div>
    );
}

/** Parent that staggers its <Item> children when scrolled into view. */
function Stagger({
    children,
    className,
    tag = "div",
}: {
    children: ReactNode;
    className?: string;
    tag?: "div" | "ul" | "ol" | "dl";
}) {
    const reduce = useReducedMotion();
    const Tag = motion[tag] as typeof motion.div;

    return (
        <Tag
            className={className}
            variants={container}
            initial={reduce ? false : "hidden"}
            whileInView={reduce ? undefined : "show"}
            viewport={{ once: true, margin: "-80px" }}
        >
            {children}
        </Tag>
    );
}

function Item({
    children,
    className,
    tag = "div",
}: {
    children: ReactNode;
    className?: string;
    tag?: "div" | "li";
}) {
    const Tag = motion[tag] as typeof motion.div;

    return (
        <Tag className={className} variants={item}>
            {children}
        </Tag>
    );
}

/** Spring-based hover and press feedback for buttons and links. */
function Press({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.span
            className={`inline-flex ${className}`}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
        >
            {children}
        </motion.span>
    );
}

/** Soft blurred colour field that drifts slowly. */
function Blob({
    className,
    duration = 18,
    drift = 40,
}: {
    className: string;
    duration?: number;
    drift?: number;
}) {
    const reduce = useReducedMotion();

    return (
        <motion.div
            aria-hidden="true"
            className={`pointer-events-none absolute rounded-full will-change-transform ${className}`}
            animate={
                reduce
                    ? undefined
                    : {
                          x: [0, drift, -drift / 2, 0],
                          y: [0, -drift / 2, drift, 0],
                          scale: [1, 1.08, 0.96, 1],
                      }
            }
            transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
        />
    );
}

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

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

const navLinks = [
    { href: "#how-it-works", label: "How it works" },
    { href: "#for-guests", label: "For guests" },
    { href: "/services", label: "Services" },
];

function SiteHeader() {
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
                    ? "border-b border-[#0C1A2E]/[0.06] bg-white/70 shadow-[0_1px_30px_rgba(9,113,237,0.08)] backdrop-blur-xl"
                    : "border-b border-transparent bg-transparent"
            }`}
        >
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
                <Logo />

                <nav
                    aria-label="Main"
                    className="hidden items-center gap-1 md:flex"
                    onMouseLeave={() => setHovered(null)}
                >
                    {navLinks.map((l) => (
                        <Link
                            key={l.label}
                            href={l.href}
                            onMouseEnter={() => setHovered(l.label)}
                            onFocus={() => setHovered(l.label)}
                            onBlur={() => setHovered(null)}
                            className={`relative rounded-full px-4 py-2 text-[15px] font-medium text-[#0C1A2E]/70 transition-colors hover:text-[#0C1A2E] ${focusRing}`}
                        >
                            {hovered === l.label && (
                                <motion.span
                                    layoutId="nav-pill"
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
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    <Link
                        href="/login"
                        className={`hidden rounded-full px-4 py-2.5 text-[15px] font-medium text-[#0C1A2E] transition-colors hover:bg-[#0C1A2E]/5 sm:block ${focusRing}`}
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
                        aria-controls="mobile-menu"
                        aria-label={open ? "Close menu" : "Open menu"}
                        className={`ml-1 flex h-10 w-10 items-center justify-center rounded-full text-[#0C1A2E] hover:bg-[#0C1A2E]/5 md:hidden ${focusRing}`}
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
                        id="mobile-menu"
                        aria-label="Mobile"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease }}
                        className="overflow-hidden px-5 md:hidden"
                    >
                        <div className="pb-5 pt-1">
                            {[...navLinks, { href: "/login", label: "Sign in" }].map(
                                (l, i) => (
                                    <motion.div
                                        key={l.label}
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{
                                            delay: 0.08 + i * 0.06,
                                            duration: 0.4,
                                            ease,
                                        }}
                                    >
                                        <Link
                                            href={l.href}
                                            onClick={() => setOpen(false)}
                                            className="block border-b border-[#0C1A2E]/10 py-4 text-lg font-medium"
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
                    <linearGradient id={light ? "lg-l" : "lg-d"} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor={light ? "#fff" : "#2BA6FF"} />
                        <stop offset="1" stopColor={light ? "#CFE3FB" : "#0971ED"} />
                    </linearGradient>
                </defs>
                <motion.circle
                    cx="11.5"
                    cy="16"
                    r="9"
                    fill={`url(#${light ? "lg-l" : "lg-d"})`}
                    initial={{ cx: 5 }}
                    animate={{ cx: 11.5 }}
                    transition={{ duration: 0.9, delay: 0.3, ease }}
                />
                <motion.circle
                    cx="20.5"
                    cy="16"
                    r="9"
                    fill={light ? "#fff" : "#0971ED"}
                    fillOpacity="0.55"
                    initial={{ cx: 27 }}
                    animate={{ cx: 20.5 }}
                    transition={{ duration: 0.9, delay: 0.3, ease }}
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
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

function useLocalTime(timeZone: string) {
    const [time, setTime] = useState("");

    useEffect(() => {
        const fmt = () =>
            setTime(
                new Intl.DateTimeFormat("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone,
                })
                    .format(new Date())
                    .toLowerCase()
            );
        fmt();
        const id = setInterval(fmt, 20000);
        return () => clearInterval(id);
    }, [timeZone]);

    return time;
}

function HeroLine({ children, delay }: { children: ReactNode; delay: number }) {
    const reduce = useReducedMotion();

    return (
        <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
            <motion.span
                className="block"
                initial={reduce ? false : { y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.95, delay, ease }}
            >
                {children}
            </motion.span>
        </span>
    );
}

function Hero() {
    const reduce = useReducedMotion();
    const ref = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });
    const blobA = useTransform(scrollYProgress, [0, 1], [0, 140]);
    const blobB = useTransform(scrollYProgress, [0, 1], [0, -90]);

    const fade = (delay: number) =>
        reduce
            ? {}
            : {
                  initial: { opacity: 0, y: 20, filter: "blur(8px)" },
                  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
                  transition: { duration: 0.8, delay, ease },
              };

    return (
        <section
            ref={ref}
            className="relative overflow-hidden bg-gradient-to-b from-[#E4EFFE] via-[#F2F7FD] to-white"
        >
            {/* Mesh gradient and blur */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <motion.div style={{ y: blobA }} className="absolute inset-0">
                    <Blob
                        className="-left-40 -top-32 h-[520px] w-[520px] bg-[#0971ED]/25 blur-[110px]"
                        duration={22}
                    />
                    <Blob
                        className="right-[-120px] top-10 h-[460px] w-[460px] bg-[#2BC6FF]/25 blur-[110px]"
                        duration={19}
                        drift={50}
                    />
                </motion.div>

                <motion.div style={{ y: blobB }} className="absolute inset-0">
                    <Blob
                        className="bottom-[-160px] left-1/3 h-[420px] w-[620px] bg-[#6C8CFF]/20 blur-[120px]"
                        duration={26}
                        drift={60}
                    />
                </motion.div>

                <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.85),transparent)]" />
            </div>

            <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-32 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-10 lg:pb-32 lg:pt-40">
                <div>
                    <h1 className="font-[family-name:var(--font-display)] text-[clamp(3.25rem,9vw,6.75rem)] font-semibold leading-[0.92] tracking-[-0.045em]">
                        <HeroLine delay={0.15}>Be there,</HeroLine>
                        <HeroLine delay={0.3}>anywhere.</HeroLine>
                    </h1>

                    <motion.p
                        {...fade(0.65)}
                        className="mt-8 max-w-[34rem] text-xl leading-9 text-[#0C1A2E]/70"
                    >
                        Start a call, send one link, and talk face to face.
                        The person you invite joins from their browser, with
                        no account and no download.
                    </motion.p>

                    <motion.div
                        {...fade(0.8)}
                        className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
                    >
                        <Press>
                            <Link
                                href="/signup"
                                className={`inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-semibold transition ${primaryBtn} ${focusRing}`}
                            >
                                Create a call
                            </Link>
                        </Press>

                        <a
                            href="#how-it-works"
                            className={`inline-flex items-center justify-center rounded-full px-6 py-4 text-base font-semibold text-[#0C1A2E] underline decoration-[#0C1A2E]/25 underline-offset-[6px] transition-colors hover:decoration-[#0971ED] ${focusRing}`}
                        >
                            See how it works
                        </a>
                    </motion.div>

                    <motion.p
                        {...fade(0.95)}
                        className="mt-6 text-sm text-[#0C1A2E]/55"
                    >
                        Free to start. Your guest never needs to sign up.
                    </motion.p>
                </div>

                <CallComposition />
            </div>
        </section>
    );
}

function CallComposition() {
    const reduce = useReducedMotion();
    const lagos = useLocalTime("Africa/Lagos");
    const toronto = useLocalTime("America/Toronto");
    const { scrollY } = useScroll();
    const lift = useTransform(scrollY, [0, 600], [0, -40]);

    const enter = (delay: number, x = 0, y = 16) =>
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
                  transition: { duration, repeat: Infinity, ease: "easeInOut" as const },
              };

    return (
        <motion.div
            style={reduce ? undefined : { y: lift }}
            className="relative mx-auto w-full max-w-[540px] pb-8 lg:mx-0 lg:justify-self-end"
        >
            {/* Glow behind the call */}
            <div
                aria-hidden="true"
                className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-[#0971ED]/35 via-[#2BC6FF]/20 to-[#6C8CFF]/25 blur-3xl"
            />

            {/* Main tile */}
            <motion.div
                {...enter(0.2, 0, 28)}
                className="relative ml-auto aspect-[5/6] w-[84%] overflow-hidden rounded-[2rem] bg-[#CFE3FB] shadow-[0_30px_60px_-20px_rgba(6,43,91,0.35)] ring-1 ring-white/70"
            >
                <Person
                    bg="#CFE3FB"
                    skin="#8D5A3B"
                    hair="#1B1410"
                    shirt="#0971ED"
                    style="short"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#062B5B]/45 via-transparent to-white/15" />

                <motion.span
                    {...enter(1.1, 0, 0)}
                    className={`absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-[#0C1A2E] ${glass}`}
                >
                    <span className="relative flex h-2 w-2">
                        {!reduce && (
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                        )}
                        <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Connected
                </motion.span>

                <span className="absolute bottom-4 left-4 rounded-xl border border-white/20 bg-[#0C1A2E]/40 px-3 py-2 text-sm font-medium text-white backdrop-blur-md">
                    Amara, Lagos
                    <span className="ml-2 text-white/70" suppressHydrationWarning>
                        {lagos}
                    </span>
                </span>
            </motion.div>

            {/* Second tile */}
            <motion.div
                {...enter(0.5, -28, 0)}
                className="absolute bottom-24 left-0 w-[44%]"
            >
                <motion.div
                    {...float(6, 8)}
                    className="relative aspect-square overflow-hidden rounded-[1.5rem] border-[5px] border-white/80 bg-[#FFE7C7] shadow-[0_20px_40px_-12px_rgba(6,43,91,0.35)]"
                >
                    <Person
                        bg="#FFE7C7"
                        skin="#E8B894"
                        hair="#5A3A22"
                        shirt="#0C1A2E"
                        style="long"
                    />

                    <span className="absolute bottom-2 left-2 rounded-lg border border-white/20 bg-[#0C1A2E]/40 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                        Daniel, Toronto
                        <span className="ml-1.5 text-white/70" suppressHydrationWarning>
                            {toronto}
                        </span>
                    </span>
                </motion.div>
            </motion.div>

            {/* Join notification */}
            <motion.div
                initial={reduce ? false : { opacity: 0, y: -16, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 22,
                    delay: 1.7,
                }}
                className="absolute left-0 top-8 z-10 hidden sm:block"
            >
                <motion.div
                    {...float(5, 6)}
                    className={`flex items-center gap-3 rounded-2xl py-2.5 pl-2.5 pr-4 ${glass}`}
                >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#FFE7C7] to-[#E8B894] text-sm font-semibold text-[#5A3A22]">
                        D
                    </span>
                    <span className="text-sm leading-tight">
                        <span className="block font-semibold">Daniel joined</span>
                        <span className="block text-xs text-[#0C1A2E]/55">
                            From a link, no account
                        </span>
                    </span>
                </motion.div>
            </motion.div>

            {/* Controls */}
            <motion.div
                {...enter(1.3, 0, 12)}
                className={`absolute bottom-0 right-6 flex items-center gap-2 rounded-full p-2 ${glass}`}
            >
                <RoundIcon>
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8" />
                </RoundIcon>
                <RoundIcon>
                    <path d="M15 10l4.5-2.5v9L15 14" />
                    <rect x="3" y="6" width="12" height="12" rx="2" />
                </RoundIcon>
                <span className="flex h-10 items-center rounded-full bg-gradient-to-b from-[#F0646A] to-[#E5484D] px-5 text-sm font-semibold text-white">
                    Leave
                </span>
            </motion.div>
        </motion.div>
    );
}

function RoundIcon({ children }: { children: ReactNode }) {
    return (
        <motion.span
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[#0C1A2E]"
        >
            <svg
                className="h-[18px] w-[18px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                {children}
            </svg>
        </motion.span>
    );
}

/* Flat, friendly portrait used in the call tiles */
function Person({
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
    style: "short" | "long" | "puff";
}) {
    return (
        <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 200 200"
            preserveAspectRatio="xMidYMax slice"
            role="img"
            aria-label="Illustration of a person on a video call"
        >
            <rect width="200" height="200" fill={bg} />

            {/* Hair behind head */}
            {style === "long" && (
                <path
                    d="M58 100 C54 52 80 40 100 40 C122 40 146 52 142 100 L146 150 L54 150Z"
                    fill={hair}
                />
            )}
            {style === "puff" && <circle cx="100" cy="76" r="46" fill={hair} />}

            {/* Shoulders */}
            <path
                d="M14 200 C14 156 56 140 100 140 C144 140 186 156 186 200Z"
                fill={shirt}
            />
            {/* Neck */}
            <rect x="87" y="108" width="26" height="36" rx="10" fill={skin} />
            {/* Head */}
            <ellipse cx="100" cy="90" rx="33" ry="38" fill={skin} />

            {/* Front hair */}
            {style === "short" && (
                <path
                    d="M66 88 C62 50 88 40 102 40 C122 40 140 54 134 88 C128 70 114 62 100 62 C86 62 72 70 66 88Z"
                    fill={hair}
                />
            )}
            {style === "long" && (
                <path
                    d="M66 92 C64 54 88 44 102 44 C120 44 138 56 134 92 C124 72 112 64 100 64 C86 64 74 72 66 92Z"
                    fill={hair}
                />
            )}
            {style === "puff" && (
                <path
                    d="M68 84 C72 62 128 62 132 84 C122 72 112 68 100 68 C88 68 78 72 68 84Z"
                    fill={hair}
                />
            )}

            {/* Face */}
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

/* -------------------------------------------------------------------------- */
/* Occasions: words light up as you scroll                                    */
/* -------------------------------------------------------------------------- */

const occasionsText =
    "For a parent abroad, a client in another time zone, a first interview, or a friend you haven’t seen in years. Miyor is for the conversations that are worth showing up for.";

function ScrollWord({
    children,
    progress,
    range,
    reduce,
}: {
    children: string;
    progress: MotionValue<number>;
    range: [number, number];
    reduce: boolean;
}) {
    const opacity = useTransform(progress, range, [0.16, 1]);

    return (
        <motion.span
            style={{ opacity: reduce ? 1 : opacity }}
            className="inline-block"
        >
            {children}
        </motion.span>
    );
}

function Occasions() {
    const reduce = !!useReducedMotion();
    const ref = useRef<HTMLParagraphElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start 0.85", "end 0.55"],
    });
    const words = occasionsText.split(" ");

    return (
        <section className="relative overflow-hidden bg-white py-24 sm:py-36">
            <Blob
                className="-right-40 top-0 h-[420px] w-[420px] bg-[#2BC6FF]/15 blur-[110px]"
                duration={24}
            />

            <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                <p
                    ref={ref}
                    className="max-w-4xl font-[family-name:var(--font-display)] text-3xl font-medium leading-[1.2] tracking-[-0.02em] sm:text-5xl sm:leading-[1.15]"
                >
                    {words.map((w, i) => {
                        const start = i / words.length;
                        const end = Math.min(1, start + 2 / words.length);
                        return (
                            <Fragment key={i}>
                                <ScrollWord
                                    progress={scrollYProgress}
                                    range={[start, end]}
                                    reduce={reduce}
                                >
                                    {w}
                                </ScrollWord>{" "}
                            </Fragment>
                        );
                    })}
                </p>
            </div>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* How it works                                                               */
/* -------------------------------------------------------------------------- */

function CopyChip() {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const id = setTimeout(() => setCopied(false), 1800);
        return () => clearTimeout(id);
    }, [copied]);

    return (
        <motion.button
            type="button"
            onClick={() => setCopied(true)}
            whileTap={{ scale: 0.95 }}
            className={`relative overflow-hidden rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                copied
                    ? "border-[#0971ED] bg-[#0971ED] text-white"
                    : "border-[#0C1A2E]/15 bg-white/70 backdrop-blur hover:border-[#0971ED]/50"
            } ${focusRing}`}
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={copied ? "done" : "idle"}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="block"
                >
                    {copied ? "Copied" : "Copy link"}
                </motion.span>
            </AnimatePresence>
        </motion.button>
    );
}

function HowItWorks() {
    return (
        <section
            id="how-it-works"
            className="relative scroll-mt-4 overflow-hidden bg-gradient-to-b from-white via-[#F2F7FD] to-white py-24 sm:py-32"
        >
            <Blob
                className="-left-40 top-1/3 h-[420px] w-[420px] bg-[#0971ED]/15 blur-[110px]"
                duration={25}
            />

            <div className="relative mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-10">
                <Reveal className="lg:sticky lg:top-28 lg:self-start">
                    <h2 className="font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl">
                        Three steps from “let’s talk” to talking.
                    </h2>

                    <p className="mt-6 max-w-md text-lg leading-8 text-[#0C1A2E]/65">
                        You do the setup once. Your guest only has to open a
                        link.
                    </p>
                </Reveal>

                <Stagger tag="ol" className="relative">
                    <Step
                        n="1"
                        title="Create a call"
                        text="Sign in and start a new call. Miyor gives you a private invitation link."
                    >
                        <div className={`flex items-center gap-3 rounded-2xl p-3 ${glass}`}>
                            <span className="rounded-xl bg-gradient-to-b from-[#2B8CF5] to-[#0971ED] px-4 py-2 text-sm font-semibold text-white">
                                New call
                            </span>
                            <span className="truncate text-sm text-[#0C1A2E]/60">
                                miyor.com/c/k7x-2pq
                            </span>
                        </div>
                    </Step>

                    <Step
                        n="2"
                        title="Send the link"
                        text="Paste it into WhatsApp, email, or a text. Wherever you already talk to them."
                    >
                        <div className="flex flex-wrap gap-2">
                            {["WhatsApp", "Email", "Messages"].map((c) => (
                                <span
                                    key={c}
                                    className="rounded-full border border-[#0C1A2E]/15 bg-white/70 px-4 py-2 text-sm font-medium backdrop-blur"
                                >
                                    {c}
                                </span>
                            ))}
                            <CopyChip />
                        </div>
                    </Step>

                    <Step
                        n="3"
                        title="Talk face to face"
                        text="Your guest opens the link, allows their camera and microphone, and joins."
                        last
                    >
                        <div
                            className={`flex items-center justify-between gap-4 rounded-2xl p-4 ${glass}`}
                        >
                            <p className="text-sm font-medium">
                                Miyor wants to use your camera and microphone
                            </p>
                            <span className="shrink-0 rounded-xl bg-[#0C1A2E] px-4 py-2 text-sm font-semibold text-white">
                                Allow
                            </span>
                        </div>
                    </Step>
                </Stagger>
            </div>
        </section>
    );
}

function Step({
    n,
    title,
    text,
    children,
    last = false,
}: {
    n: string;
    title: string;
    text: string;
    children: ReactNode;
    last?: boolean;
}) {
    const reduce = useReducedMotion();

    return (
        <Item tag="li" className="relative flex gap-6 pb-14 last:pb-0 sm:gap-8">
            {!last && (
                <motion.span
                    aria-hidden="true"
                    initial={reduce ? false : { scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 1, delay: 0.4, ease }}
                    className="absolute left-[19px] top-12 h-[calc(100%-3rem)] w-px origin-top bg-gradient-to-b from-[#0971ED]/50 to-[#0971ED]/5"
                />
            )}

            <motion.span
                initial={reduce ? false : { scale: 0.6 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2BA6FF] to-[#0971ED] text-base font-semibold text-white shadow-[0_8px_20px_-4px_rgba(9,113,237,0.55)]"
            >
                {n}
            </motion.span>

            <div className="min-w-0 flex-1">
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
                    {title}
                </h3>

                <p className="mt-2 max-w-lg text-base leading-7 text-[#0C1A2E]/65">
                    {text}
                </p>

                <div className="mt-6 max-w-lg">{children}</div>
            </div>
        </Item>
    );
}

/* -------------------------------------------------------------------------- */
/* For guests                                                                 */
/* -------------------------------------------------------------------------- */

function ForGuests() {
    return (
        <section
            id="for-guests"
            className="relative scroll-mt-4 overflow-hidden bg-[radial-gradient(120%_90%_at_50%_0%,#0B4A9E_0%,#062B5B_55%,#041E42_100%)] py-24 text-white sm:py-32"
        >
            {/* Aurora */}
            <Blob
                className="-left-32 top-10 h-[460px] w-[460px] bg-[#0971ED]/45 blur-[120px]"
                duration={20}
            />
            <Blob
                className="right-[-100px] top-1/3 h-[420px] w-[420px] bg-[#2BC6FF]/30 blur-[120px]"
                duration={23}
                drift={55}
            />
            <Blob
                className="bottom-[-140px] left-1/3 h-[360px] w-[520px] bg-[#6C8CFF]/30 blur-[130px]"
                duration={27}
            />

            <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-10">
                <div>
                    <Reveal>
                        <h2 className="font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl">
                            Nobody should have to install something to see
                            your face.
                        </h2>
                    </Reveal>

                    <Stagger tag="dl" className="mt-12 grid gap-3">
                        <Point
                            term="No account"
                            text="Guests type their name and join. That’s all."
                        />
                        <Point
                            term="No download"
                            text="It runs in the browser on a phone, tablet, or laptop."
                        />
                        <Point
                            term="One link"
                            text="The same invitation works wherever you send it."
                        />
                    </Stagger>
                </div>

                <GuestPhone />
            </div>
        </section>
    );
}

function Point({ term, text }: { term: string; text: string }) {
    return (
        <Item
            className={`grid gap-1 rounded-2xl px-5 py-4 sm:grid-cols-[9rem_1fr] sm:gap-6 ${glassDark}`}
        >
            <dt className="text-lg font-semibold">{term}</dt>
            <dd className="text-base leading-7 text-white/70">{text}</dd>
        </Item>
    );
}

function GuestPhone() {
    const reduce = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.5 });
    const full = "Daniel";
    const [name, setName] = useState("");
    const ready = name.length === full.length;

    useEffect(() => {
        if (!inView) return;
        if (reduce) {
            setName(full);
            return;
        }

        let interval: ReturnType<typeof setInterval> | undefined;
        const start = setTimeout(() => {
            let i = 0;
            interval = setInterval(() => {
                i += 1;
                setName(full.slice(0, i));
                if (i >= full.length && interval) clearInterval(interval);
            }, 140);
        }, 900);

        return () => {
            clearTimeout(start);
            if (interval) clearInterval(interval);
        };
    }, [inView, reduce]);

    return (
        <motion.div
            ref={ref}
            initial={reduce ? false : { opacity: 0, y: 60, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease }}
            className="relative mx-auto w-full max-w-[320px] lg:justify-self-end"
        >
            {/* Glow */}
            <div
                aria-hidden="true"
                className="absolute -inset-10 rounded-full bg-[#0971ED]/40 blur-3xl"
            />

            <motion.div
                animate={reduce ? undefined : { y: [0, -10, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="relative rounded-[2.75rem] border border-white/25 bg-white/10 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-md"
            >
                <div className="overflow-hidden rounded-[2.1rem] bg-white text-[#0C1A2E]">
                    <div className="relative aspect-[4/3] bg-[#D9ECE3]">
                        <Person
                            bg="#D9ECE3"
                            skin="#C68642"
                            hair="#1B1410"
                            shirt="#E8B894"
                            style="puff"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#062B5B]/25 to-transparent" />
                    </div>

                    <div className="p-5">
                        <p className="text-lg font-semibold leading-snug">
                            Amara invited you to a call
                        </p>

                        <p className="mt-1 text-sm text-[#0C1A2E]/60">
                            You’ll join from this browser.
                        </p>

                        <div className="mt-5 flex items-center rounded-xl border border-[#0C1A2E]/15 px-4 py-3 text-sm">
                            {name ? (
                                <span>{name}</span>
                            ) : (
                                <span className="text-[#0C1A2E]/50">Your name</span>
                            )}
                            {inView && !ready && !reduce && (
                                <motion.span
                                    aria-hidden="true"
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ duration: 0.9, repeat: Infinity }}
                                    className="ml-0.5 h-4 w-px bg-[#0971ED]"
                                />
                            )}
                        </div>

                        <motion.div
                            animate={
                                ready && !reduce
                                    ? { scale: [1, 1.05, 1] }
                                    : { scale: 1 }
                            }
                            transition={{ duration: 0.5, ease }}
                            className={`mt-3 rounded-xl py-3.5 text-center text-sm font-semibold ${primaryBtn} ${
                                ready ? "" : "opacity-60"
                            }`}
                        >
                            Join call
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            {/* Camera ready chip */}
            <AnimatePresence>
                {ready && (
                    <motion.div
                        initial={reduce ? false : { opacity: 0, x: -20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 22 }}
                        className={`absolute -left-4 top-28 flex items-center gap-2 rounded-full py-2 pl-2 pr-4 text-sm font-semibold text-white sm:-left-12 ${glassDark} bg-white/15`}
                    >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-[#062B5B]">
                            <svg
                                className="h-3.5 w-3.5"
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
                        Camera ready
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/* -------------------------------------------------------------------------- */
/* Good to know (Services, Privacy, Terms)                                    */
/* -------------------------------------------------------------------------- */

const infoLinks = [
    {
        href: "/services",
        title: "Services",
        text: "What Miyor offers and how it fits the way you talk.",
    },
    {
        href: "/privacy",
        title: "Privacy",
        text: "How we handle your calls, your details, and your data.",
    },
    {
        href: "/terms",
        title: "Terms of use",
        text: "The ground rules for using Miyor.",
    },
];

function GoodToKnow() {
    return (
        <section className="relative overflow-hidden bg-white py-24 sm:py-32">
            <Blob
                className="-right-40 bottom-0 h-[380px] w-[380px] bg-[#0971ED]/10 blur-[110px]"
                duration={22}
            />

            <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-10">
                <Reveal>
                    <h2 className="font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                        Good to know before you start.
                    </h2>
                </Reveal>

                <Stagger
                    tag="ul"
                    className="divide-y divide-[#0C1A2E]/10 border-y border-[#0C1A2E]/10"
                >
                    {infoLinks.map((l) => (
                        <Item key={l.href} tag="li">
                            <motion.div
                                initial="rest"
                                whileHover="hover"
                                whileFocus="hover"
                                animate="rest"
                                className="relative"
                            >
                                <Link
                                    href={l.href}
                                    className={`flex items-center justify-between gap-6 py-7 ${focusRing}`}
                                >
                                    <span>
                                        <motion.span
                                            variants={{
                                                rest: { x: 0 },
                                                hover: { x: 6 },
                                            }}
                                            transition={{ duration: 0.3, ease }}
                                            className="block font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight"
                                        >
                                            {l.title}
                                        </motion.span>
                                        <motion.span
                                            variants={{
                                                rest: { x: 0 },
                                                hover: { x: 6 },
                                            }}
                                            transition={{ duration: 0.3, delay: 0.03, ease }}
                                            className="mt-1 block text-base text-[#0C1A2E]/60"
                                        >
                                            {l.text}
                                        </motion.span>
                                    </span>

                                    <motion.span
                                        aria-hidden="true"
                                        variants={{
                                            rest: {
                                                backgroundColor: "rgba(9,113,237,0)",
                                                color: "#0C1A2E",
                                                rotate: 0,
                                            },
                                            hover: {
                                                backgroundColor: "rgba(9,113,237,1)",
                                                color: "#ffffff",
                                                rotate: 45,
                                            },
                                        }}
                                        transition={{ duration: 0.3, ease }}
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#0C1A2E]/15"
                                    >
                                        <svg
                                            className="h-4 w-4"
                                            viewBox="0 0 20 20"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M4 10h12M11 5l5 5-5 5" />
                                        </svg>
                                    </motion.span>
                                </Link>

                                <motion.span
                                    aria-hidden="true"
                                    variants={{
                                        rest: { scaleX: 0 },
                                        hover: { scaleX: 1 },
                                    }}
                                    transition={{ duration: 0.4, ease }}
                                    className="absolute -bottom-px left-0 h-[2px] w-full origin-left bg-gradient-to-r from-[#0971ED] to-[#2BA6FF]"
                                />
                            </motion.div>
                        </Item>
                    ))}
                </Stagger>
            </div>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* Final CTA                                                                  */
/* -------------------------------------------------------------------------- */

function FinalCta() {
    const reduce = useReducedMotion();

    return (
        <section className="bg-white px-5 pb-24 sm:px-8 sm:pb-32 lg:px-10">
            <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.95, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.9, ease }}
                className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#0658C4_0%,#0971ED_45%,#2BA6FF_100%)] px-8 py-16 text-white shadow-[0_40px_80px_-30px_rgba(9,113,237,0.6)] sm:px-14 sm:py-24"
            >
                <Blob
                    className="-right-20 -top-24 h-[360px] w-[360px] bg-white/30 blur-[90px]"
                    duration={16}
                />
                <Blob
                    className="-bottom-32 left-1/4 h-[320px] w-[420px] bg-[#062B5B]/40 blur-[100px]"
                    duration={21}
                />
                <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_0%,rgba(255,255,255,0.22),transparent)]"
                />

                <div className="relative">
                    <Reveal>
                        <h2 className="max-w-3xl font-[family-name:var(--font-display)] text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-7xl">
                            Your next conversation is one link away.
                        </h2>
                    </Reveal>

                    <Reveal
                        delay={0.15}
                        className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
                    >
                        <Press>
                            <Link
                                href="/signup"
                                className={`inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-[#0971ED] shadow-[0_12px_30px_-10px_rgba(6,43,91,0.5)] transition-colors hover:bg-[#F2F7FD] ${focusRingLight}`}
                            >
                                Create a call
                            </Link>
                        </Press>

                        <Link
                            href="/login"
                            className={`inline-flex items-center justify-center rounded-full px-6 py-4 text-base font-semibold text-white underline decoration-white/40 underline-offset-[6px] transition-colors hover:decoration-white ${focusRingLight}`}
                        >
                            I already have an account
                        </Link>
                    </Reveal>
                </div>
            </motion.div>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                     */
/* -------------------------------------------------------------------------- */

const footerGroups = [
    {
        title: "Miyor",
        links: [
            { label: "How it works", href: "#how-it-works" },
            { label: "For guests", href: "#for-guests" },
            { label: "Services", href: "/services" },
        ],
    },
    {
        title: "Legal",
        links: [
            { label: "Privacy", href: "/privacy" },
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

            <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-16 sm:px-8 lg:px-10">
                <Stagger className="grid gap-12 md:grid-cols-[1.4fr_2fr]">
                    <Item>
                        <Logo light />

                        <p className="mt-5 max-w-xs text-base leading-7 text-white/65">
                            Face-to-face calls from a single link. Be there,
                            anywhere.
                        </p>
                    </Item>

                    <Item className="grid grid-cols-2 gap-10 sm:grid-cols-3">
                        {footerGroups.map((g) => (
                            <nav key={g.title} aria-label={g.title}>
                                <p className="text-sm font-semibold text-white">
                                    {g.title}
                                </p>

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
                    </Item>
                </Stagger>

                <div className="mt-14 flex flex-col gap-3 border-t border-white/15 pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
                    <p>© {new Date().getFullYear()} Miyor. All rights reserved.</p>

                    <p className="flex gap-5">
                        <Link href="/privacy" className="transition-colors hover:text-white">
                            Privacy
                        </Link>
                        <Link href="/terms" className="transition-colors hover:text-white">
                            Terms of use
                        </Link>
                        <Link href="/services" className="transition-colors hover:text-white">
                            Services
                        </Link>
                    </p>
                </div>
            </div>
        </footer>
    );
}