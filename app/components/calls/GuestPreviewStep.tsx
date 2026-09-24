type GuestPreviewStepProps = {
    displayName: string;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    cameraEnabled: boolean;
    microphoneEnabled: boolean;
    canJoin: boolean;
    onToggleCamera: () => void;
    onToggleMicrophone: () => void;
    onJoin: () => void;
};

export function GuestPreviewStep({
    displayName,
    videoRef,
    cameraEnabled,
    microphoneEnabled,
    canJoin,
    onToggleCamera,
    onToggleMicrophone,
    onJoin,
}: GuestPreviewStepProps) {
    return (
        <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-8">
            <div className="mx-auto max-w-5xl">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-950">
                            M
                        </span>

                        <span className="text-lg font-semibold tracking-tight">
                            Miyor
                        </span>
                    </div>

                    <span className="text-sm text-slate-400">
                        Be there, Anywhere.
                    </span>
                </header>

                <div className="grid gap-8 py-10 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
                    <section>
                        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
                            <div className="relative aspect-video">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className={[
                                        "h-full w-full object-cover",
                                        cameraEnabled
                                            ? ""
                                            : "opacity-0",
                                    ].join(" ")}
                                />

                                {!cameraEnabled && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-2xl font-semibold">
                                            {displayName
                                                .charAt(0)
                                                .toUpperCase() ||
                                                "M"}
                                        </div>
                                    </div>
                                )}

                                <div className="absolute bottom-4 left-4 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={
                                            onToggleMicrophone
                                        }
                                        className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 backdrop-blur transition hover:bg-black/80"
                                        aria-label={
                                            microphoneEnabled
                                                ? "Mute microphone"
                                                : "Unmute microphone"
                                        }
                                    >
                                        {microphoneEnabled
                                            ? "🎤"
                                            : "🔇"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={
                                            onToggleCamera
                                        }
                                        className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 backdrop-blur transition hover:bg-black/80"
                                        aria-label={
                                            cameraEnabled
                                                ? "Turn off camera"
                                                : "Turn on camera"
                                        }
                                    >
                                        {cameraEnabled
                                            ? "📹"
                                            : "🚫"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="lg:pl-4">
                        <p className="text-sm font-medium text-slate-400">
                            You&apos;re joining as
                        </p>

                        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {displayName}
                        </h1>

                        <p className="mt-4 text-sm leading-6 text-slate-400">
                            Your camera and microphone are ready.
                            Join the call when you&apos;re ready.
                        </p>

                        <button
                            type="button"
                            onClick={onJoin}
                            disabled={!canJoin}
                            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Join Call
                        </button>

                        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                            No Miyor account is required.
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}