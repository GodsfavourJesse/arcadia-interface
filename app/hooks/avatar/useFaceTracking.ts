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

const HEAD_SMOOTHING = 0.3;
const EYE_SMOOTHING = 0.4;
const MOUTH_SMOOTHING = 0.35;
const GAZE_SMOOTHING = 0.3;

const MAX_HEAD_YAW =
    Math.PI / 2;

const MAX_HEAD_PITCH =
    Math.PI / 3;

const MAX_HEAD_ROLL =
    Math.PI / 3;

const DEFAULT_TRACKING: AvatarTrackingState = {
    faceDetected: false,

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

type FaceLandmark = {
    x: number;
    y: number;
    z: number;
};

type HeadRotation = {
    yaw: number;
    pitch: number;
    roll: number;
};

type EyeState = {
    leftBlink: number;
    rightBlink: number;
    gazeX: number;
    gazeY: number;
};

type MouthState = {
    open: number;
    smile: number;
    funnel: number;
    pucker: number;
};

function clamp(
    value: number,
    min = 0,
    max = 1,
): number {
    return Math.min(
        Math.max(value, min),
        max,
    );
}

function clampAngle(
    value: number,
    min: number,
    max: number,
): number {
    return Math.min(
        Math.max(value, min),
        max,
    );
}

function getBlendshapeScore(
    categories: BlendshapeCategory[],
    name: string,
): number {
    const category = categories.find(
        (item) =>
            item.categoryName === name,
    );

    return category?.score ?? 0;
}

function smoothValue(
    previous: number,
    next: number,
    factor: number,
): number {
    return (
        previous +
        (next - previous) * factor
    );
}

/**
 * Calculates a lightweight head rotation estimate
 * from stable facial landmarks.
 *
 * The returned values are radians, matching
 * AvatarHeadRotation's public contract.
 */
function calculateHeadRotation(
    landmarks: FaceLandmark[],
): HeadRotation {
    const nose = landmarks[1];

    const leftEye = landmarks[33];

    const rightEye = landmarks[263];

    if (
        !nose ||
        !leftEye ||
        !rightEye
    ) {
        return {
            yaw: 0,
            pitch: 0,
            roll: 0,
        };
    }

    const eyeCenterX =
        (leftEye.x + rightEye.x) / 2;

    const eyeCenterY =
        (leftEye.y + rightEye.y) / 2;

    const eyeDistance = Math.max(
        Math.hypot(
            rightEye.x - leftEye.x,
            rightEye.y - leftEye.y,
        ),
        0.001,
    );

    const horizontalOffset =
        (nose.x - eyeCenterX) /
        eyeDistance;

    const verticalOffset =
        (nose.y - eyeCenterY) /
        eyeDistance;

    const roll = Math.atan2(
        rightEye.y - leftEye.y,
        rightEye.x - leftEye.x,
    );

    /*
     * Convert the normalized landmark offsets
     * into actual angular values in radians.
     *
     * These are intentionally conservative because
     * the VRM renderer applies its own presentation
     * scaling.
     */
    const normalizedYaw = clampAngle(
        horizontalOffset * 1.25,
        -1,
        1,
    );

    const normalizedPitch = clampAngle(
        verticalOffset * 0.9,
        -1,
        1,
    );

    return {
        yaw:
            normalizedYaw *
            MAX_HEAD_YAW,

        pitch:
            normalizedPitch *
            MAX_HEAD_PITCH,

        roll: clampAngle(
            roll,
            -MAX_HEAD_ROLL,
            MAX_HEAD_ROLL,
        ),
    };
}

function calculateEyeState(
    blendshapes: BlendshapeCategory[],
): EyeState {
    const leftBlink = clamp(
        getBlendshapeScore(
            blendshapes,
            "eyeBlinkLeft",
        ),
    );

    const rightBlink = clamp(
        getBlendshapeScore(
            blendshapes,
            "eyeBlinkRight",
        ),
    );

    const leftLookIn =
        getBlendshapeScore(
            blendshapes,
            "eyeLookInLeft",
        );

    const leftLookOut =
        getBlendshapeScore(
            blendshapes,
            "eyeLookOutLeft",
        );

    const rightLookIn =
        getBlendshapeScore(
            blendshapes,
            "eyeLookInRight",
        );

    const rightLookOut =
        getBlendshapeScore(
            blendshapes,
            "eyeLookOutRight",
        );

    const leftLookUp =
        getBlendshapeScore(
            blendshapes,
            "eyeLookUpLeft",
        );

    const rightLookUp =
        getBlendshapeScore(
            blendshapes,
            "eyeLookUpRight",
        );

    const leftLookDown =
        getBlendshapeScore(
            blendshapes,
            "eyeLookDownLeft",
        );

    const rightLookDown =
        getBlendshapeScore(
            blendshapes,
            "eyeLookDownRight",
        );

    const gazeX = clamp(
        (
            (leftLookOut - leftLookIn) +
            (rightLookIn - rightLookOut)
        ) / 2,
        -1,
        1,
    );

    const gazeY = clamp(
        (
            (leftLookDown - leftLookUp) +
            (rightLookDown - rightLookUp)
        ) / 2,
        -1,
        1,
    );

    return {
        leftBlink,
        rightBlink,
        gazeX,
        gazeY,
    };
}

function calculateMouthState(
    blendshapes: BlendshapeCategory[],
): MouthState {
    const jawOpen =
        getBlendshapeScore(
            blendshapes,
            "jawOpen",
        );

    const mouthOpen =
        getBlendshapeScore(
            blendshapes,
            "mouthOpen",
        );

    const mouthOpenValue = clamp(
        Math.max(
            jawOpen,
            mouthOpen,
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

    const smile = clamp(
        (smileLeft + smileRight) / 2,
    );

    const funnel = clamp(
        getBlendshapeScore(
            blendshapes,
            "mouthFunnel",
        ),
    );

    const pucker = clamp(
        getBlendshapeScore(
            blendshapes,
            "mouthPucker",
        ),
    );

    return {
        open: mouthOpenValue,
        smile,
        funnel,
        pucker,
    };
}

function smoothTracking(
    previous: AvatarTrackingState,
    next: {
        head: HeadRotation;
        eyes: EyeState;
        mouth: MouthState;
        timestamp: number;
    },
): AvatarTrackingState {
    return {
        faceDetected: true,

        head: {
            yaw: smoothValue(
                previous.head.yaw,
                next.head.yaw,
                HEAD_SMOOTHING,
            ),

            pitch: smoothValue(
                previous.head.pitch,
                next.head.pitch,
                HEAD_SMOOTHING,
            ),

            roll: smoothValue(
                previous.head.roll,
                next.head.roll,
                HEAD_SMOOTHING,
            ),
        },

        eyes: {
            leftBlink: smoothValue(
                previous.eyes.leftBlink,
                next.eyes.leftBlink,
                EYE_SMOOTHING,
            ),

            rightBlink: smoothValue(
                previous.eyes.rightBlink,
                next.eyes.rightBlink,
                EYE_SMOOTHING,
            ),

            gazeX: smoothValue(
                previous.eyes.gazeX,
                next.eyes.gazeX,
                GAZE_SMOOTHING,
            ),

            gazeY: smoothValue(
                previous.eyes.gazeY,
                next.eyes.gazeY,
                GAZE_SMOOTHING,
            ),
        },

        mouth: {
            open: smoothValue(
                previous.mouth.open,
                next.mouth.open,
                MOUTH_SMOOTHING,
            ),

            smile: smoothValue(
                previous.mouth.smile,
                next.mouth.smile,
                MOUTH_SMOOTHING,
            ),

            funnel: smoothValue(
                previous.mouth.funnel,
                next.mouth.funnel,
                MOUTH_SMOOTHING,
            ),

            pucker: smoothValue(
                previous.mouth.pucker,
                next.mouth.pucker,
                MOUTH_SMOOTHING,
            ),
        },

        timestamp:
            next.timestamp,
    };
}

function createNoFaceTracking(
    timestamp: number,
): AvatarTrackingState {
    return {
        faceDetected: false,

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

        timestamp,
    };
}

export function useFaceTracking({
    video,
    enabled = true,
}: UseFaceTrackingOptions): UseFaceTrackingResult {
    const faceLandmarkerRef =
        useRef<FaceLandmarker | null>(null);

    const animationFrameRef =
        useRef<number | null>(null);

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

    const initializationPromiseRef =
        useRef<Promise<FaceLandmarker> | null>(
            null,
        );

    const [tracking, setTracking] =
        useState<AvatarTrackingState>(
            DEFAULT_TRACKING,
        );

    const [isReady, setIsReady] =
        useState(false);

    const [isTracking, setIsTracking] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const resetTracking =
        useCallback(() => {
            trackingRef.current =
                DEFAULT_TRACKING;

            setTracking(
                DEFAULT_TRACKING,
            );

            setIsTracking(false);
        }, []);

    const stopAnimationLoop =
        useCallback(() => {
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

            lastVideoTimeRef.current =
                -1;

            lastFrameTimeRef.current =
                0;

            setIsTracking(false);
        }, []);

    /*
     * Keep the mounted flag accurate for asynchronous
     * MediaPipe initialization.
     */
    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    /*
     * Initialize MediaPipe when tracking is enabled
     * and a video element is available.
     *
     * The detector remains browser-local.
     * No landmarks, blendshapes, or tracking state
     * are sent to the backend.
     */
    useEffect(() => {
        let cancelled = false;

        if (!enabled || !video) {
            setIsReady(false);
            setError(null);
            resetTracking();

            return () => {
                cancelled = true;
            };
        }

        async function getFaceLandmarker(): Promise<FaceLandmarker> {
            const existing =
                faceLandmarkerRef.current;

            if (existing) {
                return existing;
            }

            const pending =
                initializationPromiseRef.current;

            if (pending) {
                return pending;
            }

            const initialization =
                (async () => {
                    const vision =
                        await FilesetResolver.forVisionTasks(
                            MEDIAPIPE_WASM_URL,
                        );

                    return FaceLandmarker.createFromOptions(
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
                })();

            initializationPromiseRef.current =
                initialization;

            try {
                const faceLandmarker =
                    await initialization;

                if (
                    cancelled ||
                    !mountedRef.current
                ) {
                    faceLandmarker.close();

                    throw new Error(
                        "Face tracking initialization was cancelled.",
                    );
                }

                if (
                    !faceLandmarkerRef.current
                ) {
                    faceLandmarkerRef.current =
                        faceLandmarker;
                } else {
                    faceLandmarker.close();
                }

                return (
                    faceLandmarkerRef.current
                );
            } finally {
                if (
                    initializationPromiseRef.current ===
                    initialization
                ) {
                    initializationPromiseRef.current =
                        null;
                }
            }
        }

        async function initialize(): Promise<void> {
            try {
                setError(null);

                await getFaceLandmarker();

                if (
                    cancelled ||
                    !mountedRef.current
                ) {
                    return;
                }

                setIsReady(true);
            } catch (initializationError) {
                if (
                    cancelled ||
                    !mountedRef.current
                ) {
                    return;
                }

                console.error(
                    "[Avatar] Failed to initialize MediaPipe Face Landmarker:",
                    initializationError,
                );

                setError(
                    "Unable to initialize face tracking.",
                );

                setIsReady(false);
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

    /*
     * Process video frames locally.
     */
    useEffect(() => {
        if (
            !enabled ||
            !video ||
            !isReady
        ) {
            stopAnimationLoop();
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
        ): void => {
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
                    const noFace =
                        createNoFaceTracking(
                            performance.now(),
                        );

                    trackingRef.current =
                        noFace;

                    setTracking(noFace);
                    setIsTracking(false);

                    return;
                }

                const blendshapes =
                    result.faceBlendshapes?.[0]
                        ?.categories ?? [];

                const head =
                    calculateHeadRotation(
                        landmarks,
                    );

                const eyes =
                    calculateEyeState(
                        blendshapes,
                    );

                const mouth =
                    calculateMouthState(
                        blendshapes,
                    );

                const previous =
                    trackingRef.current;

                const nextTracking =
                    smoothTracking(
                        previous,
                        {
                            head,
                            eyes,
                            mouth,
                            timestamp:
                                performance.now(),
                        },
                    );

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

        lastVideoTimeRef.current =
            -1;

        lastFrameTimeRef.current =
            performance.now();

        animationFrameRef.current =
            requestAnimationFrame(
                processFrame,
            );

        return () => {
            cancelled = true;
            stopAnimationLoop();
        };
    }, [
        enabled,
        video,
        isReady,
        resetTracking,
        stopAnimationLoop,
    ]);

    /*
     * Final detector cleanup.
     *
     * The detector is kept alive while the hook remains
     * mounted so enabling/disabling tracking does not
     * repeatedly recreate the MediaPipe model.
     */
    useEffect(() => {
        return () => {
            mountedRef.current =
                false;

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

            initializationPromiseRef.current =
                null;
        };
    }, []);

    return {
        tracking,
        isReady,
        isTracking,
        error,
    };
}