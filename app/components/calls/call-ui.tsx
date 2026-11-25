"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import { Avatar } from "@/app/components/dashboard/dashboard-ui";

/*
 * Shared pieces for the calling screens (overlay, incoming, outgoing).
 * Everything reads the app's appearance setting, so the Light / Dark switch
 * in Settings controls how calls look.
 */

export function useCallTheme() {
    const { theme } = useTheme();
    const dark = theme === "dark";

    return {
        dark,
        screen: dark ? "bg-[#07111F] text-white" : "bg-[#F2F7FD] text-[#0C1A2E]",
        backdrop: dark
            ? "bg-[radial-gradient(120%_80%_at_50%_0%,#0B4A9E_0%,#07111F_62%)]"
            : "bg-[radial-gradient(120%_80%_at_50%_0%,#CFE3FB_0%,#F2F7FD_55%,#FFFFFF_100%)]",
        muted: dark ? "text-white/60" : "text-[#0C1A2E]/60",
        faint: dark ? "text-white/45" : "text-[#0C1A2E]/45",
        dock: dark
            ? "border-white/10 bg-[#0B1B33]/70 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]"
            : "border-white/80 bg-white/75 shadow-[0_24px_60px_-24px_rgba(6,43,91,0.4)]",
        sheet: dark
            ? "border-white/10 bg-[#0B1B33]/90"
            : "border-white/90 bg-white/90",
        chip: dark
            ? "border-white/10 bg-white/10 text-white/80"
            : "border-white/80 bg-white/70 text-[#0C1A2E]/70",
        line: dark ? "border-white/10" : "border-[#0C1A2E]/10",
        field: dark
            ? "border-white/10 bg-white/5 text-white/80"
            : "border-[#0C1A2E]/10 bg-[#F2F7FD] text-[#0C1A2E]/75",
        ghostBtn: dark
            ? "border-white/15 text-white/85 hover:bg-white/10"
            : "border-[#0C1A2E]/15 text-[#0C1A2E]/80 hover:bg-[#0C1A2E]/5",
    };
}

/* -------------------------------------------------------------------------- */

export function CallBackdrop() {
    const t = useCallTheme();

    return (
        <div aria-hidden="true" className={`absolute inset-0 ${t.backdrop}`}>
            <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#0971ED]/25 blur-[90px]" />
            <div className="absolute -right-24 bottom-24 h-72 w-72 rounded-full bg-[#2BC6FF]/25 blur-[90px]" />
        </div>
    );
}

export function CallBrand({ className = "" }: { className?: string }) {
    const t = useCallTheme();

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[11px] font-semibold backdrop-blur-xl ${t.chip} ${className}`}
        >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#2BA6FF] to-[#0971ED] text-[10px] font-bold text-white">
                M
            </span>
            Miyor
        </span>
    );
}

/** Avatar with soft ripple rings while a call is ringing or connecting. */
export function CallAvatar({
    name,
    src,
    size = 132,
    ripple = false,
}: {
    name?: string | null;
    src?: string | null;
    size?: number;
    ripple?: boolean;
}) {
    const reduce = useReducedMotion();

    return (
        <div
            className="relative flex items-center justify-center"
            style={{ width: size, height: size }}
        >
            {ripple &&
                !reduce &&
                [0, 1, 2].map((i) => (
                    <motion.span
                        key={i}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-full border border-[#0971ED]/40 bg-[#0971ED]/10"
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{
                            duration: 2.6,
                            repeat: Infinity,
                            delay: i * 0.85,
                            ease: "easeOut",
                        }}
                    />
                ))}

            <div className="relative rounded-full shadow-[0_20px_50px_-12px_rgba(9,113,237,0.55)]">
                <Avatar name={name} src={src} size={size} className="!ring-4" />
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */

type Tone = "neutral" | "off" | "accent" | "danger" | "accept";

export function CallButton({
    icon: Icon,
    label,
    onClick,
    tone = "neutral",
    size = "md",
    disabled,
    loading,
    caption,
}: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    tone?: Tone;
    size?: "md" | "lg";
    disabled?: boolean;
    loading?: boolean;
    caption?: string;
}) {
    const t = useCallTheme();

    const tones: Record<Tone, string> = {
        neutral: t.dark
            ? "bg-white/10 text-white hover:bg-white/20"
            : "bg-white text-[#0C1A2E] shadow-sm ring-1 ring-[#0C1A2E]/5 hover:bg-[#F2F7FD]",
        off: t.dark ? "bg-white text-[#0C1A2E]" : "bg-[#0C1A2E] text-white",
        accent: "bg-[#0971ED] text-white shadow-[0_10px_24px_-8px_rgba(9,113,237,0.7)]",
        danger:
            "bg-[#E5484D] text-white shadow-[0_14px_30px_-10px_rgba(229,72,77,0.75)] hover:bg-[#EE5A5F]",
        accept:
            "bg-emerald-500 text-white shadow-[0_14px_30px_-10px_rgba(16,185,129,0.75)] hover:bg-emerald-400",
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <motion.button
                type="button"
                onClick={onClick}
                disabled={disabled}
                aria-label={label}
                title={label}
                whileTap={disabled ? undefined : { scale: 0.9 }}
                whileHover={disabled ? undefined : { scale: 1.04 }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
                className={`flex items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0971ED] disabled:cursor-not-allowed disabled:opacity-50 ${
                    size === "lg" ? "h-16 w-16" : "h-12 w-12"
                } ${tones[tone]}`}
            >
                {loading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                    <Icon size={size === "lg" ? 26 : 20} strokeWidth={2} aria-hidden="true" />
                )}
            </motion.button>

            {caption && (
                <span className={`text-[11px] font-medium ${t.muted}`}>{caption}</span>
            )}
        </div>
    );
}

export function StatusDots() {
    const reduce = useReducedMotion();

    return (
        <span aria-hidden="true" className="ml-0.5 inline-flex gap-0.5">
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    className="inline-block h-1 w-1 rounded-full bg-current"
                    animate={reduce ? undefined : { opacity: [0.25, 1, 0.25] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
            ))}
        </span>
    );
}

export function CallScreen({
    children,
    label,
    zIndex = "z-[110]",
}: {
    children: ReactNode;
    label: string;
    zIndex?: string;
}) {
    const t = useCallTheme();

    return (
        <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`fixed inset-0 overflow-hidden ${zIndex} ${t.screen}`}
        >
            <CallBackdrop />
            {children}
        </motion.div>
    );
}