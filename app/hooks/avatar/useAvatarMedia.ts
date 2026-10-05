"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    AVATAR_CAPTURE_FPS,
} from "../webrtc/webrtc.constants";

type UseAvatarMediaOptions = {
    cameraStream: MediaStream | null;
    enabled: boolean;
    videoSenderReady: boolean;
    replaceVideoTrack: (
        track: MediaStreamTrack | null,
    ) => Promise<void>;
};

export function useAvatarMedia({
    cameraStream,
    enabled,
    videoSenderReady,
    replaceVideoTrack,
}: UseAvatarMediaOptions) {
    const avatarCanvasRef =
        useRef<HTMLCanvasElement | null>(null);

    const avatarStreamRef =
        useRef<MediaStream | null>(null);

    const avatarVideoTrackRef =
        useRef<MediaStreamTrack | null>(null);

    const cameraVideoTrackRef =
        useRef<MediaStreamTrack | null>(null);

    const switchingRef =
        useRef(false);

    /*
     * State updates are asynchronous. The WebRTC offer can be created
     * before React has committed setIsAvatarActive(true), so the camera
     * reconciliation effect must have an imperative source of truth.
     */
    const isAvatarActiveRef =
        useRef(false);

    const mountedRef =
        useRef(true);

    const [
        avatarStream,
        setAvatarStream,
    ] = useState<MediaStream | null>(null);

    const [
        avatarVideoTrack,
        setAvatarVideoTrack,
    ] = useState<MediaStreamTrack | null>(null);

    const [
        isAvatarActive,
        setIsAvatarActive,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState<string | null>(null);

    /*
     * Mounted state.
     */
    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    /*
     * Keep the current physical camera track
     * synchronized with cameraStream.
     *
     * The camera track is only referenced here.
     * This hook never stops or owns the physical
     * camera track.
     */
    useEffect(() => {
        const nextCameraTrack =
            cameraStream?.getVideoTracks()[0] ?? null;

        const previousCameraTrack =
            cameraVideoTrackRef.current;

        cameraVideoTrackRef.current =
            nextCameraTrack;

        /*
         * Avatar mode owns the WebRTC sender while
         * active, so do not replace the sender with
         * the camera when the camera stream changes.
         */
        if (isAvatarActiveRef.current) {
            return;
        }

        /*
         * Nothing changed.
         */
        if (
            previousCameraTrack ===
            nextCameraTrack
        ) {
            return;
        }

        /*
         * Do not race an explicit avatar
         * enable/disable operation.
         */
        if (switchingRef.current) {
            return;
        }

        if (!videoSenderReady) {
            return;
        }

        void replaceVideoTrack(
            nextCameraTrack,
        ).catch((error) => {
            console.error(
                "[Avatar] Failed to reconcile camera track:",
                error,
            );

            if (mountedRef.current) {
                setError(
                    error instanceof Error
                        ? error.message
                        : "Unable to update camera video.",
                );
            }
        });
    }, [
        cameraStream,
        isAvatarActive,
        videoSenderReady,
        replaceVideoTrack,
    ]);

    /*
     * Create the avatar MediaStream from the
     * rendered avatar canvas.
     *
     * One canvas owns one capture stream.
     *
     * If AvatarCanvas switches from one avatar
     * to another, the canvas itself remains the
     * same, so the same MediaStream continues
     * capturing the canvas.
     */
    const createAvatarStream =
        useCallback(
            (
                canvas: HTMLCanvasElement,
            ): MediaStream => {
                const existingStream =
                    avatarStreamRef.current;

                /*
                 * Reuse the existing capture stream
                 * when the same canvas is supplied.
                 */
                if (
                    existingStream &&
                    avatarCanvasRef.current ===
                        canvas
                ) {
                    return existingStream;
                }

                /*
                 * A different canvas means the old
                 * capture stream is no longer needed.
                 */
                if (
                    existingStream &&
                    avatarCanvasRef.current !==
                        canvas
                ) {
                    existingStream
                        .getTracks()
                        .forEach(
                            (track) => {
                                if (
                                    track.readyState !==
                                    "ended"
                                ) {
                                    track.stop();
                                }
                            },
                        );

                    avatarStreamRef.current =
                        null;

                    avatarVideoTrackRef.current =
                        null;
                }

                const stream =
                    canvas.captureStream(
                        AVATAR_CAPTURE_FPS,
                    );

                const videoTrack =
                    stream.getVideoTracks()[0] ??
                    null;

                console.log("[Avatar] Canvas capture stream created", {
                    trackId: videoTrack?.id,
                    readyState: videoTrack?.readyState,
                    kind: videoTrack?.kind,
                    canvasWidth: canvas.width,
                    canvasHeight: canvas.height,
                    canvasClientWidth: canvas.clientWidth,
                    canvasClientHeight: canvas.clientHeight,
                });

                if (!videoTrack) {
                    stream
                        .getTracks()
                        .forEach(
                            (track) => {
                                if (
                                    track.readyState !==
                                    "ended"
                                ) {
                                    track.stop();
                                }
                            },
                        );

                    throw new Error(
                        "Unable to create the avatar video track.",
                    );
                }

                videoTrack.contentHint =
                    "motion";

                avatarCanvasRef.current =
                    canvas;

                avatarStreamRef.current =
                    stream;

                avatarVideoTrackRef.current =
                    videoTrack;

                if (mountedRef.current) {
                    setAvatarStream(
                        stream,
                    );

                    setAvatarVideoTrack(
                        videoTrack,
                    );
                }

                return stream;
            },
            [],
        );

    /*
     * AvatarCanvas calls this when its persistent
     * canvas is ready.
     */
    const handleAvatarCanvasReady =
        useCallback(
            (
                canvas: HTMLCanvasElement,
            ) => {
                try {
                    setError(null);

                    createAvatarStream(
                        canvas,
                    );
                } catch (error) {
                    const normalized =
                        error instanceof Error
                            ? error
                            : new Error(
                                  "Unable to initialize avatar video.",
                              );

                    console.error(
                        "[Avatar] Failed to initialize avatar media:",
                        normalized,
                    );

                    if (
                        mountedRef.current
                    ) {
                        setError(
                            normalized.message,
                        );
                    }
                }
            },
            [createAvatarStream],
        );

    /*
     * Activate avatar video.
     */
    const enableAvatar =
        useCallback(
            async (): Promise<void> => {
                if (
                    switchingRef.current ||
                    isAvatarActive
                ) {
                    return;
                }

                if (!enabled) {
                    throw new Error(
                        "Avatar mode is currently unavailable.",
                    );
                }

                if (!videoSenderReady) {
                    throw new Error(
                        "WebRTC video is not ready yet.",
                    );
                }

                const cameraTrack =
                    cameraVideoTrackRef.current;

                if (!cameraTrack) {
                    throw new Error(
                        "Camera video track is unavailable.",
                    );
                }

                if (
                    cameraTrack.readyState ===
                    "ended"
                ) {
                    throw new Error(
                        "Camera video track has ended.",
                    );
                }

                const avatarTrack =
                    avatarVideoTrackRef.current;

                if (!avatarTrack) {
                    throw new Error(
                        "Avatar video track is unavailable.",
                    );
                }

                if (
                    avatarTrack.readyState ===
                    "ended"
                ) {
                    throw new Error(
                        "Avatar video track has ended.",
                    );
                }

                switchingRef.current =
                    true;

                try {
                    await replaceVideoTrack(
                        avatarTrack,
                    );

                    if (
                        !mountedRef.current
                    ) {
                        return;
                    }

                    setError(null);
                    isAvatarActiveRef.current = true;
                    setIsAvatarActive(true);
                } catch (error) {
                    const normalized =
                        error instanceof Error
                            ? error
                            : new Error(
                                  "Unable to activate avatar video.",
                              );

                    console.error(
                        "[Avatar] Failed to activate avatar:",
                        normalized,
                    );

                    if (
                        mountedRef.current
                    ) {
                        setError(
                            normalized.message,
                        );
                    }

                    throw normalized;
                } finally {
                    switchingRef.current =
                        false;
                }
            },
            [
                enabled,
                isAvatarActive,
                videoSenderReady,
                replaceVideoTrack,
            ],
        );

    /*
     * Restore physical camera video.
     */
    const disableAvatar =
        useCallback(
            async (): Promise<void> => {
                if (
                    switchingRef.current ||
                    !isAvatarActive
                ) {
                    return;
                }

                if (!videoSenderReady) {
                    throw new Error(
                        "WebRTC video is not ready yet.",
                    );
                }

                const cameraTrack =
                    cameraVideoTrackRef.current;

                if (!cameraTrack) {
                    throw new Error(
                        "Camera video track is unavailable.",
                    );
                }

                if (
                    cameraTrack.readyState ===
                    "ended"
                ) {
                    throw new Error(
                        "Camera video track has ended.",
                    );
                }

                switchingRef.current =
                    true;

                try {
                    await replaceVideoTrack(
                        cameraTrack,
                    );

                    if (
                        !mountedRef.current
                    ) {
                        return;
                    }

                    setError(null);
                    isAvatarActiveRef.current = false;
                    setIsAvatarActive(false);
                } catch (error) {
                    const normalized =
                        error instanceof Error
                            ? error
                            : new Error(
                                  "Unable to restore camera video.",
                              );

                    console.error(
                        "[Avatar] Failed to restore camera:",
                        normalized,
                    );

                    if (
                        mountedRef.current
                    ) {
                        setError(
                            normalized.message,
                        );
                    }

                    throw normalized;
                } finally {
                    switchingRef.current =
                        false;
                }
            },
            [
                isAvatarActive,
                videoSenderReady,
                replaceVideoTrack,
            ],
        );

    /*
     * Public toggle.
     */
    const toggleAvatar =
        useCallback(
            async (): Promise<void> => {
                if (isAvatarActive) {
                    await disableAvatar();
                    return;
                }

                await enableAvatar();
            },
            [
                disableAvatar,
                enableAvatar,
                isAvatarActive,
            ],
        );

    /*
     * If avatar mode becomes unavailable while
     * active, restore the physical camera.
     */
    useEffect(() => {
        if (
            enabled ||
            !isAvatarActive
        ) {
            return;
        }

        void disableAvatar().catch(
            (error) => {
                console.error(
                    "[Avatar] Failed to disable avatar:",
                    error,
                );
            },
        );
    }, [
        enabled,
        isAvatarActive,
        disableAvatar,
    ]);

    /*
     * If the physical camera disappears while
     * avatar mode is active, keep the avatar
     * capture stream alive.
     *
     * Face tracking itself will stop because
     * useFaceTracking no longer has a camera
     * stream.
     */
    useEffect(() => {
        if (
            cameraStream ||
            !isAvatarActive
        ) {
            return;
        }

        setError(
            "Camera is unavailable. Avatar tracking has stopped.",
        );
    }, [
        cameraStream,
        isAvatarActive,
    ]);

    /*
     * Destroy only avatar-owned media.
     *
     * IMPORTANT:
     * Never stop cameraVideoTrackRef here.
     *
     * The physical camera belongs to useWebRTC()
     * or the camera/media acquisition layer.
     */
    useEffect(() => {
        return () => {
            const stream =
                avatarStreamRef.current;

            avatarStreamRef.current =
                null;

            avatarVideoTrackRef.current =
                null;

            isAvatarActiveRef.current = false;

            avatarCanvasRef.current =
                null;

            if (stream) {
                stream
                    .getTracks()
                    .forEach(
                        (track) => {
                            if (
                                track.readyState !==
                                "ended"
                            ) {
                                track.stop();
                            }
                        },
                    );
            }

            if (mountedRef.current) {
                setAvatarStream(null);
                setAvatarVideoTrack(null);
                setIsAvatarActive(false);
            }
        };
    }, []);

    return {
        avatarStream,
        avatarVideoTrack,

        isAvatarActive,

        error,

        handleAvatarCanvasReady,

        enableAvatar,
        disableAvatar,
        toggleAvatar,
    };
}