"use client";

import {
    FaceLandmarker,
    FilesetResolver,
} from "@mediapipe/tasks-vision";

const WASM_PATH =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

const MODEL_PATH =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export async function createFaceLandmarker(runningMode: "IMAGE" | "VIDEO" = "VIDEO"): Promise<FaceLandmarker> {
    if (
        typeof window === "undefined"
    ) {
        throw new Error(
            "FaceLandmarker can only be created in a browser.",
        );
    }

    const vision =
        await FilesetResolver.forVisionTasks(
            WASM_PATH,
        );

    const options = {
        baseOptions: {
            modelAssetPath:
                MODEL_PATH,

            delegate:
                "GPU" as const,
        },

        /*
         * VIDEO mode must be configured when
         * the FaceLandmarker is created.
         */
        runningMode,

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
    };

    try {
        return await FaceLandmarker.createFromOptions(
            vision,
            options,
        );
    } catch (gpuError) {
        console.warn(
            "[FaceLandmarker] GPU initialization failed. Falling back to CPU.",
            gpuError,
        );
    }

    /*
     * CPU fallback.
     *
     * Some browsers/devices have WebGL/GPU delegate
     * problems. CPU keeps face tracking functional.
     */
    return FaceLandmarker.createFromOptions(
        vision,
        {
            ...options,

            baseOptions: {
                modelAssetPath:
                    MODEL_PATH,

                delegate:
                    "CPU" as const,
            },
        },
    );
}