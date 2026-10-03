"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";

import { AvatarCanvas } from "./avatar-canvas";

import { useFaceTracking } from "@/app/hooks/avatar/useFaceTracking";

import type {
    AvatarDefinition,
    AvatarTrackingState,
} from "@/app/types/avatar/avatar.types";

type AvatarPreviewProps = {
    cameraStream: MediaStream | null;
    avatar: AvatarDefinition | null;
    trackingEnabled?: boolean;
    active?: boolean;
    onAvatarCanvasReady?: (
        canvas: HTMLCanvasElement,
    ) => void;
};

export function AvatarPreview({
    cameraStream,
    avatar,
    trackingEnabled = true,
    active = false,
    onAvatarCanvasReady,
}: AvatarPreviewProps) {
    const [
        videoElement,
        setVideoElement,
    ] = useState<HTMLVideoElement | null>(null);

    /*
     * Keep the local camera preview synchronized
     * with the physical camera MediaStream.
     *
     * This video element always represents the
     * user's real camera. Avatar activation must
     * never replace or destroy this stream.
     */
    useEffect(() => {
        if (!videoElement) {
            return;
        }

        videoElement.srcObject = cameraStream;

        videoElement.muted = true;
        videoElement.volume = 0;

        if (cameraStream) {
            void videoElement.play().catch(() => {
                // Browser autoplay may be deferred.
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

    /*
     * Local-only face tracking.
     *
     * MediaPipe runs only when:
     * - tracking is enabled
     * - a camera stream exists
     * - an avatar is selected
     *
     * The hook returns the renderer-agnostic
     * AvatarTrackingState used by VRM and 2D
     * avatar renderers.
     *
     * Face tracking remains entirely local.
     * No landmarks are sent to the backend.
     */
    const { tracking } = useFaceTracking({
        video: videoElement,
        enabled:
            trackingEnabled &&
            cameraStream !== null &&
            avatar !== null,
    });

    const trackingRef =
        useRef<AvatarTrackingState>(tracking);

    useEffect(() => {
        trackingRef.current = tracking;
    }, [tracking]);

    /*
     * Keep the canvas callback stable.
     *
     * AvatarPreview does not own the canvas.
     * AvatarCanvas owns its lifecycle and exposes
     * the canvas when it is ready.
     */
    const handleAvatarCanvasReady = useCallback(
        (canvas: HTMLCanvasElement) => {
            onAvatarCanvasReady?.(canvas);
        },
        [onAvatarCanvasReady],
    );

    return (
        <div className="relative h-full w-full overflow-hidden rounded-2xl">
            {/* =================================================
             * CAMERA PREVIEW
             *
             * The physical camera remains visible even
             * when the avatar is active.
             * ================================================= */}
            <section
                className={[
                    "absolute overflow-hidden rounded-2xl border border-white/10 bg-black",
                    active
                        ? "inset-y-0 left-0 right-1/2 mr-1.5"
                        : "inset-0",
                ].join(" ")}
            >
                <video
                    ref={setVideoElement}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                />

                <PreviewLabel>
                    Camera
                </PreviewLabel>

                {!cameraStream && (
                    <CameraUnavailable />
                )}
            </section>

            {/* =================================================
             * AVATAR PREVIEW
             *
             * The AvatarCanvas remains mounted while an
             * avatar is selected.
             *
             * Changing the avatar swaps the renderer/model
             * inside AvatarEngine while preserving the same
             * underlying HTMLCanvasElement.
             *
             * Activating/deactivating the avatar changes
             * presentation here. WebRTC track replacement
             * belongs to the avatar media layer, not this
             * component.
             * ================================================= */}
            <section
                className={[
                    "absolute overflow-hidden rounded-2xl border border-white/10 bg-[#0b1020]",
                    active
                        ? "inset-y-0 left-1/2 right-0 ml-1.5 opacity-100"
                        : "bottom-0 right-0 h-[480px] w-[640px] opacity-0",
                ].join(" ")}
                aria-hidden={!active}
            >
                {avatar ? (
                    <AvatarCanvas
                        avatar={avatar}
                        renderEnabled={active}
                        trackingRef={trackingRef}
                        onCanvasReady={
                            handleAvatarCanvasReady
                        }
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <p className="text-sm text-white/45">
                            Select an avatar
                        </p>
                    </div>
                )}

                {active && (
                    <PreviewLabel>
                        Avatar
                    </PreviewLabel>
                )}
            </section>
        </div>
    );
}

/* =========================================================
 * PREVIEW LABEL
 * ========================================================= */

function PreviewLabel({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="pointer-events-none absolute left-3 top-3 z-10">
            <div className="rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                {children}
            </div>
        </div>
    );
}

/* =========================================================
 * CAMERA UNAVAILABLE
 * ========================================================= */

function CameraUnavailable() {
    return (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
            <p className="text-sm text-white/60">
                Camera unavailable
            </p>
        </div>
    );
}