"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AvatarCanvas } from "@/app/components/avatar/avatar-canvas";
import { useFaceTracking } from "@/app/hooks/avatar/useFaceTracking";
import { getAvatarById } from "@/app/lib/avatar/avatar-registry";
import type { AvatarTrackingState } from "@/app/types/avatar/avatar.types";

const INITIAL_TRACKING: AvatarTrackingState = {
    faceDetected: false,

    face: {
        x: 0,
        y: 0,
        scale: 0,
    },

    nose: {
        x: 0,
        y: 0,
        z: 0,
    },

    head: {
        yaw: 0,
        pitch: 0,
        roll: 0,
    },

    eyes: {
        leftBlink: 0,
        rightBlink: 0,
        gazeX: 0,
        gazeY: 0,
    },

    mouth: {
        open: 0,
        smile: 0,
        funnel: 0,
        pucker: 0,
    },

    timestamp: 0,
};

export function AvatarTestClient() {
    const [cameraStream, setCameraStream] =
        useState<MediaStream | null>(null);

    const [cameraError, setCameraError] =
        useState<string | null>(null);

    const [trackingEnabled, setTrackingEnabled] =
        useState(true);

    const [videoElement, setVideoElement] =
        useState<HTMLVideoElement | null>(null);

    /*
     * Hydration-safe timestamp display.
     *
     * This starts as a deterministic value on both
     * server and client, then becomes the local time
     * after the component mounts in the browser.
     */
    const [formattedTrackingTime, setFormattedTrackingTime] =
        useState("—");

    const videoRef =
        useRef<HTMLVideoElement | null>(null);

    const avatar =
        getAvatarById("default-vrm");

    /*
     * Stable ref callback.
     *
     * Keeping this callback stable prevents React from
     * repeatedly clearing and reassigning the video ref
     * on every render.
     */
    const setVideoNode = useCallback(
        (element: HTMLVideoElement | null) => {
            videoRef.current = element;
            setVideoElement(element);
        },
        [],
    );

    /*
     * Camera lifecycle.
     */
    useEffect(() => {
        let mounted = true;
        let stream: MediaStream | null = null;

        async function startCamera() {
            try {
                setCameraError(null);

                stream =
                    await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: {
                                ideal: 1280,
                            },
                            height: {
                                ideal: 720,
                            },
                            facingMode: "user",
                        },
                        audio: false,
                    });

                if (!mounted) {
                    stream
                        .getTracks()
                        .forEach((track) => {
                            track.stop();
                        });

                    return;
                }

                setCameraStream(stream);
            } catch (error) {
                if (!mounted) {
                    return;
                }

                console.error(
                    "[Miyor] Failed to access camera:",
                    error,
                );

                setCameraError(
                    error instanceof Error
                        ? error.message
                        : "Unable to access the camera.",
                );
            }
        }

        void startCamera();

        return () => {
            mounted = false;

            stream
                ?.getTracks()
                .forEach((track) => {
                    track.stop();
                });

            setCameraStream(null);
        };
    }, []);

    /*
     * Attach the MediaStream to the video element.
     */
    useEffect(() => {
        const video =
            videoRef.current;

        if (!video) {
            return;
        }

        video.srcObject =
            cameraStream;

        if (cameraStream) {
            void video.play().catch(() => {
                /*
                 * The video is muted and playsInline,
                 * so autoplay should normally succeed.
                 *
                 * Ignore browser autoplay rejection.
                 */
            });
        }

        return () => {
            video.pause();
            video.srcObject = null;
        };
    }, [cameraStream]);

    /*
     * Local face tracking.
     *
     * MediaPipe runs entirely in the browser.
     */
    const {
        tracking,
        trackingRef,
        isReady,
        isTracking,
        error: trackingError,
    } = useFaceTracking({
        video: videoElement,
        enabled:
            trackingEnabled &&
            cameraStream !== null,
    });

    /*
     * Hydration-safe timestamp formatting.
     *
     * IMPORTANT:
     * We intentionally do not call Date/toLocaleTimeString()
     * during render.
     *
     * The server renders "—".
     * The browser changes it after hydration.
     */
    useEffect(() => {
        const updateTrackingTime =
            () => {
                const timestamp =
                    trackingRef.current.timestamp;

                if (
                    !timestamp ||
                    timestamp <= 0
                ) {
                    setFormattedTrackingTime(
                        "—",
                    );

                    return;
                }

                setFormattedTrackingTime(
                    new Date(
                        timestamp,
                    ).toLocaleTimeString(),
                );
            };

        /*
         * Update immediately after mount.
         */
        updateTrackingTime();

        /*
         * Keep the displayed timestamp reasonably
         * responsive without causing a render for
         * every MediaPipe frame.
         */
        const interval =
            window.setInterval(
                updateTrackingTime,
                100,
            );

        return () => {
            window.clearInterval(
                interval,
            );
        };
    }, [trackingRef]);

    if (!avatar) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#05070d] p-6">
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4">
                    <p className="text-sm text-red-300">
                        The default-vrm avatar was not found in the avatar
                        registry.
                    </p>
                </div>
            </main>
        );
    }

    const currentTracking =
        tracking ??
        INITIAL_TRACKING;

    return (
        <main className="min-h-screen bg-[#05070d] p-6 text-white">
            <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col gap-6">
                <header>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                        Miyor Avatar Test
                    </p>

                    <h1 className="mt-2 text-2xl font-semibold">
                        Live Face Tracking
                    </h1>

                    <p className="mt-2 text-sm text-white/50">
                        MediaPipe face tracking driving the registered VRM
                        avatar locally.
                    </p>
                </header>

                {cameraError && (
                    <section className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4">
                        <p className="text-sm font-medium text-red-300">
                            Camera error
                        </p>

                        <p className="mt-1 text-sm text-red-300/70">
                            {cameraError}
                        </p>
                    </section>
                )}

                {trackingError && (
                    <section className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4">
                        <p className="text-sm font-medium text-amber-300">
                            Face tracking error
                        </p>

                        <p className="mt-1 break-words text-sm text-amber-300/70">
                            {trackingError}
                        </p>
                    </section>
                )}

                <section className="grid min-h-[600px] flex-1 gap-4 lg:grid-cols-2">
                    <div className="relative min-h-[500px] overflow-hidden rounded-3xl border border-white/10 bg-black">
                        <video
                            ref={setVideoNode}
                            autoPlay
                            muted
                            playsInline
                            className="absolute inset-0 h-full w-full object-cover"
                        />

                        <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur">
                            <span className="text-xs font-medium text-white/70">
                                Camera
                            </span>
                        </div>

                        <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur">
                            <span
                                className={[
                                    "text-xs font-medium",
                                    isReady
                                        ? "text-emerald-300"
                                        : "text-white/50",
                                ].join(" ")}
                            >
                                {isReady
                                    ? "MediaPipe ready"
                                    : "Initializing MediaPipe"}
                            </span>
                        </div>

                        <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur">
                            <span
                                className={[
                                    "text-xs font-medium",
                                    currentTracking.faceDetected
                                        ? "text-emerald-300"
                                        : "text-white/50",
                                ].join(" ")}
                            >
                                {currentTracking.faceDetected
                                    ? "Face detected"
                                    : "No face detected"}
                            </span>
                        </div>

                        <div className="absolute bottom-4 right-4 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur">
                            <span
                                className={[
                                    "text-xs font-medium",
                                    isTracking
                                        ? "text-emerald-300"
                                        : "text-white/50",
                                ].join(" ")}
                            >
                                {isTracking
                                    ? "Tracking"
                                    : "Idle"}
                            </span>
                        </div>
                    </div>

                    <div className="relative min-h-[500px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b1020]">
                        <AvatarCanvas
                            avatar={avatar}
                            trackingRef={trackingRef}
                        />

                        <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur">
                            <span className="text-xs font-medium text-white/70">
                                Avatar
                            </span>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-semibold">
                                Face Tracking
                            </h2>

                            <p className="mt-1 text-xs text-white/40">
                                Tracking runs locally in the browser. No face
                                landmarks are sent to the backend.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setTrackingEnabled(
                                    (enabled) =>
                                        !enabled,
                                );
                            }}
                            className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.1]"
                        >
                            {trackingEnabled
                                ? "Disable tracking"
                                : "Enable tracking"}
                        </button>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <TrackingValue
                            label="Face"
                            value={
                                currentTracking.faceDetected
                                    ? "Detected"
                                    : "Not detected"
                            }
                        />

                        <TrackingValue
                            label="Head yaw"
                            value={formatRadians(
                                currentTracking.head.yaw,
                            )}
                        />

                        <TrackingValue
                            label="Head pitch"
                            value={formatRadians(
                                currentTracking.head.pitch,
                            )}
                        />

                        <TrackingValue
                            label="Head roll"
                            value={formatRadians(
                                currentTracking.head.roll,
                            )}
                        />

                        <TrackingValue
                            label="Left blink"
                            value={formatValue(
                                currentTracking.eyes.leftBlink,
                            )}
                        />

                        <TrackingValue
                            label="Right blink"
                            value={formatValue(
                                currentTracking.eyes.rightBlink,
                            )}
                        />

                        <TrackingValue
                            label="Mouth open"
                            value={formatValue(
                                currentTracking.mouth.open,
                            )}
                        />

                        <TrackingValue
                            label="Smile"
                            value={formatValue(
                                currentTracking.mouth.smile,
                            )}
                        />

                        <TrackingValue
                            label="Pucker"
                            value={formatValue(
                                currentTracking.mouth.pucker,
                            )}
                        />

                        <TrackingValue
                            label="Gaze X"
                            value={formatValue(
                                currentTracking.eyes.gazeX,
                            )}
                        />

                        <TrackingValue
                            label="Gaze Y"
                            value={formatValue(
                                currentTracking.eyes.gazeY,
                            )}
                        />

                        <TrackingValue
                            label="Tracking timestamp"
                            value={
                                formattedTrackingTime
                            }
                        />
                    </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <h2 className="text-sm font-semibold">
                        Asset
                    </h2>

                    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-white/40">
                                ID
                            </dt>

                            <dd className="mt-1 text-white/80">
                                {avatar.id}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-white/40">
                                Type
                            </dt>

                            <dd className="mt-1 text-white/80">
                                {avatar.type}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-white/40">
                                Render mode
                            </dt>

                            <dd className="mt-1 text-white/80">
                                {avatar.renderMode}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-white/40">
                                Asset URL
                            </dt>

                            <dd className="mt-1 break-all text-white/80">
                                {avatar.assetUrl}
                            </dd>
                        </div>
                    </dl>
                </section>
            </div>
        </main>
    );
}

type TrackingValueProps = {
    label: string;
    value: string;
};

function TrackingValue({
    label,
    value,
}: TrackingValueProps) {
    return (
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs text-white/40">
                {label}
            </p>

            <p className="mt-1 font-mono text-sm text-white/80">
                {value}
            </p>
        </div>
    );
}

function formatValue(
    value: number,
): string {
    return value.toFixed(3);
}

function formatRadians(
    value: number,
): string {
    return `${value.toFixed(3)} rad`;
}