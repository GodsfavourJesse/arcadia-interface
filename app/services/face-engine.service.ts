import { apiRequest } from "@/app/lib/client";

export type FaceEngineStatus = {
    status: "ok";
    configured: boolean;
    generatorReady: boolean;
    liveSwapReady: boolean;
    liveSwapProvider: string | null;
    liveSwapReason?: string | null;
};

export type GenerateFaceCropInput = {
    referenceImage: string;
    sourceLandmarks: Array<[number, number]>;
    targetLandmarks: Array<[number, number]>;
    targetWidth: number;
    targetHeight: number;
};

export type GenerateFaceCropResponse = {
    status: "ok";
    mimeType: "image/png";
    imageBase64: string;
    crop: { x: number; y: number; width: number; height: number } | null;
    engine: string;
};

export function getFaceEngineStatus() {
    return apiRequest<FaceEngineStatus>("/face-engine/status");
}

export function generateFaceCrop(input: GenerateFaceCropInput) {
    return apiRequest<GenerateFaceCropResponse>("/face-engine/generate", {
        method: "POST",
        body: JSON.stringify(input),
    });
}
