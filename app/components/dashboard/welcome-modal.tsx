"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Link2, MessageCircle, Video, X } from "lucide-react";

type WelcomeModalProps = {
    open: boolean;
    onClose: () => void;
};

const features = [
    {
        icon: Video,
        tone: "from-[#2BA6FF] to-[#0971ED]",
        title: "Make calls from anywhere",
        text: "Start a conversation and invite people with a simple link.",
    },
    {
        icon: Link2,
        tone: "from-[#8B9CFF] to-[#5B6CF0]",
        title: "One link. Any conversation.",
        text: "Share your call wherever your people already connect.",
    },
    {
        icon: MessageCircle,
        tone: "from-[#4FE0CB] to-[#0E9F8E]",
        title: "Built for real conversations",
        text: "Your calls are designed to feel personal, simple, and connected.",
    },
];

export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
    const reduce = useReducedMotion();
    const ctaRef = useRef<HTMLButtonElement>(null);

    /* Close on Escape, lock page scroll, and focus the primary action */
    useEffect(() => {
        if (!open) return;

        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        const previous = document.body.style.overflow;

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        const focus = window.setTimeout(() => ctaRef.current?.focus(), 250);

        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
            window.clearTimeout(focus);
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <div
                    className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="welcome-title"
                >
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#062B5B]/50 backdrop-blur-md"
                    />

                    {/* Sheet / dialog */}
                    <motion.div
                        key="panel"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 80, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 60, scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] border border-white/70 bg-white/85 shadow-[0_40px_100px_-30px_rgba(6,43,91,0.6)] backdrop-blur-2xl sm:rounded-[2rem]"
                    >
                        {/* Ambient colour */}
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#0971ED]/25 blur-3xl"
                        />
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-[#2BC6FF]/20 blur-3xl"
                        />

                        {/* Grab handle (mobile) */}
                        <div className="relative flex justify-center pt-3 sm:hidden" aria-hidden="true">
                            <span className="h-1.5 w-10 rounded-full bg-[#0C1A2E]/15" />
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close welcome message"
                            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-[#0C1A2E]/50 transition-colors hover:bg-[#0C1A2E]/5 hover:text-[#0C1A2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0971ED]"
                        >
                            <X size={20} aria-hidden="true" />
                        </button>

                        <div className="relative px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:px-8 sm:pb-8 sm:pt-8">
                            {/* Miyor mark */}
                            <motion.div
                                initial={reduce ? false : { scale: 0.6, rotate: -8 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
                                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2BA6FF] to-[#0971ED] text-2xl font-bold text-white shadow-[0_16px_36px_-10px_rgba(9,113,237,0.7)]"
                            >
                                M
                            </motion.div>

                            <div className="mt-6">
                                <span className="inline-flex items-center gap-2 rounded-full bg-[#0971ED]/10 px-3 py-1 text-xs font-semibold text-[#0971ED]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#0971ED]" />
                                    Welcome to Miyor
                                </span>

                                <h2
                                    id="welcome-title"
                                    className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-[-0.03em] sm:text-4xl"
                                >
                                    Be there, anywhere.
                                </h2>

                                <p className="mt-3 text-base leading-7 text-[#0C1A2E]/65">
                                    Your account is ready. Miyor gives you a simple
                                    way to bring people together from wherever they
                                    are.
                                </p>
                            </div>

                            <ul className="mt-7 space-y-3">
                                {features.map((f, i) => {
                                    const Icon = f.icon;

                                    return (
                                        <motion.li
                                            key={f.title}
                                            initial={reduce ? false : { opacity: 0, y: 14 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 + i * 0.08, duration: 0.45 }}
                                            className="flex items-start gap-3.5 rounded-2xl border border-white/80 bg-white/70 p-4"
                                        >
                                            <span
                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${f.tone}`}
                                            >
                                                <Icon size={20} aria-hidden="true" />
                                            </span>

                                            <span>
                                                <strong className="block text-[15px] font-semibold">
                                                    {f.title}
                                                </strong>
                                                <span className="mt-0.5 block text-sm leading-5 text-[#0C1A2E]/60">
                                                    {f.text}
                                                </span>
                                            </span>
                                        </motion.li>
                                    );
                                })}
                            </ul>

                            <motion.button
                                ref={ctaRef}
                                type="button"
                                onClick={onClose}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#2B8CF5] to-[#0971ED] text-base font-semibold text-white shadow-[0_14px_30px_-10px_rgba(9,113,237,0.7),inset_0_1px_0_rgba(255,255,255,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0971ED]"
                            >
                                Let’s get started
                                <ArrowRight size={20} aria-hidden="true" />
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}