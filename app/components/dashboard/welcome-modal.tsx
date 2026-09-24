"use client";

import { useEffect, useState } from "react";

type WelcomeModalProps = {
    open: boolean;
    onClose: () => void;
};

export function WelcomeModal({
    open,
    onClose,
}: WelcomeModalProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!open) {
            setVisible(false);
            return;
        }

        const frame = requestAnimationFrame(() => {
            setVisible(true);
        });

        return () => {
            cancelAnimationFrame(frame);
        };
    }, [open]);

    if (!open) {
        return null;
    }

    function handleClose() {
        setVisible(false);

        window.setTimeout(() => {
            onClose();
        }, 180);
    }

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm transition-opacity duration-200 ${
                visible ? "opacity-100" : "opacity-0"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
        >
            <div
                className={`relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl transition duration-200 ${
                    visible
                        ? "translate-y-0 scale-100"
                        : "translate-y-3 scale-[0.98]"
                }`}
            >
                {/* Decorative background */}
                <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/50 blur-3xl" />

                <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />

                {/* Close button */}
                <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close welcome message"
                    className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                    <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                    >
                        <path
                            d="M6 6l12 12M18 6L6 18"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>

                <div className="relative px-6 pb-7 pt-8 sm:px-8">
                    {/* Miyor mark */}
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-700 text-xl font-bold text-white shadow-xl shadow-indigo-200">
                        M
                    </div>

                    {/* Heading */}
                    <div className="mt-6">
                        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
                            Welcome to Miyor
                        </span>

                        <h2
                            id="welcome-title"
                            className="mt-4 text-3xl font-bold tracking-tight text-slate-950"
                        >
                            Be thee, Anywhere.
                        </h2>

                        <p className="mt-3 text-base leading-7 text-slate-600">
                            Your account is ready. Miyor gives you
                            a simple way to bring people together
                            from wherever they are.
                        </p>
                    </div>

                    {/* Features */}
                    <div className="mt-7 space-y-3">
                        {/* Feature 1 */}
                        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                                <svg
                                    className="h-5 w-5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M15 10l4.5-2.5v9L15 14"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />

                                    <rect
                                        x="3"
                                        y="6"
                                        width="12"
                                        height="12"
                                        rx="2"
                                    />
                                </svg>
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-slate-900">
                                    Make calls from anywhere
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Start a conversation and invite
                                    people with a simple link.
                                </p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                                <svg
                                    className="h-5 w-5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M12 3v18M3 12h18"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-slate-900">
                                    One link. Any conversation.
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Share your call wherever your
                                    people already connect.
                                </p>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                <svg
                                    className="h-5 w-5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M20 11.5a8.38 8.38 0 01-1 4.5l2 3-3.5-1.5a8.5 8.5 0 10.5-6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-slate-900">
                                    Built for real conversations
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Your calls are designed to feel
                                    personal, simple, and connected.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <button
                        type="button"
                        onClick={handleClose}
                        className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-900 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200/40 transition hover:-translate-y-0.5 hover:shadow-xl"
                    >
                        Let's get started

                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                        >
                            <path
                                d="M5 12h14"
                                strokeLinecap="round"
                            />

                            <path
                                d="m13 6 6 6-6 6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}