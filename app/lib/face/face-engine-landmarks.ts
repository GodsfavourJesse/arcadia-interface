"use client";

import { createFaceLandmarker } from "./face-landmarker";

// This ordered subset must match training/landmarks.py in the Python service.
const FACE_ENGINE_LANDMARK_INDICES = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
    70, 63, 105, 107, 336, 296, 334, 300,
    33, 160, 158, 133, 153, 144, 362, 385, 387, 263, 373, 380,
    1, 2, 98, 327, 168, 6,
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308,
    324, 318, 402, 14, 87, 178, 88, 95,
] as const;

export type NormalizedFaceLandmarks = Array<[number, number]>;

export async function detectFaceLandmarksInImage(
    image: ImageBitmap,
): Promise<NormalizedFaceLandmarks> {
    const landmarker = await createFaceLandmarker("IMAGE");
    try {
        const result = landmarker.detect(image);
        const face = result.faceLandmarks?.[0];
        if (!face || face.length < 478) {
            throw new Error("No clear face was found in the selected photo.");
        }
        return FACE_ENGINE_LANDMARK_INDICES.map((index) => [face[index].x, face[index].y] as [number, number]);
    } finally {
        landmarker.close();
    }
}

export function selectFaceEngineLandmarks(
    landmarks: ReadonlyArray<{ x: number; y: number }>,
): NormalizedFaceLandmarks {
    if (landmarks.length < 478) {
        throw new Error("Face tracking has not produced enough landmarks yet.");
    }
    return FACE_ENGINE_LANDMARK_INDICES.map((index) => [landmarks[index].x, landmarks[index].y] as [number, number]);
}

export async function compressReferenceImage(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file);
    try {
        const maxSide = 768;
        const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Image preparation is unavailable in this browser.");
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/webp", 0.88);
        if (dataUrl.length > 1_450_000) {
            throw new Error("This photo is too detailed to send for neural processing. Choose a smaller image.");
        }
        return dataUrl;
    } finally {
        bitmap.close();
    }
}
