"use client";

import Link from "next/link";

export default function HomePage() {
    return <PublicHome />;
}

function PublicHome() {
    return (
        <main className="min-h-screen overflow-hidden bg-white text-slate-950">
            {/* Navigation */}
            <header className="relative z-30">
                <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
                    <Link
                        href="/"
                        className="group flex items-center gap-3"
                    >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-lg font-bold text-white shadow-lg shadow-slate-950/10 transition duration-200 group-hover:scale-105">
                            M
                        </span>

                        <span className="text-xl font-semibold tracking-tight">
                            Miyor
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-8 md:flex">
                        <a
                            href="#how-it-works"
                            className="text-sm font-medium text-slate-500 transition hover:text-slate-950"
                        >
                            How it works
                        </a>

                        <a
                            href="#experience"
                            className="text-sm font-medium text-slate-500 transition hover:text-slate-950"
                        >
                            Experience
                        </a>

                        <a
                            href="#about"
                            className="text-sm font-medium text-slate-500 transition hover:text-slate-950"
                        >
                            About
                        </a>
                    </nav>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link
                            href="/login"
                            className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:block"
                        >
                            Sign in
                        </Link>

                        <Link
                            href="/signup"
                            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800"
                        >
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="relative">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute left-1/2 top-[-220px] h-[620px] w-[1000px] -translate-x-1/2 rounded-full bg-indigo-100/60 blur-3xl" />

                    <div className="absolute right-[-220px] top-[280px] h-[450px] w-[450px] rounded-full bg-purple-100/50 blur-3xl" />

                    <div className="absolute left-[-220px] top-[520px] h-[400px] w-[400px] rounded-full bg-blue-100/40 blur-3xl" />
                </div>

                <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-14 sm:px-8 sm:pt-20 lg:px-10 lg:pb-32 lg:pt-24">
                    <div className="mx-auto max-w-5xl text-center">
                        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm backdrop-blur">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>

                            Face-to-face, wherever you are
                        </div>

                        <h1 className="text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[92px]">
                            Be there,
                            <br />
                            <span className="bg-gradient-to-r from-slate-950 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                                Anywhere.
                            </span>
                        </h1>

                        <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-500 sm:text-xl">
                            Miyor makes it easy to have a real conversation
                            with someone, wherever life puts you. Create a
                            call, share one link, and meet face-to-face from
                            the browser.
                        </p>

                        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <Link
                                href="/signup"
                                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-7 py-4 text-sm font-semibold text-white shadow-xl shadow-slate-950/15 transition duration-200 hover:-translate-y-1 hover:bg-slate-800 sm:w-auto"
                            >
                                Create a call

                                <svg
                                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10.293 3.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-3.293-3.293a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </Link>

                            <a
                                href="#how-it-works"
                                className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-semibold text-slate-700 shadow-sm transition duration-200 hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                            >
                                See how it works
                            </a>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1.5">
                                <CheckIcon />
                                Guests join without an account
                            </span>

                            <span className="hidden h-3 w-px bg-slate-200 sm:block" />

                            <span className="flex items-center gap-1.5">
                                <CheckIcon />
                                No app required for guests
                            </span>
                        </div>
                    </div>

                    {/* Product preview */}
                    <div className="relative mx-auto mt-20 max-w-6xl lg:mt-24">
                        <div className="absolute -inset-8 rounded-[2.5rem] bg-gradient-to-r from-indigo-200/40 via-purple-200/30 to-blue-200/40 blur-3xl" />

                        <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-2xl shadow-slate-950/20">
                            {/* Browser bar */}
                            <div className="flex h-12 items-center justify-between border-b border-white/10 bg-slate-900 px-5">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                                </div>

                                <div className="hidden h-7 w-80 items-center justify-center rounded-md border border-white/5 bg-white/5 text-[10px] text-slate-500 sm:flex">
                                    miyor.com/c/your-invitation
                                </div>

                                <div className="w-12" />
                            </div>

                            {/* Call interface */}
                            <div className="grid min-h-[400px] bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/70 p-3 sm:min-h-[520px] sm:p-6">
                                <div className="relative min-h-[370px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 sm:min-h-0">
                                    {/* Main participant */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950">
                                        <div className="absolute inset-0 opacity-30">
                                            <div className="absolute left-[20%] top-[15%] h-48 w-48 rounded-full bg-indigo-500 blur-3xl" />
                                            <div className="absolute bottom-[10%] right-[15%] h-52 w-52 rounded-full bg-purple-500 blur-3xl" />
                                        </div>

                                        <div className="relative flex h-full items-center justify-center">
                                            <div className="relative">
                                                <div className="absolute -inset-5 rounded-full bg-indigo-500/20 blur-2xl" />

                                                <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/20 bg-white/10 text-4xl font-semibold text-white shadow-2xl backdrop-blur-xl">
                                                    M
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-xs font-medium text-white backdrop-blur-md">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                            Miyor
                                        </div>
                                    </div>

                                    {/* Self preview */}
                                    <div className="absolute right-3 top-3 h-28 w-22 overflow-hidden rounded-xl border border-white/20 bg-slate-800 shadow-xl sm:right-4 sm:top-4 sm:h-40 sm:w-32">
                                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-900 to-slate-800">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                                                You
                                            </div>
                                        </div>

                                        <div className="absolute bottom-2 left-2 rounded bg-black/30 px-2 py-1 text-[9px] text-white">
                                            You
                                        </div>
                                    </div>

                                    {/* Call status */}
                                    <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[10px] text-slate-300 backdrop-blur-md">
                                        Connected
                                    </div>

                                    {/* Controls */}
                                    <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/10 bg-black/40 p-2 backdrop-blur-xl">
                                        <CallButton icon="mic" />
                                        <CallButton icon="camera" />

                                        <div className="mx-1 h-7 w-px bg-white/10" />

                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-lg">
                                            <svg
                                                className="h-4 w-4"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <path d="M10.68 13.31a16 16 0 01-4.3-4.3l-1.35 1.35a2 2 0 00-.29 2.45 15.87 15.87 0 007.44 7.44 2 2 0 002.45-.29l1.35-1.35a16 16 0 01-4.3-4.3z" />
                                                <path d="M14.7 9.3l5-5" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust strip */}
            <section className="border-y border-slate-100 bg-slate-50/70">
                <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-slate-200 sm:grid-cols-4">
                    <TrustItem
                        value="1 link"
                        label="One invitation to share"
                    />

                    <TrustItem
                        value="Web"
                        label="Guests join in their browser"
                    />

                    <TrustItem
                        value="1:1"
                        label="Designed for real conversations"
                    />

                    <TrustItem
                        value="Simple"
                        label="No unnecessary setup"
                    />
                </div>
            </section>

            {/* How it works */}
            <section
                id="how-it-works"
                className="scroll-mt-20 bg-white py-24 sm:py-32"
            >
                <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                    <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                        <div>
                            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
                                How it works
                            </span>

                            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-5xl">
                                Less setup.
                                <br />
                                More conversation.
                            </h2>
                        </div>

                        <p className="max-w-xl text-lg leading-8 text-slate-500 lg:ml-auto">
                            Miyor keeps the path from “let's talk” to actually
                            talking remarkably short. Create a call, send the
                            invitation, and meet in the browser.
                        </p>
                    </div>

                    <div className="mt-16 grid gap-5 md:grid-cols-3">
                        <StepCard
                            number="01"
                            title="Create a call"
                            description="Sign in and create a call. Miyor gives you a unique invitation link to share."
                            icon="plus"
                        />

                        <StepCard
                            number="02"
                            title="Send the link"
                            description="Share your invitation through the places where you already communicate."
                            icon="share"
                        />

                        <StepCard
                            number="03"
                            title="Meet face-to-face"
                            description="Your guest opens the link, allows their camera and microphone, and joins."
                            icon="video"
                        />
                    </div>
                </div>
            </section>

            {/* Experience */}
            <section
                id="experience"
                className="scroll-mt-20 bg-slate-950 py-24 text-white sm:py-32"
            >
                <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
                    <div className="grid items-center gap-16 lg:grid-cols-2">
                        <div>
                            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">
                                The Miyor experience
                            </span>

                            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                                Technology should stay out of the way.
                            </h2>

                            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
                                Miyor is designed around the conversation, not
                                around the software. The goal is simple:
                                make it easy for someone to be there.
                            </p>

                            <div className="mt-10 space-y-6">
                                <FeatureItem
                                    title="Guests can join without registration"
                                    description="Send an invitation and your guest can enter from their browser without creating an account."
                                />

                                <FeatureItem
                                    title="One invitation link"
                                    description="Create a call once and share the same Miyor invitation wherever you normally communicate."
                                />

                                <FeatureItem
                                    title="Built for the browser"
                                    description="The experience is designed to work across modern devices without requiring a separate guest app."
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 rounded-[2rem] bg-indigo-500/10 blur-3xl" />

                            <div className="relative rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur sm:p-5">
                                <div className="rounded-[1.5rem] border border-white/10 bg-slate-900 p-5 sm:p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium tracking-wider text-slate-500">
                                                MIYOR CALL
                                            </p>

                                            <p className="mt-1 text-sm font-medium">
                                                Your invitation
                                            </p>
                                        </div>

                                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                            Ready
                                        </span>
                                    </div>

                                    <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950 p-5">
                                        <p className="text-xs text-slate-500">
                                            Invitation link
                                        </p>

                                        <div className="mt-3 flex items-center gap-3">
                                            <div className="min-w-0 flex-1 rounded-xl bg-white/5 px-4 py-3">
                                                <p className="truncate text-sm text-slate-300">
                                                    miyor.com/c/••••••••••
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                className="rounded-xl bg-white px-4 py-3 text-xs font-semibold text-slate-950 transition hover:bg-slate-200"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex items-center gap-3">
                                        <div className="flex -space-x-2">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-900 bg-indigo-500 text-xs font-semibold">
                                                Y
                                            </div>

                                            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-900 bg-purple-500 text-xs font-semibold">
                                                G
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium text-slate-300">
                                                Waiting for your guest
                                            </p>

                                            <p className="mt-0.5 text-[11px] text-slate-600">
                                                They'll join from the link
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About / CTA */}
            <section
                id="about"
                className="scroll-mt-20 bg-white py-24 sm:py-32"
            >
                <div className="mx-auto max-w-5xl px-5 text-center sm:px-8">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-2xl font-bold text-white shadow-xl">
                        M
                    </div>

                    <h2 className="mt-8 text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-5xl">
                        Distance doesn't have to mean absence.
                    </h2>

                    <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-500">
                        Miyor is built around a simple idea: when someone
                        matters, being there should feel easy.
                    </p>

                    <div className="mt-9">
                        <Link
                            href="/auth/signup"
                            className="group inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-7 py-4 text-sm font-semibold text-white shadow-xl shadow-slate-950/15 transition duration-200 hover:-translate-y-1 hover:bg-slate-800"
                        >
                            Start with Miyor

                            <svg
                                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10.293 3.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 010 1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-100 bg-slate-50">
                <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
                    <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-white">
                            M
                        </span>

                        <span className="text-sm font-semibold">
                            Miyor
                        </span>
                    </div>

                    <p className="text-xs text-slate-400">
                        Be there, Anywhere. © {new Date().getFullYear()} Miyor.
                    </p>

                    <div className="flex gap-5 text-xs text-slate-500">
                        <span>Privacy</span>
                        <span>Terms</span>
                        <span>Contact</span>
                    </div>
                </div>
            </footer>
        </main>
    );
}

function TrustItem({
    value,
    label,
}: {
    value: string;
    label: string;
}) {
    return (
        <div className="px-5 py-7 text-center">
            <p className="text-xl font-semibold tracking-tight text-slate-950">
                {value}
            </p>

            <p className="mt-1 text-xs text-slate-400">
                {label}
            </p>
        </div>
    );
}

function StepCard({
    number,
    title,
    description,
    icon,
}: {
    number: string;
    title: string;
    description: string;
    icon: "plus" | "share" | "video";
}) {
    return (
        <div className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-[0.18em] text-slate-400">
                    {number}
                </span>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-950 transition duration-200 group-hover:bg-slate-950 group-hover:text-white">
                    {icon === "plus" && (
                        <svg
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                    )}

                    {icon === "share" && (
                        <svg
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
                        </svg>
                    )}

                    {icon === "video" && (
                        <svg
                            className="h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <rect
                                x="3"
                                y="6"
                                width="13"
                                height="12"
                                rx="2"
                            />

                            <path d="M16 10l5-3v10l-5-3z" />
                        </svg>
                    )}
                </div>
            </div>

            <h3 className="mt-8 text-xl font-semibold tracking-tight">
                {title}
            </h3>

            <p className="mt-3 text-sm leading-7 text-slate-500">
                {description}
            </p>
        </div>
    );
}

function FeatureItem({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex gap-4">
            <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-300">
                <CheckIcon />
            </div>

            <div>
                <h3 className="font-semibold text-white">
                    {title}
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                    {description}
                </p>
            </div>
        </div>
    );
}

function CheckIcon() {
    return (
        <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
        >
            <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 11.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
            />
        </svg>
    );
}

function CallButton({
    icon,
}: {
    icon: "mic" | "camera";
}) {
    return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
            {icon === "mic" ? (
                <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <rect
                        x="9"
                        y="2"
                        width="6"
                        height="12"
                        rx="3"
                    />

                    <path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8" />
                </svg>
            ) : (
                <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path d="M15 10l4.5-2.5v9L15 14" />

                    <rect
                        x="3"
                        y="6"
                        width="12"
                        height="12"
                        rx="2"
                    />
                </svg>
            )}
        </div>
    );
}