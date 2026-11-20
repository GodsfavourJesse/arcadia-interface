"use client";

import type {
    FaceLandmarker,
    FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

import {
    createFaceLandmarker,
} from "./face-landmarker";

import {
    calculateBoundingBox,
    calculateRotation,
} from "./face-tracking.math";

import {
    calculateEyes,
    calculateEyebrows,
    calculateMouth,
} from "./face-expressions";

import type {
    FacePoint,
    FaceTrackingState,
} from "@/app/types/face/face-tracking.types";

const EMPTY_STATE: FaceTrackingState = {
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

export class FaceTracker {
    private landmarker: FaceLandmarker | null =
        null;

    private lastTimestamp = -1;

    private state: FaceTrackingState = {
        ...EMPTY_STATE,
    };

    private closed = false;

    async initialize(): Promise<void> {
        if (this.landmarker) {
            return;
        }

        if (
            typeof window === "undefined" ||
            typeof document === "undefined"
        ) {
            throw new Error(
                "FaceTracker can only be initialized in a browser.",
            );
        }

        this.closed = false;

        const landmarker =
            await createFaceLandmarker();

        if (this.closed) {
            landmarker.close();

            return;
        }

        this.landmarker = landmarker;

        this.lastTimestamp = -1;

        this.state = {
            ...EMPTY_STATE,
        };
    }

    detect(
        video: HTMLVideoElement,
        timestamp: number,
    ): FaceTrackingState {
        if (this.closed) {
            return this.state;
        }

        const landmarker =
            this.landmarker;

        if (!landmarker) {
            throw new Error(
                "FaceTracker has not been initialized.",
            );
        }

        if (
            !video ||
            video.readyState <
                HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
            return this.state;
        }

        if (
            video.videoWidth <= 0 ||
            video.videoHeight <= 0
        ) {
            return this.state;
        }

        if (
            video.paused ||
            video.ended
        ) {
            return this.state;
        }

        /*
         * MediaPipe VIDEO mode requires strictly
         * increasing timestamps.
         *
         * requestVideoFrameCallback and RAF can
         * occasionally provide the same timestamp,
         * so force the next timestamp to be at least
         * one millisecond newer.
         */
        const numericTimestamp =
            Number.isFinite(timestamp)
                ? Math.floor(timestamp)
                : Date.now();

        const safeTimestamp =
            Math.max(
                numericTimestamp,
                this.lastTimestamp + 1,
            );

        let result:
            | FaceLandmarkerResult;

        try {
            /*
             * IMPORTANT:
             *
             * Feed the actual HTMLVideoElement directly
             * into MediaPipe.
             *
             * We do not copy the camera frame through a
             * 2D canvas anymore.
             *
             * MediaPipe's FaceLandmarker VIDEO API accepts
             * ImageSource objects such as HTMLVideoElement.
             */
            result =
                landmarker.detectForVideo(
                    video,
                    safeTimestamp,
                );
        } catch (error) {
            /*
             * Keep the last valid state rather than
             * destroying the tracking loop.
             *
             * The next frame can try again.
             */
            console.error(
                "[FaceTracker] detectForVideo failed:",
                error,
            );

            throw new Error(
                `MediaPipe face detection failed: ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`,
                {
                    cause: error,
                },
            );
        }

        this.lastTimestamp =
            safeTimestamp;

        this.state =
            this.processResult(
                result,
                safeTimestamp,
            );

        return this.state;
    }

    getState(): FaceTrackingState {
        return this.state;
    }

    close(): void {
        this.closed = true;

        try {
            this.landmarker?.close();
        } catch (error) {
            console.warn(
                "[FaceTracker] Error while closing FaceLandmarker:",
                error,
            );
        }

        this.landmarker = null;

        this.lastTimestamp = -1;

        this.state = {
            ...EMPTY_STATE,
        };
    }

    private processResult(
        result: FaceLandmarkerResult,
        timestamp: number,
    ): FaceTrackingState {
        const landmarks =
            result.faceLandmarks?.[0];

        if (
            !landmarks ||
            landmarks.length === 0
        ) {
            return {
                ...EMPTY_STATE,
                timestamp,
            };
        }

        const points: FacePoint[] =
            landmarks.map(
                (point) => ({
                    x: point.x,
                    y: point.y,
                    z: point.z,
                }),
            );

        const boundingBox =
            calculateBoundingBox(
                points,
            );

        const rotation =
            calculateRotation(
                points,
            );

        const eyes =
            calculateEyes(
                points,
            );

        const eyebrows =
            calculateEyebrows(
                points,
            );

        const mouth =
            calculateMouth(
                points,
            );

        return {
            detected: true,

            confidence:
                this.getConfidence(
                    result,
                ),

            landmarks: points,

            boundingBox,

            rotation,

            eyes,

            mouth,

            eyebrows,

            timestamp,
        };
    }

    private getConfidence(
        result: FaceLandmarkerResult,
    ): number {
        const landmarks =
            result.faceLandmarks?.[0];

        if (
            !landmarks ||
            landmarks.length === 0
        ) {
            return 0;
        }

        /*
         * FaceLandmarkerResult does not expose a simple
         * per-face detection confidence in the same form
         * as some other MediaPipe APIs.
         *
         * Presence of a valid landmark set is therefore
         * treated as a valid detection.
         */
        return 1;
    }
}