"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, MessageCircle, UserPlus } from "lucide-react";
import { ease, focusRing, glass } from "@/app/components/dashboard/dashboard-ui";

export default function ConversationsPage() {
    const reduce = useReducedMotion();

    const float = (duration: number, amount: number) =>
        reduce
            ? {}
            : {
                  animate: { y: [0, -amount, 0] },
                  transition: { duration, repeat: Infinity, ease: "easeInOut" as const },
              };

    return (
        <div className="hidden h-full flex-col items-center justify-center px-8 text-center md:flex">
            {/* Illustration */}
            <div className="relative h-44 w-72" aria-hidden="true">
                <div className="absolute inset-6 rounded-full bg-[#0971ED]/25 blur-3xl" />

                <motion.div
                    initial={reduce ? false : { opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7, ease }}
                    className="absolute left-0 top-2"
                >
                    <motion.div
                        {...float(5, 6)}
                        className={`flex items-center gap-2.5 rounded-2xl rounded-bl-md px-4 py-3 text-sm ${glass}`}
                    >
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Are we still on for 4?
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={reduce ? false : { opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7, delay: 0.2, ease }}
                    className="absolute bottom-2 right-0"
                >
                    <motion.div
                        {...float(6, 8)}
                        className="rounded-2xl rounded-br-md bg-gradient-to-b from-[#2B8CF5] to-[#0971ED] px-4 py-3 text-sm text-white shadow-[0_12px_30px_-10px_rgba(9,113,237,0.7)]"
                    >
                        Yes, sending the link now
                    </motion.div>
                </motion.div>

                <motion.span
                    initial={reduce ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.5 }}
                    className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.5rem] bg-white text-[#0971ED] shadow-[0_16px_40px_-12px_rgba(9,113,237,0.5)] ring-1 ring-[#0971ED]/10"
                >
                    <MessageCircle size={28} aria-hidden="true" />
                </motion.span>
            </div>

            <motion.div
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease }}
            >
                <h2 className="mt-8 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
                    A little closer, wherever you are.
                </h2>

                <p className="mx-auto mt-2 max-w-sm text-[15px] leading-7 text-[#0C1A2E]/60">
                    Choose a conversation to pick up where you left off, or find
                    someone new to connect with.
                </p>

                <motion.div className="mt-6 inline-block" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                    <Link
                        href="/dashboard/discover"
                        className={`inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-b from-[#2B8CF5] to-[#0971ED] px-6 text-[15px] font-semibold text-white shadow-[0_12px_28px_-10px_rgba(9,113,237,0.7)] ${focusRing}`}
                    >
                        <UserPlus size={20} aria-hidden="true" />
                        Find people
                    </Link>
                </motion.div>

                <p
                    className={`mx-auto mt-10 flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs text-[#0C1A2E]/55 ${glass}`}
                >
                    <Lock size={13} aria-hidden="true" />
                    Your personal conversations stay in sync across devices
                </p>
            </motion.div>
        </div>
    );
}