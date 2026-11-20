import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/app/components/public/public-shell";
import {
    Blob,
    FeatureCard,
    PageHero,
    Press,
    Reveal,
    Stagger,
} from "@/app/components/public/public-ui";

export const metadata: Metadata = {
    title: "Services | Miyor",
    description:
        "Miyor brings everyday messaging and face-to-face conversations into a single, cross-device workspace.",
};

export default function ServicesPage() {
    return (
        <PublicShell>
            <PageHero
                eyebrow="Services"
                title="One place to connect"
                intro="MIYOR brings everyday messaging and face-to-face conversations into a single, cross-device workspace."
            />

            <section className="relative overflow-x-clip bg-gradient-to-b from-[#F2F7FD] to-white pb-20 sm:pb-28">
                <Blob
                    className="-left-40 top-20 h-[420px] w-[420px] bg-[#0971ED]/10 blur-[120px]"
                    duration={25}
                />

                <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
                    <Stagger className="grid gap-5 md:grid-cols-2">
                        <FeatureCard
                            visual={<ChatVisual />}
                            tag="Messaging"
                            title="Private conversations"
                            text="Start a conversation, share messages, reply in context, and edit or remove your own messages. Unread counts help bring new conversations back into view."
                        />

                        <FeatureCard
                            visual={<CallVisual />}
                            tag="Calls"
                            title="Voice and video calls"
                            text="Call other MIYOR members, manage your camera and microphone, and use meeting controls from desktop or mobile browsers. Guests can join invited meetings without a full account where guest access is enabled."
                        />

                        <FeatureCard
                            visual={<EffectVisual />}
                            tag="Effects"
                            title="Expressive video"
                            text="Choose a reference image for a playful, live face transformation that follows your movement. Use effects openly and with permission from the person represented."
                        />

                        <FeatureCard
                            visual={<InstallVisual />}
                            tag="Everywhere"
                            title="Installable web app"
                            text="Add MIYOR to a supported device for an app-like experience. Once installed and subscribed, supported browsers can show call notifications while MIYOR is closed. Device and browser support varies."
                        />
                    </Stagger>

                    {/* Call to action */}
                    <Reveal className="mt-16 sm:mt-24">
                        <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0658C4_0%,#0971ED_45%,#2BA6FF_100%)] px-6 py-12 text-white shadow-[0_40px_80px_-30px_rgba(9,113,237,0.6)] sm:rounded-[2.5rem] sm:px-14 sm:py-20">
                            <Blob
                                className="-right-20 -top-24 h-[320px] w-[320px] bg-white/30 blur-[90px]"
                                duration={16}
                            />
                            <Blob
                                className="-bottom-32 left-1/4 h-[280px] w-[380px] bg-[#062B5B]/40 blur-[100px]"
                                duration={21}
                            />
                            <div
                                aria-hidden="true"
                                className="absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_0%,rgba(255,255,255,0.22),transparent)]"
                            />

                            <div className="relative">
                                <h2 className="max-w-2xl font-[family-name:var(--font-display)] text-3xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                                    Ready when you are.
                                </h2>

                                <p className="mt-4 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
                                    Create your account and start your first
                                    conversation, or read the terms first.
                                </p>

                                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <Press>
                                        <Link
                                            href="/signup"
                                            className="inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-[#0971ED] shadow-[0_12px_30px_-10px_rgba(6,43,91,0.5)] transition-colors hover:bg-[#F2F7FD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
                                        >
                                            Create your account
                                        </Link>
                                    </Press>

                                    <Link
                                        href="/terms"
                                        className="inline-flex items-center justify-center rounded-full px-6 py-4 text-base font-semibold text-white underline decoration-white/40 underline-offset-[6px] transition-colors hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                    >
                                        Read the terms
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>
        </PublicShell>
    );
}

/* -------------------------------------------------------------------------- */
/* Card visuals                                                               */
/* -------------------------------------------------------------------------- */

function ChatVisual() {
    return (
        <div className="w-full max-w-[280px] space-y-2.5 text-[13px]" aria-hidden="true">
            <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-white bg-white px-3.5 py-2.5 shadow-sm">
                Are we still on for 4?
            </div>

            <div className="ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-gradient-to-b from-[#2B8CF5] to-[#0971ED] px-3.5 py-2.5 text-white shadow-[0_8px_20px_-8px_rgba(9,113,237,0.6)]">
                Yes, sending the link now
            </div>

            <div className="flex items-center gap-2 pl-1">
                <span className="rounded-full bg-[#0971ED] px-2 py-0.5 text-[11px] font-semibold text-white">
                    2
                </span>
                <span className="text-[11px] text-[#0C1A2E]/55">unread</span>
            </div>
        </div>
    );
}

function CallVisual() {
    return (
        <div
            className="relative aspect-[4/3] w-full max-w-[280px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B4A9E] to-[#062B5B] shadow-[0_20px_40px_-16px_rgba(6,43,91,0.6)]"
            aria-hidden="true"
        >
            <div className="absolute left-1/2 top-[42%] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/10 text-2xl font-semibold text-white backdrop-blur">
                A
            </div>

            <div className="absolute right-3 top-3 flex h-12 w-9 items-center justify-center rounded-lg border border-white/25 bg-[#FFE7C7]/90 text-[10px] font-semibold text-[#5A3A22]">
                You
            </div>

            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
                <span className="h-8 w-8 rounded-full border border-white/20 bg-white/15 backdrop-blur" />
                <span className="h-8 w-8 rounded-full border border-white/20 bg-white/15 backdrop-blur" />
                <span className="h-8 w-14 rounded-full bg-gradient-to-b from-[#F0646A] to-[#E5484D]" />
            </div>
        </div>
    );
}

function EffectVisual() {
    return (
        <div className="flex items-center gap-4" aria-hidden="true">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#0971ED]/40 bg-[#FFE7C7] text-sm font-semibold text-[#5A3A22]">
                Image
            </div>

            <svg
                className="h-6 w-6 text-[#0971ED]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>

            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#2BA6FF] to-[#0971ED] shadow-[0_12px_30px_-8px_rgba(9,113,237,0.6)]">
                <svg
                    className="h-8 w-8 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
                </svg>

                <span className="absolute -bottom-2 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-[#0971ED] shadow">
                    Live
                </span>
            </div>
        </div>
    );
}

function InstallVisual() {
    return (
        <div
            className="w-full max-w-[280px] rounded-2xl border border-white bg-white/85 p-3.5 shadow-[0_16px_36px_-14px_rgba(9,113,237,0.4)] backdrop-blur"
            aria-hidden="true"
        >
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2BA6FF] to-[#0971ED] text-base font-bold text-white">
                    M
                </span>

                <span className="min-w-0 text-sm leading-tight">
                    <span className="block font-semibold">Incoming call</span>
                    <span className="block truncate text-xs text-[#0C1A2E]/55">
                        Amara is calling on MIYOR
                    </span>
                </span>

                <span className="ml-auto text-[10px] text-[#0C1A2E]/40">now</span>
            </div>
        </div>
    );
}