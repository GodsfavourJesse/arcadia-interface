"use client";

import {
    useEffect,
    useState,
} from "react";

import {
    AvatarCanvas,
} from "./avatar-canvas";

import {
    useFaceTracking,
} from "@/app/hooks/avatar/useFaceTracking";

type AvatarPreviewProps = {
    cameraStream: MediaStream | null;
    modelUrl: string;
    trackingEnabled?: boolean;
    active?: boolean;
    onAvatarCanvasReady?: (
        canvas: HTMLCanvasElement,
    ) => void;
};

export function AvatarPreview({
    cameraStream,
    modelUrl,
    trackingEnabled = true,
    active = false,
    onAvatarCanvasReady,
}: AvatarPreviewProps) {
    const [
        videoElement,
        setVideoElement,
    ] =
        useState<HTMLVideoElement | null>(
            null,
        );

    useEffect(() => {
        if (!videoElement) {
            return;
        }

        videoElement.srcObject =
            cameraStream;

        videoElement.muted = true;
        videoElement.volume = 0;

        if (cameraStream) {
            void videoElement
                .play()
                .catch(() => {
                    // Muted autoplay is normally
                    // permitted. If playback is
                    // rejected, face tracking will
                    // begin once playback becomes
                    // available.
                });
        }

        return () => {
            videoElement.pause();
            videoElement.srcObject = null;
        };
    }, [
        videoElement,
        cameraStream,
    ]);

    const {
        tracking,
        isReady,
        isTracking,
        error,
    } = useFaceTracking({
        video: videoElement,
        enabled:
            trackingEnabled &&
            cameraStream !== null,
    });

    /*
     * Keep the AvatarCanvas mounted regardless
     * of presentation mode.
     *
     * This is important because AvatarCanvas
     * creates the WebGL canvas and captureStream().
     * Unmounting it when avatar mode is disabled
     * would destroy the avatar MediaStream track.
     */
    return (
        <div className="relative h-full w-full">
            {active ? (
                /*
                 * Avatar mode:
                 * show both the physical camera
                 * and the rendered avatar.
                 */
                <div className="grid h-full w-full grid-cols-1 gap-3 md:grid-cols-2">
                    {/* Physical camera */}
                    <section className="relative min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-black">
                        <CameraVideo
                            videoElement={videoElement}
                            setVideoElement={
                                setVideoElement
                            }
                        />

                        <PreviewLabel>
                            Camera
                        </PreviewLabel>

                        {!cameraStream && (
                            <CameraUnavailable />
                        )}
                    </section>

                    {/* Avatar */}
                    <AvatarSurface
                        modelUrl={modelUrl}
                        tracking={tracking}
                        isTracking={isTracking}
                        isReady={isReady}
                        error={error}
                        onAvatarCanvasReady={
                            onAvatarCanvasReady
                        }
                    />
                </div>
            ) : (
                /*
                 * Normal video mode:
                 * camera is the visible presentation.
                 *
                 * AvatarCanvas remains mounted in the
                 * background so its MediaStream track
                 * remains available for instant activation.
                 */
                <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
                    <CameraVideo
                        videoElement={videoElement}
                        setVideoElement={
                            setVideoElement
                        }
                    />

                    <PreviewLabel>
                        Camera
                    </PreviewLabel>

                    {!cameraStream && (
                        <CameraUnavailable />
                    )}

                    {/*
                     * Keep a real, non-zero-sized rendering
                     * surface alive without exposing it
                     * as part of the normal camera UI.
                     *
                     * The renderer therefore continues
                     * producing frames for captureStream().
                     */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-0 right-0 h-[480px] w-[640px] overflow-hidden opacity-0"
                    >
                        <AvatarCanvas
                            modelUrl={modelUrl}
                            tracking={tracking}
                            onCanvasReady={
                                onAvatarCanvasReady
                            }
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

type CameraVideoProps = {
    videoElement: HTMLVideoElement | null;
    setVideoElement: (
        element: HTMLVideoElement | null,
    ) => void;
};

function CameraVideo({
    setVideoElement,
}: CameraVideoProps) {
    return (
        <video
            ref={setVideoElement}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
        />
    );
}

type AvatarSurfaceProps = {
    modelUrl: string;
    tracking: ReturnType<
        typeof useFaceTracking
    >["tracking"];
    isTracking: boolean;
    isReady: boolean;
    error: string | null;
    onAvatarCanvasReady?: (
        canvas: HTMLCanvasElement,
    ) => void;
};

function AvatarSurface({
    modelUrl,
    tracking,
    isTracking,
    isReady,
    error,
    onAvatarCanvasReady,
}: AvatarSurfaceProps) {
    return (
        <section className="relative min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1020]">
            <AvatarCanvas
                modelUrl={modelUrl}
                tracking={tracking}
                onCanvasReady={
                    onAvatarCanvasReady
                }
            />

            <PreviewLabel>
                Avatar
            </PreviewLabel>

            <div className="pointer-events-none absolute bottom-3 left-3 right-3">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <span
                            className={`h-2 w-2 rounded-full ${
                                isTracking
                                    ? "bg-emerald-400"
                                    : "bg-white/30"
                            }`}
                        />

                        <span className="text-xs text-white/80">
                            {isTracking
                                ? "Face tracking"
                                : isReady
                                  ? "Looking for face"
                                  : "Starting tracking"}
                        </span>
                    </div>

                    {error && (
                        <span className="text-xs text-red-300">
                            Tracking unavailable
                        </span>
                    )}
                </div>
            </div>
        </section>
    );
}

function PreviewLabel({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="pointer-events-none absolute left-3 top-3 z-10">
            <div className="rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                {children}
            </div>
        </div>
    );
}

function CameraUnavailable() {
    return (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
            <p className="text-sm text-white/60">
                Camera unavailable
            </p>
        </div>
    );
}