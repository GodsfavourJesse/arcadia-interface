"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { CallWithOwnParticipant } from "@/app/types/calls/calls.types";

/*
 * Shared building blocks for the Miyor dashboard.
 * Tokens: blue #0971ED, sky #2BA6FF, deep #062B5B, ink #0C1A2E, mist #F2F7FD
 */

export const ease = [0.22, 1, 0.36, 1] as const;

export const glass =
    "border border-white/70 bg-white/65 backdrop-blur-xl shadow-[0_8px_32px_-12px_rgba(9,113,237,0.18)]";

export const focusRing =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0971ED]";

/* -------------------------------------------------------------------------- */
/* Formatting helpers                                                         */
/* -------------------------------------------------------------------------- */

export function formatListTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();

    if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    const days = (now.getTime() - d.getTime()) / 86_400_000;

    return days < 7
        ? d.toLocaleDateString([], { weekday: "short" })
        : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function dayLabel(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

    return d.toLocaleDateString([], { dateStyle: "medium" });
}

export const isMissed = (entry: CallWithOwnParticipant) =>
    entry.call.state === "missed" || entry.participant.state === "missed";

export const callStateLabel = (entry: CallWithOwnParticipant) =>
    isMissed(entry)
        ? "Missed"
        : entry.call.state.charAt(0).toUpperCase() + entry.call.state.slice(1);

/* -------------------------------------------------------------------------- */
/* Avatar                                                                     */
/* -------------------------------------------------------------------------- */

const avatarTones = [
    "from-[#2BA6FF] to-[#0971ED]",
    "from-[#8B9CFF] to-[#5B6CF0]",
    "from-[#4FE0CB] to-[#0E9F8E]",
    "from-[#FFC27A] to-[#F08A24]",
    "from-[#FF9DB8] to-[#E0457B]",
];

export function Avatar({
    name,
    src,
    size = 44,
    className = "",
}: {
    name?: string | null;
    src?: string | null;
    size?: number;
    className?: string;
}) {
    const [failed, setFailed] = useState(false);
    const label = (name ?? "").trim() || "Miyor";
    const initials =
        label
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join("") || "M";
    const tone =
        avatarTones[
            [...label].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) %
                avatarTones.length
        ];

    return (
        <span
            style={{ width: size, height: size, fontSize: size * 0.38 }}
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-white/80 ${tone} ${className}`}
        >
            {src && !failed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src}
                    alt=""
                    onError={() => setFailed(true)}
                    className="h-full w-full object-cover"
                />
            ) : (
                initials
            )}
        </span>
    );
}

/* -------------------------------------------------------------------------- */
/* Icon tile                                                                  */
/* -------------------------------------------------------------------------- */

const tones = {
    blue: "from-[#2BA6FF] to-[#0971ED] shadow-[0_8px_18px_-6px_rgba(9,113,237,0.55)]",
    violet: "from-[#8B9CFF] to-[#5B6CF0] shadow-[0_8px_18px_-6px_rgba(91,108,240,0.5)]",
    teal: "from-[#4FE0CB] to-[#0E9F8E] shadow-[0_8px_18px_-6px_rgba(14,159,142,0.5)]",
    amber: "from-[#FFC27A] to-[#F08A24] shadow-[0_8px_18px_-6px_rgba(240,138,36,0.5)]",
    rose: "from-[#FF9DB8] to-[#E0457B] shadow-[0_8px_18px_-6px_rgba(224,69,123,0.5)]",
};

export function IconTile({
    icon: Icon,
    tone = "blue",
    size = "md",
}: {
    icon: LucideIcon;
    tone?: keyof typeof tones;
    size?: "sm" | "md";
}) {
    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br text-white ${tones[tone]} ${
                size === "sm" ? "h-10 w-10 rounded-xl" : "h-12 w-12 rounded-2xl"
            }`}
        >
            <Icon size={size === "sm" ? 20 : 22} strokeWidth={2} aria-hidden="true" />
        </span>
    );
}

/* -------------------------------------------------------------------------- */
/* Layout pieces                                                              */
/* -------------------------------------------------------------------------- */

export function Page({
    children,
    className = "",
    width = "max-w-5xl",
}: {
    children: ReactNode;
    className?: string;
    width?: string;
}) {
    return (
        <main
            className={`mx-auto w-full ${width} px-4 pb-32 pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:px-6 md:px-8 md:pb-12 md:pt-10 ${className}`}
        >
            {children}
        </main>
    );
}

export function PageHeader({
    title,
    subtitle,
    actions,
}: {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
}) {
    const reduce = useReducedMotion();

    return (
        <motion.header
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="mb-6 flex items-end justify-between gap-4 md:mb-8"
        >
            <div className="min-w-0">
                <h1 className="font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-none tracking-[-0.03em] md:text-[2.5rem]">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-2 text-sm leading-6 text-[#0C1A2E]/60 md:text-[15px]">
                        {subtitle}
                    </p>
                )}
            </div>

            {actions && <div className="shrink-0">{actions}</div>}
        </motion.header>
    );
}

export function Surface({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`rounded-3xl ${glass} ${className}`}>{children}</div>
    );
}

export function SectionTitle({
    title,
    description,
    href,
    linkLabel = "View all",
}: {
    title: string;
    description?: string;
    href?: string;
    linkLabel?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
            <div className="min-w-0">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                    {title}
                </h2>
                {description && (
                    <p className="mt-0.5 text-xs text-[#0C1A2E]/55">{description}</p>
                )}
            </div>

            {href && (
                <Link
                    href={href}
                    className={`flex shrink-0 items-center gap-0.5 rounded-full px-2.5 py-1.5 text-sm font-semibold text-[#0971ED] transition-colors hover:bg-[#0971ED]/10 ${focusRing}`}
                >
                    {linkLabel}
                    <ChevronRight size={16} aria-hidden="true" />
                </Link>
            )}
        </div>
    );
}

export function EmptyState({
    icon: Icon,
    title,
    text,
    action,
}: {
    icon: LucideIcon;
    title: string;
    text: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-[#DCEBFF] to-[#F2F7FD] text-[#0971ED] ring-1 ring-white">
                <Icon size={28} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-[family-name:var(--font-display)] text-lg font-semibold">
                {title}
            </h3>
            <p className="mt-1.5 max-w-xs text-sm leading-6 text-[#0C1A2E]/55">
                {text}
            </p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div
            aria-hidden="true"
            className={`animate-pulse rounded-xl bg-[#0C1A2E]/[0.07] ${className}`}
        />
    );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-1 p-3" aria-busy="true" aria-label="Loading">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl p-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-1/3" />
                        <Skeleton className="h-3 w-3/4" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Motion                                                                     */
/* -------------------------------------------------------------------------- */

const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
};

export function StaggerList({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    const reduce = useReducedMotion();

    return (
        <motion.div
            className={className}
            variants={container}
            initial={reduce ? false : "hidden"}
            animate="show"
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div className={className} variants={item}>
            {children}
        </motion.div>
    );
}

/** Springy press and hover feedback for cards and buttons. */
export function Tap({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            className={className}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
        >
            {children}
        </motion.div>
    );
}