export interface FacePoint {
    x: number;
    y: number;
    z: number;
}

export interface FaceBoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FaceRotation {
    pitch: number;
    yaw: number;
    roll: number;
}

export interface EyeState {
    left: number;
    right: number;
}

export interface MouthState {
    openness: number;
    width: number;
    smile: number;
}

export interface EyebrowState {
    left: number;
    right: number;
}

export interface FaceTrackingState {
    detected: boolean;

    confidence: number;

    landmarks: FacePoint[];

    boundingBox: FaceBoundingBox | null;

    rotation: FaceRotation;

    eyes: EyeState;

    mouth: MouthState;

    eyebrows: EyebrowState;

    timestamp: number;
}