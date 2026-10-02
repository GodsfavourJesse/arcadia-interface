"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    FaceLandmarker,
    FilesetResolver,
} from "@mediapipe/tasks-vision";

import type {
    AvatarTrackingState,
} from "@/app/types/avatar/avatar.types";

const MEDIAPIPE_WASM_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";

const FACE_LANDMARKER_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const TRACKING_FPS = 30;

const FRAME_INTERVAL =
    1000 / TRACKING_FPS;

const DEFAULT_TRACKING: AvatarTrackingState =
    {
        faceDetected: false,
        head: {
            yaw: 0,
            pitch: 0,
            roll: 0,
        },
        eyes: {
            leftBlink: 0,
            rightBlink: 0,
        },
        mouth: {
            open: 0,
            smile: 0,
        },
        timestamp: 0,
    };

type UseFaceTrackingOptions = {
    video: HTMLVideoElement | null;
    enabled?: boolean;
};

type UseFaceTrackingResult = {
    tracking: AvatarTrackingState;
    isReady: boolean;
    isTracking: boolean;
    error: string | null;
};

type BlendshapeCategory = {
    categoryName?: string;
    score?: number;
};

function clamp(
    value: number,
    min = 0,
    max = 1,
) {
    return Math.min(
        Math.max(value, min),
        max,
    );
}

function getBlendshapeScore(
    categories: BlendshapeCategory[],
    name: string,
) {
    const category =
        categories.find(
            (item) =>
                item.categoryName ===
                name,
        );

    return category?.score ?? 0;
}

function calculateHeadRotation(
    landmarks: {
        x: number;
        y: number;
        z: number;
    }[],
) {
    /*
     * MediaPipe coordinates:
     * - x increases left -> right
     * - y increases top -> bottom
     * - z is depth
     *
     * We use stable facial landmark
     * relationships for the first Phase 8A
     * implementation.
     *
     * The avatar itself applies smoothing/
     * scaling in AvatarCanvas.
     */

    const nose =
        landmarks[1];

    const leftEye =
        landmarks[33];

    const rightEye =
        landmarks[263];

    const leftMouth =
        landmarks[61];

    const rightMouth =
        landmarks[291];

    if (
        !nose ||
        !leftEye ||
        !rightEye ||
        !leftMouth ||
        !rightMouth
    ) {
        return {
            yaw: 0,
            pitch: 0,
            roll: 0,
        };
    }

    const eyeCenterX =
        (leftEye.x +
            rightEye.x) /
        2;

    const eyeCenterY =
        (leftEye.y +
            rightEye.y) /
        2;

    const eyeDistance =
        Math.max(
            Math.abs(
                rightEye.x -
                    leftEye.x,
            ),
            0.001,
        );

    /*
     * Horizontal nose offset relative
     * to the eye center.
     */
    const horizontalOffset =
        (nose.x -
            eyeCenterX) /
        eyeDistance;

    /*
     * Vertical nose offset relative
     * to the eye center.
     */
    const verticalOffset =
        (nose.y -
            eyeCenterY) /
        eyeDistance;

    /*
     * Eye-line rotation.
     */
    const roll =
        Math.atan2(
            rightEye.y -
                leftEye.y,
            rightEye.x -
                leftEye.x,
        );

    /*
     * Keep the initial ranges conservative.
     * AvatarCanvas applies additional scaling.
     */
    const yaw = clampAngle(
        horizontalOffset *
            1.25,
        -1.0,
        1.0,
    );

    const pitch = clampAngle(
        verticalOffset *
            0.9,
        -0.8,
        0.8,
    );

    return {
        yaw,
        pitch,
        roll: clampAngle(
            roll,
            -0.8,
            0.8,
        ),
    };
}

function clampAngle(
    value: number,
    min: number,
    max: number,
) {
    return Math.min(
        Math.max(value, min),
        max,
    );
}

function smoothValue(
    previous: number,
    next: number,
    factor = 0.35,
) {
    return (
        previous +
        (next - previous) *
            factor
    );
}

export function useFaceTracking({
    video,
    enabled = true,
}: UseFaceTrackingOptions): UseFaceTrackingResult {
    const faceLandmarkerRef =
        useRef<FaceLandmarker | null>(
            null,
        );

    const animationFrameRef =
        useRef<number | null>(
            null,
        );

    const lastVideoTimeRef =
        useRef<number>(-1);

    const lastFrameTimeRef =
        useRef<number>(0);

    const trackingRef =
        useRef<AvatarTrackingState>(
            DEFAULT_TRACKING,
        );

    const mountedRef =
        useRef(true);

    const initializingRef =
        useRef(false);

    const [tracking, setTracking] =
        useState<AvatarTrackingState>(
            DEFAULT_TRACKING,
        );

    const [isReady, setIsReady] =
        useState(false);

    const [isTracking, setIsTracking] =
        useState(false);

    const [error, setError] =
        useState<string | null>(
            null,
        );

    const resetTracking =
        useCallback(() => {
            trackingRef.current =
                DEFAULT_TRACKING;

            setTracking(
                DEFAULT_TRACKING,
            );

            setIsTracking(false);
        }, []);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!enabled || !video) {
            resetTracking();

            return;
        }

        let cancelled = false;

        async function initialize() {
            if (
                initializingRef.current
            ) {
                return;
            }

            if (
                faceLandmarkerRef.current
            ) {
                return;
            }

            initializingRef.current =
                true;

            try {
                setError(null);

                const vision =
                    await FilesetResolver.forVisionTasks(
                        MEDIAPIPE_WASM_URL,
                    );

                if (cancelled) {
                    return;
                }

                const faceLandmarker =
                    await FaceLandmarker.createFromOptions(
                        vision,
                        {
                            baseOptions: {
                                modelAssetPath:
                                    FACE_LANDMARKER_MODEL_URL,
                                delegate: "GPU",
                            },

                            runningMode: "VIDEO",

                            numFaces: 1,

                            minFaceDetectionConfidence:
                                0.5,

                            minFacePresenceConfidence:
                                0.5,

                            minTrackingConfidence:
                                0.5,

                            outputFaceBlendshapes:
                                true,

                            outputFacialTransformationMatrixes:
                                true,
                        },
                    );

                if (
                    cancelled ||
                    !mountedRef.current
                ) {
                    faceLandmarker.close();

                    return;
                }

                faceLandmarkerRef.current =
                    faceLandmarker;

                setIsReady(true);
            } catch (initializationError) {
                console.error(
                    "[Avatar] Failed to initialize MediaPipe Face Landmarker:",
                    initializationError,
                );

                if (
                    !cancelled &&
                    mountedRef.current
                ) {
                    setError(
                        "Unable to initialize face tracking.",
                    );

                    setIsReady(false);
                }
            } finally {
                initializingRef.current =
                    false;
            }
        }

        void initialize();

        return () => {
            cancelled = true;
        };
    }, [
        enabled,
        video,
        resetTracking,
    ]);

    useEffect(() => {
        if (
            !enabled ||
            !video ||
            !isReady
        ) {
            resetTracking();

            return;
        }

        const faceLandmarker =
            faceLandmarkerRef.current;

        if (!faceLandmarker) {
            return;
        }

        let cancelled = false;

        const processFrame = (
            timestamp: number,
        ) => {
            if (
                cancelled ||
                !mountedRef.current
            ) {
                return;
            }

            animationFrameRef.current =
                requestAnimationFrame(
                    processFrame,
                );

            if (
                video.readyState <
                HTMLMediaElement.HAVE_CURRENT_DATA
            ) {
                return;
            }

            if (
                video.videoWidth <= 0 ||
                video.videoHeight <= 0
            ) {
                return;
            }

            if (
                timestamp -
                    lastFrameTimeRef.current <
                FRAME_INTERVAL
            ) {
                return;
            }

            lastFrameTimeRef.current =
                timestamp;

            const videoTime =
                video.currentTime;

            if (
                videoTime ===
                lastVideoTimeRef.current
            ) {
                return;
            }

            lastVideoTimeRef.current =
                videoTime;

            try {
                const result =
                    faceLandmarker.detectForVideo(
                        video,
                        timestamp,
                    );

                const landmarks =
                    result.faceLandmarks?.[0];

                if (
                    !landmarks ||
                    landmarks.length === 0
                ) {
                    if (
                        trackingRef
                            .current
                            .faceDetected
                    ) {
                        const nextTracking: AvatarTrackingState =
                            {
                                ...trackingRef.current,
                                faceDetected:
                                    false,
                                timestamp:
                                    performance.now(),
                            };

                        trackingRef.current =
                            nextTracking;

                        setTracking(
                            nextTracking,
                        );
                    }

                    setIsTracking(false);

                    return;
                }

                const head =
                    calculateHeadRotation(
                        landmarks,
                    );

                const blendshapes =
                    result
                        .faceBlendshapes?.[0]
                        ?.categories ??
                    [];

                const leftBlink =
                    getBlendshapeScore(
                        blendshapes,
                        "eyeBlinkLeft",
                    );

                const rightBlink =
                    getBlendshapeScore(
                        blendshapes,
                        "eyeBlinkRight",
                    );

                const mouthOpen =
                    Math.max(
                        getBlendshapeScore(
                            blendshapes,
                            "jawOpen",
                        ),
                        getBlendshapeScore(
                            blendshapes,
                            "mouthOpen",
                        ),
                    );

                const smileLeft =
                    getBlendshapeScore(
                        blendshapes,
                        "mouthSmileLeft",
                    );

                const smileRight =
                    getBlendshapeScore(
                        blendshapes,
                        "mouthSmileRight",
                    );

                const smile =
                    (
                        smileLeft +
                        smileRight
                    ) / 2;

                const previous =
                    trackingRef.current;

                const nextTracking: AvatarTrackingState =
                    {
                        faceDetected:
                            true,

                        head: {
                            yaw:
                                smoothValue(
                                    previous
                                        .head
                                        .yaw,
                                    head.yaw,
                                    0.3,
                                ),

                            pitch:
                                smoothValue(
                                    previous
                                        .head
                                        .pitch,
                                    head.pitch,
                                    0.3,
                                ),

                            roll:
                                smoothValue(
                                    previous
                                        .head
                                        .roll,
                                    head.roll,
                                    0.3,
                                ),
                        },

                        eyes: {
                            leftBlink:
                                smoothValue(
                                    previous
                                        .eyes
                                        .leftBlink,
                                    clamp(
                                        leftBlink,
                                    ),
                                    0.4,
                                ),

                            rightBlink:
                                smoothValue(
                                    previous
                                        .eyes
                                        .rightBlink,
                                    clamp(
                                        rightBlink,
                                    ),
                                    0.4,
                                ),
                        },

                        mouth: {
                            open:
                                smoothValue(
                                    previous
                                        .mouth
                                        .open,
                                    clamp(
                                        mouthOpen,
                                    ),
                                    0.35,
                                ),

                            smile:
                                smoothValue(
                                    previous
                                        .mouth
                                        .smile,
                                    clamp(
                                        smile,
                                    ),
                                    0.35,
                                ),
                        },

                        timestamp:
                            performance.now(),
                    };

                trackingRef.current =
                    nextTracking;

                setTracking(
                    nextTracking,
                );

                setIsTracking(true);
            } catch (trackingError) {
                console.error(
                    "[Avatar] Face tracking frame failed:",
                    trackingError,
                );
            }
        };

        lastFrameTimeRef.current =
            performance.now();

        animationFrameRef.current =
            requestAnimationFrame(
                processFrame,
            );

        return () => {
            cancelled = true;

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

            setIsTracking(false);
        };
    }, [
        enabled,
        video,
        isReady,
        resetTracking,
    ]);

    useEffect(() => {
        return () => {
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

            const faceLandmarker =
                faceLandmarkerRef.current;

            if (faceLandmarker) {
                faceLandmarker.close();

                faceLandmarkerRef.current =
                    null;
            }
        };
    }, []);

    return {
        tracking,
        isReady,
        isTracking,
        error,
    };
}