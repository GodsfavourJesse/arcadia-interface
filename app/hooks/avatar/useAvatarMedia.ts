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
    replaceVideoTrack: (
        track: MediaStreamTrack | null,
    ) => Promise<void>;
};

export function useAvatarMedia({
    cameraStream,
    enabled,
    replaceVideoTrack,
}: UseAvatarMediaOptions) {
    const avatarCanvasRef =
        useRef<HTMLCanvasElement | null>(
            null,
        );

    const avatarStreamRef =
        useRef<MediaStream | null>(
            null,
        );

    const avatarVideoTrackRef =
        useRef<MediaStreamTrack | null>(
            null,
        );

    const cameraVideoTrackRef =
        useRef<MediaStreamTrack | null>(
            null,
        );

    const switchingRef =
        useRef(false);

    const mountedRef =
        useRef(true);

    const [
        avatarStream,
        setAvatarStream,
    ] =
        useState<MediaStream | null>(
            null,
        );

    const [
        avatarVideoTrack,
        setAvatarVideoTrack,
    ] =
        useState<MediaStreamTrack | null>(
            null,
        );

    const [
        isAvatarActive,
        setIsAvatarActive,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null,
        );

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
     */
    useEffect(() => {
        const nextCameraTrack =
            cameraStream?.getVideoTracks()[0] ??
            null;

        const previousCameraTrack =
            cameraVideoTrackRef.current;

        cameraVideoTrackRef.current =
            nextCameraTrack;

        /*
         * If the physical camera changed while
         * avatar mode is active, the avatar itself
         * remains the WebRTC source.
         *
         * The new camera track is simply stored as
         * the track we will restore to when avatar
         * mode is disabled.
         */
        if (
            previousCameraTrack &&
            previousCameraTrack !==
                nextCameraTrack &&
            isAvatarActive
        ) {
            return;
        }

        /*
         * If avatar mode is not active, the WebRTC
         * sender should follow the current camera
         * track when a stream replacement occurs.
         *
         * This is intentionally fire-and-forget;
         * WebRTC owns the sender replacement.
         */
        if (
            !isAvatarActive &&
            previousCameraTrack !==
                nextCameraTrack
        ) {
            void replaceVideoTrack(
                nextCameraTrack,
            ).catch((error) => {
                console.error(
                    "[Avatar] Failed to reconcile camera track:",
                    error,
                );

                if (
                    mountedRef.current
                ) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "Unable to update camera video.",
                    );
                }
            });
        }
    }, [
        cameraStream,
        isAvatarActive,
        replaceVideoTrack,
    ]);

    /*
     * Create the avatar MediaStream from the
     * rendered avatar canvas.
     *
     * One canvas owns one capture stream.
     */
    const createAvatarStream =
        useCallback(
            (
                canvas: HTMLCanvasElement,
            ): MediaStream => {
                const existingStream =
                    avatarStreamRef.current;

                if (
                    existingStream &&
                    avatarCanvasRef.current ===
                        canvas
                ) {
                    return existingStream;
                }

                /*
                 * A new canvas means the previous
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
                            (track) =>
                                track.stop(),
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

                if (!videoTrack) {
                    stream
                        .getTracks()
                        .forEach(
                            (track) =>
                                track.stop(),
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

                if (
                    mountedRef.current
                ) {
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
     * AvatarCanvas calls this after creating
     * its WebGL canvas.
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
                        error instanceof
                        Error
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

                const cameraTrack =
                    cameraVideoTrackRef.current;

                if (!cameraTrack) {
                    throw new Error(
                        "Camera video track is unavailable.",
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
                    setIsAvatarActive(
                        true,
                    );
                } catch (error) {
                    const normalized =
                        error instanceof
                        Error
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
                    setIsAvatarActive(
                        false,
                    );
                } catch (error) {
                    const normalized =
                        error instanceof
                        Error
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
     * External avatar disable.
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
     * avatar mode is active, do not stop the
     * avatar stream. However, avatar mode can
     * no longer be meaningfully driven by the
     * camera, so expose the error.
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
     * The physical camera belongs to useWebRTC()
     * and must never be stopped here.
     */
    useEffect(() => {
        return () => {
            const stream =
                avatarStreamRef.current;

            avatarStreamRef.current =
                null;

            avatarVideoTrackRef.current =
                null;

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