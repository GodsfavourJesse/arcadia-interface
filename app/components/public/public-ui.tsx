"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

/*
 * Shared primitives for Miyor's public pages (shell, policy pages, services).
 *
 * Tokens
 * Miyor blue  #0971ED   Sky  #2BA6FF   Deep blue  #062B5B
 * Ink         #0C1A2E   Mist #F2F7FD   Sand       #FFE7C7
 */

export const ease = [0.22, 1, 0.36, 1] as const;

export const focusRing =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0971ED]";

export const focusRingLight =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export const glass =
    "border border-white/70 bg-white/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(9,113,237,0.12)]";

export const primaryBtn =
    "bg-gradient-to-b from-[#2B8CF5] to-[#0971ED] text-white shadow-[0_12px_30px_-8px_rgba(9,113,237,0.65),inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-110";

/* -------------------------------------------------------------------------- */
/* Motion                                                                     */
/* -------------------------------------------------------------------------- */

const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
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
export function Reveal({
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
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, delay, ease }}
        >
            {children}
        </motion.div>
    );
}

/** Parent that staggers its <Item> children when scrolled into view. */
export function Stagger({
    children,
    className,
    tag = "div",
}: {
    children: ReactNode;
    className?: string;
    tag?: "div" | "ul" | "ol";
}) {
    const reduce = useReducedMotion();
    const Tag = motion[tag] as typeof motion.div;

    return (
        <Tag
            className={className}
            variants={container}
            initial={reduce ? false : "hidden"}
            whileInView={reduce ? undefined : "show"}
            viewport={{ once: true, margin: "-60px" }}
        >
            {children}
        </Tag>
    );
}

export function Item({
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
export function Press({
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
export function Blob({
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

/* -------------------------------------------------------------------------- */
/* Page hero                                                                  */
/* -------------------------------------------------------------------------- */

export function PageHero({
    eyebrow,
    title,
    intro,
    children,
}: {
    eyebrow: string;
    title: string;
    intro: string;
    children?: ReactNode;
}) {
    const reduce = useReducedMotion();

    const fade = (delay: number) =>
        reduce
            ? {}
            : {
                  initial: { opacity: 0, y: 20, filter: "blur(8px)" },
                  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
                  transition: { duration: 0.8, delay, ease },
              };

    return (
        <section className="relative overflow-hidden bg-gradient-to-b from-[#E4EFFE] via-[#F2F7FD] to-[#F2F7FD]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <Blob
                    className="-left-40 -top-32 h-[460px] w-[460px] bg-[#0971ED]/25 blur-[110px]"
                    duration={22}
                />
                <Blob
                    className="right-[-120px] top-0 h-[400px] w-[400px] bg-[#2BC6FF]/25 blur-[110px]"
                    duration={19}
                    drift={50}
                />
                <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.85),transparent)]" />
            </div>

            <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-32 sm:px-8 sm:pb-20 sm:pt-40">
                <motion.p
                    {...fade(0.05)}
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold text-[#0C1A2E] ${glass}`}
                >
                    <span className="h-2 w-2 rounded-full bg-gradient-to-br from-[#2BA6FF] to-[#0971ED]" />
                    {eyebrow}
                </motion.p>

                <motion.h1
                    {...fade(0.15)}
                    className="mt-6 max-w-3xl font-[family-name:var(--font-display)] text-[clamp(2.5rem,7vw,5.25rem)] font-semibold leading-[1] tracking-[-0.04em]"
                >
                    {title}
                </motion.h1>

                <motion.p
                    {...fade(0.3)}
                    className="mt-6 max-w-2xl text-lg leading-8 text-[#0C1A2E]/70 sm:text-xl sm:leading-9"
                >
                    {intro}
                </motion.p>

                {children && <motion.div {...fade(0.45)}>{children}</motion.div>}
            </div>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* Feature card (used on Services)                                            */
/* -------------------------------------------------------------------------- */

export function FeatureCard({
    visual,
    tag,
    title,
    text,
}: {
    visual: ReactNode;
    tag: string;
    title: string;
    text: string;
}) {
    return (
        <motion.article
            variants={item}
            whileHover={{ y: -6 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="group flex flex-col rounded-[2rem] border border-white bg-white/80 p-3 shadow-[0_20px_50px_-30px_rgba(9,113,237,0.35)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_30px_60px_-28px_rgba(9,113,237,0.45)]"
        >
            <div className="relative flex min-h-[200px] items-center justify-center overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#DCEBFF] via-[#EAF3FF] to-[#F2F7FD] p-6">
                <div
                    aria-hidden="true"
                    className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#2BC6FF]/30 blur-3xl"
                />
                <div className="relative flex w-full justify-center">{visual}</div>
            </div>

            <div className="px-3 pb-4 pt-6 sm:px-4">
                <span className="rounded-full bg-[#0971ED]/10 px-3 py-1 text-xs font-semibold text-[#0971ED]">
                    {tag}
                </span>

                <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
                    {title}
                </h3>

                <p className="mt-3 text-base leading-7 text-[#0C1A2E]/65">{text}</p>
            </div>
        </motion.article>
    );
}