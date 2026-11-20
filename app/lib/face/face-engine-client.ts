"use client";

import type { FaceTrackingState } from "@/app/types/face/face-tracking.types";
import { compressReferenceImage, detectFaceLandmarksInImage, selectFaceEngineLandmarks } from "./face-engine-landmarks";
import type { NormalizedFaceLandmarks } from "./face-engine-landmarks";
import { generateFaceCrop, getFaceEngineStatus } from "@/app/services/face-engine.service";

export type FaceEngineAttempt =
    | { kind: "generated"; imageUrl: string }
    | { kind: "fallback"; message: string };

export async function tryGenerateNeuralFaceReference(
    file: File,
    tracking: FaceTrackingState,
    targetWidth: number,
    targetHeight: number,
): Promise<FaceEngineAttempt> {
    try {
        const status = await getFaceEngineStatus();
        if (!status.configured) {
            return {
                kind: "fallback",
                message: "The neural service is not connected yet. The live on-device face transformation is active.",
            };
        }
        if (!status.generatorReady) {
            return {
                kind: "fallback",
                message: "The Python service is connected, but a trained neural checkpoint is not installed yet. The live on-device face transformation is active.",
            };
        }
        if (!tracking.detected) {
            return {
                kind: "fallback",
                message: "Keep your face in view to prepare the live effect. The on-device transformation is active.",
            };
        }

        const bitmap = await createImageBitmap(file);
        let sourceLandmarks: NormalizedFaceLandmarks;
        try {
            sourceLandmarks = await detectFaceLandmarksInImage(bitmap);
        } finally {
            bitmap.close();
        }

        const generated = await generateFaceCrop({
            referenceImage: await compressReferenceImage(file),
            sourceLandmarks,
            targetLandmarks: selectFaceEngineLandmarks(tracking.landmarks),
            targetWidth,
            targetHeight,
        });
        return {
            kind: "generated",
            imageUrl: `data:${generated.mimeType};base64,${generated.imageBase64}`,
        };
    } catch (error) {
        return {
            kind: "fallback",
            message: error instanceof Error
                ? `${error.message} The live on-device face transformation is active.`
                : "Neural generation is unavailable. The live on-device face transformation is active.",
        };
    }
}
