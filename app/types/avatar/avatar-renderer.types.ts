import { FaceTrackingState } from "../face/face-tracking.types";

export interface AvatarRendererOptions {
    imageUrl: string;
    width: number;
    height: number;

    /**
     * Overall size of the avatar face relative
     * to the output frame.
     */
    faceScale?: number;

    /**
     * Vertical positioning adjustment.
     */
    verticalOffset?: number;
}

export interface AvatarRendererFrame {
    context: CanvasRenderingContext2D;
    width: number;
    height: number;
    tracking: FaceTrackingState | null;
    timestamp: number;
}

export interface AvatarRendererDiagnostics {
    initialized: boolean;
    imageLoaded: boolean;

    imageWidth: number;
    imageHeight: number;

    framesRendered: number;
    lastFrameTimestamp: number;

    faceDetected: boolean;

    faceX: number;
    faceY: number;
    faceWidth: number;
    faceHeight: number;

    /**
     * Phase 7B diagnostics.
     */
    puppetReady: boolean;
    sourceLandmarks: number;
    triangles: number;

    leftEyeMovement: number;
    rightEyeMovement: number;

    leftEyebrowMovement: number;
    rightEyebrowMovement: number;

    mouthOpenness: number;
    mouthWidth: number;
    mouthSmile: number;

    headYaw: number;
    headPitch: number;
    headRoll: number;
}