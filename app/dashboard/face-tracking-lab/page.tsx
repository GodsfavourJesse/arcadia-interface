"use client";

import {
    useEffect,
    useRef,
} from "react";

import {
    useCameraVideoSource,
} from "@/app/hooks/video/useCameraVideoSource";

import {
    useFaceTracking,
} from "@/app/hooks/face/useFaceTracking";

import {
    FaceTrackingDebug,
} from "@/app/components/face/face-tracking-debug";

import {
    FaceLandmarkCanvas,
} from "@/app/components/face/face-landmark-canvas";

export default function FaceTrackingLabPage() {
    const videoElementRef =
        useRef<HTMLVideoElement | null>(null);

    const {
        stream,
        state: cameraState,
        start,
        stop,
        videoRef: attachVideoElement,
    } = useCameraVideoSource({
        enabled: true,
        maxFps: 30,
        autoStartFrames: false,
    });

    useEffect(() => {
        videoElementRef.current?.play().catch(() => {
            // Browser autoplay policy.
        });
    }, [stream]);

    const {
        state: trackingState,
        initialized,
        error,
        stop: stopTracking,
    } = useFaceTracking({
        videoRef: videoElementRef,
        enabled: Boolean(stream),
        detectionFps: 30,
    });

    const handleVideoRef = (
        element: HTMLVideoElement | null,
    ) => {
        videoElementRef.current = element;
        attachVideoElement(element);
    };

    const handleStart = async () => {
        await start();
    };

    const handleStop = () => {
        stopTracking();
        stop();
    };

    return (
        <main className="min-h-screen bg-black px-6 py-10 text-white">
            <div className="mx-auto max-w-6xl space-y-8">
                <header className="space-y-2">
                    <p className="text-sm text-zinc-500">
                        Miyor Video Pipeline
                    </p>

                    <h1 className="text-3xl font-bold">
                        Phase 5 — Face Tracking
                    </h1>

                    <p className="max-w-3xl text-zinc-400">
                        Face landmarks and facial movement
                        are detected locally in the browser.
                        No tracking data is sent to the
                        Miyor backend.
                    </p>
                </header>

                <div className="grid gap-6 lg:grid-cols-2">
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold">
                            Camera
                        </h2>

                        <div className="overflow-hidden rounded-xl bg-zinc-950">
                            <video
                                ref={handleVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="aspect-video w-full object-cover"
                            />
                        </div>

                        <p className="text-sm text-zinc-500">
                            Camera: {cameraState}
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold">
                            Landmarks
                        </h2>

                        <FaceLandmarkCanvas
                            video={videoElementRef.current}
                            state={trackingState}
                        />
                    </section>
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={handleStart}
                        disabled={cameraState === "starting"}
                        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                    >
                        Start Tracking
                    </button>

                    <button
                        type="button"
                        onClick={handleStop}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium"
                    >
                        Stop
                    </button>
                </div>

                <FaceTrackingDebug
                    state={trackingState}
                />

                <div className="rounded-xl border border-zinc-800 p-4 text-sm">
                    <p>
                        MediaPipe:{" "}
                        <strong>
                            {initialized
                                ? "initialized"
                                : "not initialized"}
                        </strong>
                    </p>

                    {error && (
                        <p className="mt-2 text-red-400">
                            {error.message}
                        </p>
                    )}
                </div>
            </div>
        </main>
    );
}