"use client";

import { useEffect, useRef, useState } from "react";

import { useCameraVideoSource } from "@/app/hooks/video/useCameraVideoSource";
import { useVideoOutput } from "@/app/hooks/video/useVideoOutput";

export function VideoOutputPreview() {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const animationFrameRef = useRef<number | null>(null);

    const [rendering, setRendering] = useState(false);
    const [frameCount, setFrameCount] = useState(0);

    const {
        stream,
        state: cameraState,
        start: startCamera,
        stop: stopCamera,
    } = useCameraVideoSource({
        autoStartFrames: false,
    });

    const {
        canvas,
        track,
        state: outputState,
        diagnostics,
        start: startOutput,
        stop: stopOutput,
        render,
    } = useVideoOutput({
        width: 1280,
        height: 720,
        frameRate: 30,
        mirror: true,
    });

    useEffect(() => {
        const video = videoRef.current;

        if (!video || !stream) {
            return;
        }

        video.srcObject = stream;

        void video.play().catch(() => {
            // Autoplay may require a user gesture.
        });

        return () => {
            video.srcObject = null;
        };
    }, [stream]);

    useEffect(() => {
        if (!rendering) {
            return;
        }

        const video = videoRef.current;

        if (!video) {
            return;
        }

        let active = true;

        const loop = () => {
            if (!active) {
                return;
            }

            render(video);

            setFrameCount((value) => value + 1);

            animationFrameRef.current =
                requestAnimationFrame(loop);
        };

        animationFrameRef.current =
            requestAnimationFrame(loop);

        return () => {
            active = false;

            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [rendering, render]);

    const handleStart = async () => {
        await startCamera();
        await startOutput();

        setFrameCount(0);
        setRendering(true);
    };

    const handleStop = () => {
        setRendering(false);

        stopOutput();
        stopCamera();
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold">
                        Camera Source
                    </h2>

                    <div className="overflow-hidden rounded-xl bg-black">
                        <video
                            ref={videoRef}
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
                        Canvas Output
                    </h2>

                    <div className="overflow-hidden rounded-xl bg-black">
                        {canvas && (
                            <canvas
                                ref={(element) => {
                                    if (!element) {
                                        return;
                                    }

                                    const context =
                                        element.getContext("2d");

                                    if (!context) {
                                        return;
                                    }

                                    element.width =
                                        canvas.width;

                                    element.height =
                                        canvas.height;

                                    const copyFrame = () => {
                                        if (!rendering) {
                                            return;
                                        }

                                        context.clearRect(
                                            0,
                                            0,
                                            element.width,
                                            element.height,
                                        );

                                        context.drawImage(
                                            canvas,
                                            0,
                                            0,
                                        );

                                        requestAnimationFrame(
                                            copyFrame,
                                        );
                                    };

                                    copyFrame();
                                }}
                                className="aspect-video w-full object-cover"
                            />
                        )}
                    </div>

                    <p className="text-sm text-zinc-500">
                        Output: {outputState}
                    </p>
                </section>
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={handleStart}
                    disabled={rendering}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                >
                    Start Output
                </button>

                <button
                    type="button"
                    onClick={handleStop}
                    disabled={!rendering}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                    Stop
                </button>
            </div>

            <div className="grid gap-3 rounded-xl border border-zinc-800 p-4 text-sm">
                <div>
                    <strong>Render frames:</strong>{" "}
                    {frameCount}
                </div>

                <div>
                    <strong>Track:</strong>{" "}
                    {track?.id ?? "none"}
                </div>

                <div>
                    <strong>Track state:</strong>{" "}
                    {diagnostics?.trackReadyState ?? "none"}
                </div>

                <div>
                    <strong>Output size:</strong>{" "}
                    {diagnostics
                        ? `${diagnostics.width} × ${diagnostics.height}`
                        : "none"}
                </div>

                <div>
                    <strong>FPS:</strong>{" "}
                    {diagnostics?.frameRate ?? "none"}
                </div>
            </div>
        </div>
    );
}