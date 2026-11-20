"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    FaceTracker,
} from "@/app/lib/face/face-tracker";

import type {
    FaceTrackingState,
} from "@/app/types/face/face-tracking.types";

const INITIAL_STATE: FaceTrackingState = {
    detected: false,

    confidence: 0,

    landmarks: [],

    boundingBox: null,

    rotation: {
        pitch: 0,
        yaw: 0,
        roll: 0,
    },

    eyes: {
        left: 0,
        right: 0,
    },

    mouth: {
        openness: 0,
        width: 0,
        smile: 0,
    },

    eyebrows: {
        left: 0,
        right: 0,
    },

    timestamp: 0,
};

interface UseFaceTrackingOptions {
    videoRef: React.RefObject<
        HTMLVideoElement | null
    >;

    enabled?: boolean;

    detectionFps?: number;

    retryKey?: number;

    publishState?: boolean;

    onTrackingUpdate?: (
        state: FaceTrackingState,
    ) => void;
}

export function useFaceTracking({
    videoRef,
    enabled = true,
    detectionFps = 30,
    retryKey = 0,
    publishState = true,
    onTrackingUpdate,
}: UseFaceTrackingOptions) {
    const trackerRef =
        useRef<FaceTracker | null>(
            null,
        );

    const animationFrameRef =
        useRef<number | null>(
            null,
        );

    const videoFrameCallbackIdRef =
        useRef<number | null>(
            null,
        );

    const detectingRef =
        useRef(false);

    const lastDetectionTimeRef =
        useRef(0);

    const mountedRef =
        useRef(true);

    const [state, setState] =
        useState<FaceTrackingState>(
            INITIAL_STATE,
        );

    const stateRef = useRef<FaceTrackingState | null>(INITIAL_STATE);

    const [initialized, setInitialized] =
        useState(false);

    const [error, setError] =
        useState<Error | null>(null);

    const cancelScheduledFrame =
        useCallback(() => {
            const video =
                videoRef.current;

            if (
                animationFrameRef.current !==
                null
            ) {
                cancelAnimationFrame(
                    animationFrameRef.current,
                );

                animationFrameRef.current =
                    null;
            }

            if (
                video &&
                videoFrameCallbackIdRef.current !==
                    null &&
                "cancelVideoFrameCallback" in
                    video
            ) {
                (
                    video as HTMLVideoElement & {
                        cancelVideoFrameCallback: (
                            handle: number,
                        ) => void;
                    }
                ).cancelVideoFrameCallback(
                    videoFrameCallbackIdRef.current,
                );
            }

            videoFrameCallbackIdRef.current =
                null;
        }, [videoRef]);

    const stop = useCallback(() => {
        cancelScheduledFrame();

        detectingRef.current =
            false;

        lastDetectionTimeRef.current =
            0;

        trackerRef.current?.close();

        trackerRef.current =
            null;

        if (mountedRef.current) {
            setInitialized(false);
            setError(null);
            stateRef.current = INITIAL_STATE;

            if (publishState) setState(INITIAL_STATE);
        }
    }, [cancelScheduledFrame, publishState]);

    const initialize =
        useCallback(
            async () => {
                if (
                    trackerRef.current
                ) {
                    return trackerRef.current;
                }

                const tracker =
                    new FaceTracker();

                await tracker.initialize();

                if (
                    !mountedRef.current
                ) {
                    tracker.close();

                    throw new Error(
                        "Face tracking was cancelled.",
                    );
                }

                trackerRef.current =
                    tracker;

                setInitialized(
                    true,
                );

                setError(null);

                return tracker;
            },
            [],
        );

    useEffect(() => {
        mountedRef.current =
            true;

        return () => {
            mountedRef.current =
                false;
        };
    }, []);

    useEffect(() => {
        if (!enabled) {
            stop();
            return;
        }

        let cancelled = false;

        const waitForVideo =
            async (): Promise<HTMLVideoElement> => {
                while (
                    !cancelled
                ) {
                    const video =
                        videoRef.current;

                    if (
                        video &&
                        video.readyState >=
                            HTMLMediaElement.HAVE_CURRENT_DATA &&
                        video.videoWidth >
                            0 &&
                        video.videoHeight >
                            0 &&
                        !video.paused &&
                        !video.ended
                    ) {
                        return video;
                    }

                    await new Promise<void>(
                        (resolve) => {
                            requestAnimationFrame(
                                () =>
                                    resolve(),
                            );
                        },
                    );
                }

                throw new Error(
                    "Face tracking was cancelled.",
                );
            };

        const run =
            async () => {
                try {
                    const tracker =
                        await initialize();

                    if (
                        cancelled
                    ) {
                        tracker.close();

                        return;
                    }

                    await waitForVideo();

                    if (
                        cancelled
                    ) {
                        return;
                    }

                    const interval =
                        1000 /
                        Math.max(
                            1,
                            detectionFps,
                        );

                    const detectFrame =
                        (
                            timestamp: number,
                        ) => {
                            if (
                                cancelled
                            ) {
                                return;
                            }

                            const video =
                                videoRef.current;

                            if (
                                !video ||
                                video.readyState <
                                    HTMLMediaElement.HAVE_CURRENT_DATA ||
                                video.videoWidth <=
                                    0 ||
                                video.videoHeight <=
                                    0 ||
                                video.paused ||
                                video.ended
                            ) {
                                return;
                            }

                            if (
                                detectingRef.current
                            ) {
                                return;
                            }

                            if (
                                timestamp -
                                    lastDetectionTimeRef.current <
                                interval
                            ) {
                                return;
                            }

                            const activeTracker =
                                trackerRef.current;

                            if (
                                !activeTracker
                            ) {
                                return;
                            }

                            detectingRef.current =
                                true;

                            try {
                                const nextState =
                                    activeTracker.detect(
                                        video,
                                        timestamp,
                                    );

                                lastDetectionTimeRef.current =
                                    timestamp;

                                if (
                                    !cancelled &&
                                    mountedRef.current
                                ) {
                                    stateRef.current = nextState;
                                    if (publishState) setState(nextState);

                                    onTrackingUpdate?.(
                                        nextState,
                                    );

                                    setError(
                                        null,
                                    );
                                }
                            } catch (
                                detectionError
                            ) {
                                const normalizedError =
                                    detectionError instanceof
                                    Error
                                        ? detectionError
                                        : new Error(
                                              "Face detection failed.",
                                          );

                                console.error(
                                    "[FaceTracking] Detection error:",
                                    normalizedError,
                                );

                                /*
                                 * Do not immediately destroy
                                 * the tracker. A transient frame
                                 * failure should not kill the
                                 * entire camera pipeline.
                                 */
                                if (
                                    !cancelled &&
                                    mountedRef.current
                                ) {
                                    setError(
                                        normalizedError,
                                    );
                                }
                            } finally {
                                detectingRef.current =
                                    false;
                            }
                        };

                    const schedule =
                        () => {
                            if (
                                cancelled
                            ) {
                                return;
                            }

                            const video =
                                videoRef.current;

                            if (
                                video &&
                                "requestVideoFrameCallback" in
                                    video
                            ) {
                                videoFrameCallbackIdRef.current =
                                    (
                                        video as HTMLVideoElement & {
                                            requestVideoFrameCallback: (
                                                callback: (
                                                    now: number,
                                                    metadata: VideoFrameCallbackMetadata,
                                                ) => void,
                                            ) => number;
                                        }
                                    ).requestVideoFrameCallback(
                                        (
                                            now,
                                        ) => {
                                            detectFrame(
                                                now,
                                            );

                                            schedule();
                                        },
                                    );

                                return;
                            }

                            animationFrameRef.current =
                                requestAnimationFrame(
                                    (
                                        now,
                                    ) => {
                                        detectFrame(
                                            now,
                                        );

                                        schedule();
                                    },
                                );
                        };

                    schedule();
                } catch (
                    initializationError
                ) {
                    if (
                        cancelled
                    ) {
                        return;
                    }

                    const normalizedError =
                        initializationError instanceof
                        Error
                            ? initializationError
                            : new Error(
                                  "Unable to initialize face tracking.",
                              );

                    console.error(
                        "[FaceTracking] Initialization error:",
                        normalizedError,
                    );

                    if (
                        mountedRef.current
                    ) {
                        setError(
                            normalizedError,
                        );

                        setInitialized(
                            false,
                        );
                    }
                }
            };

        void run();

        return () => {
            cancelled = true;

            cancelScheduledFrame();

            detectingRef.current =
                false;

            lastDetectionTimeRef.current =
                0;

            trackerRef.current?.close();

            trackerRef.current =
                null;
        };
    }, [
        enabled,
        detectionFps,
        retryKey,
        publishState,
        initialize,
        onTrackingUpdate,
        cancelScheduledFrame,
        stop,
        videoRef,
    ]);

    return {
        state,
        stateRef,

        initialized,

        error,

        initialize,

        stop,
    };
}
