"use client";

import type { RefObject } from "react";

type HostLobbyProps = {
    roomCode: string;

    videoRef: RefObject<HTMLVideoElement | null>;

    cameraEnabled: boolean;
    microphoneEnabled: boolean;

    mediaLoading: boolean;
    starting: boolean;

    error: string | null;

    onStartCall: () => void;
    onToggleCamera: () => void;
    onToggleMicrophone: () => void;
};

export function HostLobby({
    roomCode,
    videoRef,
    cameraEnabled,
    microphoneEnabled,
    mediaLoading,
    starting,
    error,
    onStartCall,
    onToggleCamera,
    onToggleMicrophone,
}: HostLobbyProps) {
    return (
        <main className="min-h-screen bg-black text-white">
            <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <p className="text-xl font-semibold">
                            MIYOR
                        </p>

                        <p className="text-sm text-white/50">
                            Be thee, Anywhere.
                        </p>
                    </div>

                    <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/60">
                        Room {roomCode}
                    </div>
                </header>

                <section className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-4xl">
                        <div className="mb-6 text-center">
                            <h1 className="text-3xl font-semibold">
                                Ready to start?
                            </h1>

                            <p className="mt-2 text-white/50">
                                Check your camera and microphone
                                before starting the call.
                            </p>
                        </div>

                        <div className="relative aspect-video overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl">
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="h-full w-full object-cover"
                            />

                            {!cameraEnabled && (
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                                    <div className="text-center">
                                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-xl">
                                            You
                                        </div>

                                        <p className="text-sm text-white/60">
                                            Camera is off
                                        </p>
                                    </div>
                                </div>
                            )}

                            {mediaLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                    <p className="text-sm text-white/70">
                                        Starting camera and microphone…
                                    </p>
                                </div>
                            )}

                            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-3">
                                <button
                                    type="button"
                                    onClick={
                                        onToggleMicrophone
                                    }
                                    className="rounded-full bg-black/70 px-5 py-3 text-sm backdrop-blur transition hover:bg-black"
                                >
                                    {microphoneEnabled
                                        ? "Mute"
                                        : "Unmute"}
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        onToggleCamera
                                    }
                                    className="rounded-full bg-black/70 px-5 py-3 text-sm backdrop-blur transition hover:bg-black"
                                >
                                    {cameraEnabled
                                        ? "Camera off"
                                        : "Camera on"}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}

                        <div className="mt-6 flex justify-center">
                            <button
                                type="button"
                                disabled={
                                    mediaLoading ||
                                    starting ||
                                    !cameraEnabled ||
                                    !microphoneEnabled
                                }
                                onClick={onStartCall}
                                className="rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {starting
                                    ? "Starting call…"
                                    : "Start Call"}
                            </button>
                        </div>

                        <p className="mt-4 text-center text-xs text-white/35">
                            Your guests can join using their
                            invitation link once the call starts.
                        </p>
                    </div>
                </section>
            </div>
        </main>
    );
}