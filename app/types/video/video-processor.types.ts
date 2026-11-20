import type { FaceTrackingState } from "@/app/types/face/face-tracking.types";

export type VideoProcessorMode =
    | "camera"
    | "avatar";

export interface VideoProcessorOptions {
    width?: number;

    height?: number;

    fps?: number;

    mode?: VideoProcessorMode;
}

export interface VideoProcessorFrame {
    video: HTMLVideoElement;

    tracking: FaceTrackingState | null;

    timestamp: number;
}

export interface VideoProcessorDiagnostics {
    width: number;

    height: number;

    fps: number;

    mode: VideoProcessorMode;

    frameCount: number;

    lastFrameTimestamp: number;

    outputTrackReady: boolean;

    avatarReady?: boolean;

    avatarImageLoaded?: boolean;

    avatarFramesRendered?: number;

    faceDetected?: boolean;

    faceX?: number;

    faceY?: number;

    faceWidth?: number;

    faceHeight?: number;
}

export interface VideoProcessorOutput {
    canvas: HTMLCanvasElement;

    stream: MediaStream;

    videoTrack: MediaStreamTrack;
}