"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type MutableRefObject,
} from "react";

import {
    FaceLandmarker,
    FilesetResolver,
    type FaceLandmarkerResult,
    type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

import type {
    AvatarEyeState,
    AvatarFaceState,
    AvatarHeadRotation,
    AvatarMouthState,
    AvatarNoseState,
    AvatarTrackingState,
} from "@/app/types/avatar/avatar.types";

const MEDIAPIPE_WASM_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";

const FACE_LANDMARKER_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/**
 * MediaPipe inference target.
 *
 * The avatar renderer itself can continue at the display refresh rate.
 */
const INFERENCE_FPS = 30;
const INFERENCE_INTERVAL = 1000 / INFERENCE_FPS;

/**
 * Small tolerance prevents unnecessary skipped frames when
 * camera timestamps are slightly irregular.
 */
const INFERENCE_INTERVAL_TOLERANCE = 0.9;

/**
 * Keep the last valid tracking result briefly when MediaPipe
 * temporarily misses the face.
 */
const FACE_LOSS_GRACE_MS = 180;

/**
 * React UI does not need to render at inference frequency.
 */
const UI_UPDATE_INTERVAL = 100;

/**
 * MediaPipe confidence configuration.
 */
const MIN_FACE_DETECTION_CONFIDENCE = 0.35;
const MIN_FACE_PRESENCE_CONFIDENCE = 0.35;
const MIN_TRACKING_CONFIDENCE = 0.40;

/**
 * Pose limits.
 */
const MAX_YAW = Math.PI / 2;
const MAX_PITCH = Math.PI / 3;
const MAX_ROLL = Math.PI / 2;

/**
 * Smoothing response speeds.
 *
 * These are response rates rather than frame-dependent
 * interpolation coefficients.
 *
 * Higher = faster response.
 */
const HEAD_RESPONSE = 15;
const EYE_RESPONSE = 24;
const GAZE_RESPONSE = 22;
const MOUTH_RESPONSE = 20;
const FACE_POSITION_RESPONSE = 16;
const FACE_SCALE_RESPONSE = 12;

const BLINK_OPEN_THRESHOLD = 0.12;
const BLINK_CLOSE_THRESHOLD = 0.28;

const BLINK_CLOSE_RESPONSE = 34;
const BLINK_OPEN_RESPONSE = 24;
const BLINK_FAST_RESPONSE = 42;

/**
 * Fast-motion response.
 */
const HEAD_FAST_RESPONSE = 28;
const EXPRESSION_FAST_RESPONSE = 32;

/**
 * Maximum delta used by the tracking filters.
 */
const MAX_DELTA_SECONDS = 0.1;

/**
 * Face position sensitivity.
 */
const FACE_POSITION_SCALE = 2.0;

/**
 * Face scale normalization.
 *
 * This is based on the distance between the outer eye landmarks.
 */
const FACE_SCALE_REFERENCE = 0.22;

export type UseFaceTrackingOptions = {
    video: HTMLVideoElement | null;
    enabled?: boolean;
};

export type UseFaceTrackingResult = {
    tracking: AvatarTrackingState;
    trackingRef: MutableRefObject<AvatarTrackingState>;
    isReady: boolean;
    isTracking: boolean;
    error: string | null;
};

type ScalarFilter = {
    value: number;
    velocity: number;
    active?: boolean;
};

type TrackingFilters = {
    faceX: ScalarFilter;
    faceY: ScalarFilter;
    faceScale: ScalarFilter;

    noseX: ScalarFilter;
    noseY: ScalarFilter;
    noseZ: ScalarFilter;

    yaw: ScalarFilter;
    pitch: ScalarFilter;
    roll: ScalarFilter;

    leftBlink: ScalarFilter;
    rightBlink: ScalarFilter;

    mouthOpen: ScalarFilter;
    smile: ScalarFilter;
    funnel: ScalarFilter;
    pucker: ScalarFilter;

    gazeX: ScalarFilter;
    gazeY: ScalarFilter;
};

/**
 * MediaPipe's WASM runtime can emit some informational messages
 * through stderr, which Next.js may surface through console.error.
 */
const MEDIAPIPE_INFO_PATTERN =
    /Created TensorFlow Lite XNNPACK delegate for CPU/i;

let mediaPipeLogFilterInstalled = false;

function installMediaPipeLogFilter(): void {
    if (
        mediaPipeLogFilterInstalled ||
        typeof window === "undefined"
    ) {
        return;
    }

    mediaPipeLogFilterInstalled = true;

    const originalError = console.error;

    console.error = (...args: unknown[]) => {
        const first = args[0];

        if (
            typeof first === "string" &&
            MEDIAPIPE_INFO_PATTERN.test(first)
        ) {
            console.info(first);
            return;
        }

        originalError.apply(console, args);
    };
}

function createFilter(
    value = 0,
): ScalarFilter {
    return {
        value,
        velocity: 0,
        active: false,
    };
}

function createFilters(): TrackingFilters {
    return {
        faceX: createFilter(),
        faceY: createFilter(),
        faceScale: createFilter(),

        noseX: createFilter(),
        noseY: createFilter(),
        noseZ: createFilter(),

        yaw: createFilter(),
        pitch: createFilter(),
        roll: createFilter(),

        leftBlink: createFilter(),
        rightBlink: createFilter(),

        mouthOpen: createFilter(),
        smile: createFilter(),
        funnel: createFilter(),
        pucker: createFilter(),

        gazeX: createFilter(),
        gazeY: createFilter(),
    };
}

function createNeutralTracking(): AvatarTrackingState {
    return {
        faceDetected: false,

        face: {
            x: 0,
            y: 0,
            scale: 1,
        },

        nose: {
            x: 0.5,
            y: 0.5,
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
}

function clamp(
    value: number,
    min: number,
    max: number,
): number {
    return Math.min(
        max,
        Math.max(min, value),
    );
}

function clamp01(
    value: number,
): number {
    return clamp(value, 0, 1);
}

function getBlendshapeScore(
    result: FaceLandmarkerResult,
    name: string,
): number {
    const categories =
        result.faceBlendshapes?.[0]?.categories;

    if (!categories) {
        return 0;
    }

    const category =
        categories.find(
            (item) =>
                item.categoryName === name,
        );

    return category?.score ?? 0;
}

function normalizeAngle(
    angle: number,
): number {
    let value = angle;

    while (value > Math.PI) {
        value -= Math.PI * 2;
    }

    while (value < -Math.PI) {
        value += Math.PI * 2;
    }

    return value;
}

/**
 * Delta-time based exponential smoothing.
 *
 * Unlike:
 *
 *     value += (target - value) * 0.2
 *
 * this behaves consistently across different display
 * refresh rates.
 */
function smoothScalar(
    filter: ScalarFilter,
    target: number,
    response: number,
    fastResponse: number,
    deltaSeconds: number,
): number {
    const safeDelta =
        clamp(
            deltaSeconds,
            0.001,
            MAX_DELTA_SECONDS,
        );

    const difference =
        target - filter.value;

    const rawVelocity =
        difference / safeDelta;

    filter.velocity +=
        (rawVelocity - filter.velocity) *
        0.45;

    const speed =
        Math.abs(filter.velocity);

    const speedNormalized =
        clamp(
            speed / 3,
            0,
            1,
        );

    const adaptiveResponse =
        response +
        (fastResponse - response) *
            speedNormalized;

    const alpha =
        1 -
        Math.exp(
            -adaptiveResponse *
                safeDelta,
        );

    filter.value +=
        difference * alpha;

    return filter.value;
}

function smoothBlink(
    filter: ScalarFilter,
    rawValue: number,
    deltaSeconds: number,
): number {
    const value = clamp01(rawValue);

    /*
     * Hysteresis:
     *
     * When the eye is open, it needs a meaningful
     * coefficient before we consider it a blink.
     *
     * Once a blink has started, we keep it active
     * until the coefficient falls sufficiently low.
     */
    if (filter.active) {
        if (value <= BLINK_OPEN_THRESHOLD) {
            filter.active = false;
        }
    } else {
        if (value >= BLINK_CLOSE_THRESHOLD) {
            filter.active = true;
        }
    }

    /*
     * Ignore MediaPipe's small open-eye noise completely.
     */
    const target = filter.active
        ? clamp01(
              (value - BLINK_OPEN_THRESHOLD) /
                  (1 - BLINK_OPEN_THRESHOLD),
          )
        : 0;

    const safeDelta = clamp(
        deltaSeconds,
        0.001,
        MAX_DELTA_SECONDS,
    );

    const response = filter.active
        ? BLINK_CLOSE_RESPONSE
        : BLINK_OPEN_RESPONSE;

    const difference =
        target - filter.value;

    const rawVelocity =
        difference / safeDelta;

    filter.velocity +=
        (rawVelocity - filter.velocity) *
        0.5;

    const speed =
        Math.abs(filter.velocity);

    const adaptiveResponse =
        response +
        Math.min(
            speed * 2,
            BLINK_FAST_RESPONSE - response,
        );

    const alpha =
        1 -
        Math.exp(
            -adaptiveResponse *
                safeDelta,
        );

    filter.value +=
        difference * alpha;

    /*
     * Prevent tiny residual values from keeping
     * the avatar's eyelids microscopically closed.
     */
    if (
        !filter.active &&
        filter.value < 0.01
    ) {
        filter.value = 0;
        filter.velocity = 0;
    }

    return clamp01(filter.value);
}

function extractHeadPoseFromMatrix(
    result: FaceLandmarkerResult,
): AvatarHeadRotation | null {
    const matrix =
        result.facialTransformationMatrixes?.[0];

    if (
        !matrix ||
        matrix.data.length < 16
    ) {
        return null;
    }

    /*
     * MediaPipe provides the facial transformation
     * matrix in column-major layout.
     *
     * We extract an Euler representation using the
     * Y-X-Z rotation order:
     *
     *     yaw   = Y
     *     pitch = X
     *     roll  = Z
     */
    const m = matrix.data;

    const pitch =
        Math.asin(
            clamp(
                -m[9],
                -1,
                1,
            ),
        );

    const yaw =
        Math.atan2(
            m[8],
            m[10],
        );

    const roll =
        Math.atan2(
            m[1],
            m[5],
        );

    return {
        yaw: clamp(
            normalizeAngle(yaw),
            -MAX_YAW,
            MAX_YAW,
        ),

        pitch: clamp(
            normalizeAngle(pitch),
            -MAX_PITCH,
            MAX_PITCH,
        ),

        roll: clamp(
            normalizeAngle(roll),
            -MAX_ROLL,
            MAX_ROLL,
        ),
    };
}

function extractFallbackHeadPose(
    landmarks: NormalizedLandmark[],
): AvatarHeadRotation {
    const nose =
        landmarks[1];

    const leftEye =
        landmarks[33];

    const rightEye =
        landmarks[263];

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
        (leftEye.x + rightEye.x) /
        2;

    const eyeCenterY =
        (leftEye.y + rightEye.y) /
        2;

    const eyeDistance =
        Math.max(
            Math.abs(
                rightEye.x -
                    leftEye.x,
            ),
            0.001,
        );

    const horizontalOffset =
        (nose.x - eyeCenterX) /
        eyeDistance;

    const verticalOffset =
        (nose.y - eyeCenterY) /
        eyeDistance;

    const roll =
        Math.atan2(
            rightEye.y -
                leftEye.y,
            rightEye.x -
                leftEye.x,
        );

    return {
        yaw: clamp(
            horizontalOffset * 1.25,
            -MAX_YAW,
            MAX_YAW,
        ),

        pitch: clamp(
            verticalOffset * 1.1,
            -MAX_PITCH,
            MAX_PITCH,
        ),

        roll: clamp(
            roll,
            -MAX_ROLL,
            MAX_ROLL,
        ),
    };
}

function extractFace(
    landmarks: NormalizedLandmark[],
): {
    face: AvatarFaceState;
    nose: AvatarNoseState;
} {
    const nose =
        landmarks[1];

    const leftEye =
        landmarks[33];

    const rightEye =
        landmarks[263];

    if (
        !nose ||
        !leftEye ||
        !rightEye
    ) {
        return {
            face: {
                x: 0,
                y: 0,
                scale: 1,
            },

            nose: {
                x: 0.5,
                y: 0.5,
                z: 0,
            },
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

    const faceX =
        clamp(
            (eyeCenterX - 0.5) *
                FACE_POSITION_SCALE,
            -1,
            1,
        );

    const faceY =
        clamp(
            (eyeCenterY - 0.5) *
                FACE_POSITION_SCALE,
            -1,
            1,
        );

    const faceScale =
        clamp(
            eyeDistance /
                FACE_SCALE_REFERENCE,
            0.55,
            1.8,
        );

    return {
        face: {
            x: faceX,
            y: faceY,
            scale: faceScale,
        },

        nose: {
            x: clamp(
                nose.x,
                0,
                1,
            ),

            y: clamp(
                nose.y,
                0,
                1,
            ),

            z: nose.z,
        },
    };
}

function extractEyes(
    result: FaceLandmarkerResult,
): AvatarEyeState {
    const score =
        (name: string) =>
            getBlendshapeScore(
                result,
                name,
            );

    const leftBlink =
        score("eyeBlinkLeft");

    const rightBlink =
        score("eyeBlinkRight");

    const eyeLookInLeft =
        score("eyeLookInLeft");

    const eyeLookOutLeft =
        score("eyeLookOutLeft");

    const eyeLookInRight =
        score("eyeLookInRight");

    const eyeLookOutRight =
        score("eyeLookOutRight");

    const lookUpLeft =
        score("eyeLookUpLeft");

    const lookUpRight =
        score("eyeLookUpRight");

    const lookDownLeft =
        score("eyeLookDownLeft");

    const lookDownRight =
        score("eyeLookDownRight");

    const gazeX =
        (
            eyeLookOutLeft +
            eyeLookOutRight -
            eyeLookInLeft -
            eyeLookInRight
        ) / 2;

    const gazeY =
        (
            lookUpLeft +
            lookUpRight -
            lookDownLeft -
            lookDownRight
        ) / 2;

    return {
        leftBlink:
            clamp01(
                leftBlink,
            ),

        rightBlink:
            clamp01(
                rightBlink,
            ),

        gazeX:
            clamp(
                gazeX,
                -1,
                1,
            ),

        gazeY:
            clamp(
                gazeY,
                -1,
                1,
            ),
    };
}

function extractMouth(
    result: FaceLandmarkerResult,
): AvatarMouthState {
    const score =
        (name: string) =>
            getBlendshapeScore(
                result,
                name,
            );

    return {
        open: clamp01(
            Math.max(
                score("jawOpen"),
                score("mouthOpen"),
            ),
        ),

        smile: clamp01(
            (
                score(
                    "mouthSmileLeft",
                ) +
                score(
                    "mouthSmileRight",
                )
            ) / 2,
        ),

        funnel: clamp01(
            score(
                "mouthFunnel",
            ),
        ),

        pucker: clamp01(
            score(
                "mouthPucker",
            ),
        ),
    };
}

function applyTrackingResult(
    current: AvatarTrackingState,
    result: FaceLandmarkerResult,
    filters: TrackingFilters,
    deltaSeconds: number,
): void {
    const landmarks =
        result.faceLandmarks?.[0];

    if (!landmarks) {
        return;
    }

    const rawHead =
        extractHeadPoseFromMatrix(
            result,
        ) ??
        extractFallbackHeadPose(
            landmarks,
        );

    const rawFace =
        extractFace(
            landmarks,
        );

    const rawEyes =
        extractEyes(result);

    const rawMouth =
        extractMouth(result);

    current.face.x =
        smoothScalar(
            filters.faceX,
            rawFace.face.x,
            FACE_POSITION_RESPONSE,
            HEAD_FAST_RESPONSE,
            deltaSeconds,
        );

    current.face.y =
        smoothScalar(
            filters.faceY,
            rawFace.face.y,
            FACE_POSITION_RESPONSE,
            HEAD_FAST_RESPONSE,
            deltaSeconds,
        );

    current.face.scale =
        smoothScalar(
            filters.faceScale,
            rawFace.face.scale,
            FACE_SCALE_RESPONSE,
            HEAD_FAST_RESPONSE,
            deltaSeconds,
        );

    current.nose.x =
        smoothScalar(
            filters.noseX,
            rawFace.nose.x,
            FACE_POSITION_RESPONSE,
            HEAD_FAST_RESPONSE,
            deltaSeconds,
        );

    current.nose.y =
        smoothScalar(
            filters.noseY,
            rawFace.nose.y,
            FACE_POSITION_RESPONSE,
            HEAD_FAST_RESPONSE,
            deltaSeconds,
        );

    current.nose.z =
        smoothScalar(
            filters.noseZ,
            rawFace.nose.z,
            FACE_POSITION_RESPONSE,
            HEAD_FAST_RESPONSE,
            deltaSeconds,
        );

    current.head.yaw =
        smoothScalar(
            filters.yaw,
            rawHead.yaw,
            HEAD_RESPONSE,
            HEAD_FAST_RESPONSE,
            deltaSeconds,
        );

    current.head.pitch =
        smoothScalar(
            filters.pitch,
            rawHead.pitch,
            HEAD_RESPONSE,
            HEAD_FAST_RESPONSE,
            deltaSeconds,
        );

    current.head.roll =
        smoothScalar(
            filters.roll,
            rawHead.roll,
            HEAD_RESPONSE,
            HEAD_FAST_RESPONSE,
            deltaSeconds,
        );

        current.eyes.leftBlink = smoothBlink(
            filters.leftBlink,
            rawEyes.leftBlink,
            deltaSeconds,
        );

        current.eyes.rightBlink = smoothBlink(
            filters.rightBlink,
            rawEyes.rightBlink,
            deltaSeconds,
        );

    current.eyes.gazeX =
        smoothScalar(
            filters.gazeX,
            rawEyes.gazeX,
            GAZE_RESPONSE,
            EXPRESSION_FAST_RESPONSE,
            deltaSeconds,
        );

    current.eyes.gazeY =
        smoothScalar(
            filters.gazeY,
            rawEyes.gazeY,
            GAZE_RESPONSE,
            EXPRESSION_FAST_RESPONSE,
            deltaSeconds,
        );

    current.mouth.open =
        smoothScalar(
            filters.mouthOpen,
            rawMouth.open,
            MOUTH_RESPONSE,
            EXPRESSION_FAST_RESPONSE,
            deltaSeconds,
        );

    current.mouth.smile =
        smoothScalar(
            filters.smile,
            rawMouth.smile,
            MOUTH_RESPONSE,
            EXPRESSION_FAST_RESPONSE,
            deltaSeconds,
        );

    current.mouth.funnel =
        smoothScalar(
            filters.funnel,
            rawMouth.funnel,
            MOUTH_RESPONSE,
            EXPRESSION_FAST_RESPONSE,
            deltaSeconds,
        );

    current.mouth.pucker =
        smoothScalar(
            filters.pucker,
            rawMouth.pucker,
            MOUTH_RESPONSE,
            EXPRESSION_FAST_RESPONSE,
            deltaSeconds,
        );
}

function stringifyError(
    error: unknown,
): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

async function createFaceLandmarker(): Promise<FaceLandmarker> {
    const resolver =
        await FilesetResolver.forVisionTasks(
            MEDIAPIPE_WASM_URL,
        );

    const createWithDelegate = (
        delegate: "GPU" | "CPU",
    ) =>
        FaceLandmarker.createFromOptions(
            resolver,
            {
                baseOptions: {
                    modelAssetPath:
                        FACE_LANDMARKER_MODEL_URL,
                    delegate,
                },

                runningMode: "VIDEO",

                numFaces: 1,

                minFaceDetectionConfidence:
                    MIN_FACE_DETECTION_CONFIDENCE,

                minFacePresenceConfidence:
                    MIN_FACE_PRESENCE_CONFIDENCE,

                minTrackingConfidence:
                    MIN_TRACKING_CONFIDENCE,

                outputFaceBlendshapes:
                    true,

                outputFacialTransformationMatrixes:
                    true,
            },
        );

    try {
        return await createWithDelegate(
            "GPU",
        );
    } catch (gpuError) {
        console.warn(
            "[Miyor] GPU face tracking initialization failed. Falling back to CPU.",
            gpuError,
        );

        return createWithDelegate(
            "CPU",
        );
    }
}

export function useFaceTracking({
    video,
    enabled = true,
}: UseFaceTrackingOptions): UseFaceTrackingResult {
    const faceLandmarkerRef =
        useRef<FaceLandmarker | null>(
            null,
        );

    const mountedRef =
        useRef(true);

    const trackingRef =
        useRef<AvatarTrackingState>(
            createNeutralTracking(),
        );

    const filtersRef =
        useRef<TrackingFilters>(
            createFilters(),
        );

    const lastInferenceTimeRef =
        useRef(0);

    const lastDetectionTimestampRef =
        useRef(0);

    const lastFaceSeenTimeRef =
        useRef(0);

    const lastProcessingTimeRef =
        useRef(0);

    const lastUiUpdateTimeRef =
        useRef(0);

    const frameCallbackIdRef =
        useRef<number | null>(
            null,
        );

    const animationFrameIdRef =
        useRef<number | null>(
            null,
        );

    const processingRef =
        useRef(false);

    const isTrackingRef =
        useRef(false);

    const [tracking, setTracking] =
        useState<AvatarTrackingState>(
            createNeutralTracking(),
        );

    const [isReady, setIsReady] =
        useState(false);

    const [isTracking, setIsTracking] =
        useState(false);

    const [error, setError] =
        useState<string | null>(
            null,
        );

    const updateIsTracking =
        useCallback(
            (next: boolean) => {
                if (
                    isTrackingRef.current ===
                    next
                ) {
                    return;
                }

                isTrackingRef.current =
                    next;

                setIsTracking(next);
            },
            [],
        );

    const resetTracking =
        useCallback(() => {
            const neutral =
                createNeutralTracking();

            trackingRef.current =
                neutral;

            filtersRef.current =
                createFilters();

            lastFaceSeenTimeRef.current =
                0;

            lastInferenceTimeRef.current =
                0;

            lastDetectionTimestampRef.current =
                0;

            lastProcessingTimeRef.current =
                0;

            setTracking(
                neutral,
            );

            updateIsTracking(
                false,
            );
        }, [
            updateIsTracking,
        ]);

    useEffect(() => {
        mountedRef.current =
            true;

        return () => {
            mountedRef.current =
                false;
        };
    }, []);

    /**
     * Initialize MediaPipe.
     */
    useEffect(() => {
        let cancelled =
            false;

        if (
            !enabled ||
            !video
        ) {
            setIsReady(false);
            resetTracking();

            return;
        }

        installMediaPipeLogFilter();

        const initialize =
            async (): Promise<void> => {
                try {
                    setError(null);

                    const landmarker =
                        await createFaceLandmarker();

                    if (
                        cancelled ||
                        !mountedRef.current
                    ) {
                        landmarker.close();
                        return;
                    }

                    faceLandmarkerRef.current =
                        landmarker;

                    setIsReady(true);

                    console.info(
                        "[Miyor] Real-time Face Landmarker ready.",
                    );
                } catch (
                    initializationError
                ) {
                    if (
                        cancelled ||
                        !mountedRef.current
                    ) {
                        return;
                    }

                    console.error(
                        "[Miyor] Face tracking initialization failed.",
                        initializationError,
                    );

                    setError(
                        stringifyError(
                            initializationError,
                        ),
                    );

                    setIsReady(false);
                }
            };

        void initialize();

        return () => {
            cancelled = true;

            const landmarker =
                faceLandmarkerRef.current;

            faceLandmarkerRef.current =
                null;

            if (landmarker) {
                landmarker.close();
            }

            setIsReady(false);
        };
    }, [
        enabled,
        video,
        resetTracking,
    ]);

    /**
     * Process actual camera frames.
     */
    useEffect(() => {
        if (
            !enabled ||
            !video ||
            !isReady ||
            !faceLandmarkerRef.current
        ) {
            return;
        }

        let cancelled =
            false;

        const supportsVideoFrameCallback =
            "requestVideoFrameCallback" in
            HTMLVideoElement.prototype;

        const scheduleNextFrame =
            (): void => {
                if (cancelled) {
                    return;
                }

                if (
                    supportsVideoFrameCallback
                ) {
                    frameCallbackIdRef.current =
                        video.requestVideoFrameCallback(
                            processFrame,
                        );
                } else {
                    animationFrameIdRef.current =
                        requestAnimationFrame(
                            processFrame,
                        );
                }
            };

        const processFrame =
            (): void => {
                if (cancelled) {
                    return;
                }

                scheduleNextFrame();

                if (
                    processingRef.current
                ) {
                    return;
                }

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

                const now =
                    performance.now();

                if (
                    now -
                        lastInferenceTimeRef.current <
                    INFERENCE_INTERVAL *
                        INFERENCE_INTERVAL_TOLERANCE
                ) {
                    return;
                }

                lastInferenceTimeRef.current =
                    now;

                const landmarker =
                    faceLandmarkerRef.current;

                if (!landmarker) {
                    return;
                }

                processingRef.current =
                    true;

                try {
                    const timestamp =
                        Math.max(
                            Math.round(
                                now,
                            ),
                            lastDetectionTimestampRef.current +
                                1,
                        );

                    lastDetectionTimestampRef.current =
                        timestamp;

                    const result =
                        landmarker.detectForVideo(
                            video,
                            timestamp,
                        );

                    const currentTime =
                        performance.now();

                    const deltaSeconds =
                        lastProcessingTimeRef.current >
                        0
                            ? (
                                  currentTime -
                                  lastProcessingTimeRef.current
                              ) / 1000
                            : 1 /
                              INFERENCE_FPS;

                    lastProcessingTimeRef.current =
                        currentTime;

                    const hasFace =
                        Boolean(
                            result.faceLandmarks?.[0],
                        );

                    if (hasFace) {
                        lastFaceSeenTimeRef.current =
                            currentTime;

                        trackingRef.current.faceDetected =
                            true;

                        applyTrackingResult(
                            trackingRef.current,
                            result,
                            filtersRef.current,
                            deltaSeconds,
                        );

                        trackingRef.current.timestamp =
                            Date.now();

                        updateIsTracking(
                            true,
                        );

                        setError(
                            (previous) =>
                                previous ===
                                null
                                    ? previous
                                    : null,
                        );
                    } else {
                        const timeSinceFace =
                            currentTime -
                            lastFaceSeenTimeRef.current;

                        if (
                            timeSinceFace <=
                            FACE_LOSS_GRACE_MS
                        ) {
                            trackingRef.current.faceDetected =
                                true;

                            trackingRef.current.timestamp =
                                Date.now();
                        } else {
                            trackingRef.current.faceDetected =
                                false;

                            trackingRef.current.timestamp =
                                Date.now();

                            updateIsTracking(
                                false,
                            );
                        }
                    }

                    if (
                        currentTime -
                            lastUiUpdateTimeRef.current >=
                        UI_UPDATE_INTERVAL
                    ) {
                        lastUiUpdateTimeRef.current =
                            currentTime;

                        setTracking({
                            faceDetected:
                                trackingRef
                                    .current
                                    .faceDetected,

                            face: {
                                ...trackingRef
                                    .current
                                    .face,
                            },

                            nose: {
                                ...trackingRef
                                    .current
                                    .nose,
                            },

                            head: {
                                ...trackingRef
                                    .current
                                    .head,
                            },

                            eyes: {
                                ...trackingRef
                                    .current
                                    .eyes,
                            },

                            mouth: {
                                ...trackingRef
                                    .current
                                    .mouth,
                            },

                            timestamp:
                                trackingRef
                                    .current
                                    .timestamp,
                        });
                    }
                } catch (
                    detectionError
                ) {
                    console.warn(
                        "[Miyor] Face tracking frame failed.",
                        detectionError,
                    );
                } finally {
                    processingRef.current =
                        false;
                }
            };

        lastProcessingTimeRef.current =
            0;

        lastInferenceTimeRef.current =
            0;

        scheduleNextFrame();

        return () => {
            cancelled = true;

            if (
                frameCallbackIdRef.current !==
                null
            ) {
                video.cancelVideoFrameCallback?.(
                    frameCallbackIdRef.current,
                );

                frameCallbackIdRef.current =
                    null;
            }

            if (
                animationFrameIdRef.current !==
                null
            ) {
                cancelAnimationFrame(
                    animationFrameIdRef.current,
                );

                animationFrameIdRef.current =
                    null;
            }

            processingRef.current =
                false;
        };
    }, [
        enabled,
        video,
        isReady,
        updateIsTracking,
    ]);

    return {
        tracking,
        trackingRef,
        isReady,
        isTracking,
        error,
    };
}