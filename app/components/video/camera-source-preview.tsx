"use client";

import { useEffect, useState } from "react";
import { useCameraVideoSource } from "@/app/hooks/video/useCameraVideoSource";

export function CameraSourcePreview() {
    const [frameCount, setFrameCount] = useState(0);
    const [started, setStarted] = useState(false);

    const {
        videoRef,
        stream,
        state,
        error,
        diagnostics,
        start,
        stop,
        startFrames,
        stopFrames,
        setFrameCallback,
    } = useCameraVideoSource({
        callType: "video",
        maxFps: 30,
    });

    useEffect(() => {
        setFrameCallback(() => {
            setFrameCount((current) => current + 1);
        });

        return () => setFrameCallback(null);
    }, [setFrameCallback]);

    const handleStart = async () => {
        await start();
        setStarted(true);
        startFrames();
    };

    const handleStop = () => {
        stopFrames();
        stop();
        setStarted(false);
        setFrameCount(0);
    };

    return (
        <section className="space-y-6 rounded-2xl border border-white/10 bg-black/20 p-6">
            <div>
                <h1 className="text-xl font-semibold">Miyor Video Source Lab</h1>
                <p className="mt-1 text-sm text-white/60">
                    Phase 3 camera source and WebCodecs frame boundary test.
                </p>
            </div>

            <div className="overflow-hidden rounded-xl bg-black">
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="aspect-video h-auto w-full object-cover"
                />
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-white/5 p-3">
                    <div className="text-white/50">State</div>
                    <div className="mt-1 font-medium">{state}</div>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                    <div className="text-white/50">Frames observed</div>
                    <div className="mt-1 font-medium">{frameCount}</div>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                    <div className="text-white/50">Video track</div>
                    <div className="mt-1 break-all font-medium">
                        {diagnostics?.trackId ?? "—"}
                    </div>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                    <div className="text-white/50">Capture</div>
                    <div className="mt-1 font-medium">
                        {diagnostics
                            ? `${diagnostics.settings.width ?? 0} × ${diagnostics.settings.height ?? 0}`
                            : "—"}
                    </div>
                </div>
            </div>

            {error && (
                <p className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
                    {error}
                </p>
            )}

            <div className="flex gap-3">
                {!started ? (
                    <button
                        type="button"
                        onClick={() => void handleStart()}
                        disabled={state === "starting"}
                        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                    >
                        {state === "starting" ? "Starting…" : "Start camera"}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleStop}
                        className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white"
                    >
                        Stop camera
                    </button>
                )}
            </div>

            {stream && (
                <p className="text-xs text-white/40">
                    Stream {stream.id} is owned by the video source layer.
                </p>
            )}
        </section>
    );
}
