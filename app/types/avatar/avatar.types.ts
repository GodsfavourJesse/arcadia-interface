export type AvatarHeadRotation = {
    yaw: number;
    pitch: number;
    roll: number;
};

export type AvatarEyeState = {
    leftBlink: number;
    rightBlink: number;
};

export type AvatarMouthState = {
    open: number;
    smile: number;
};

export type AvatarTrackingState = {
    faceDetected: boolean;
    head: AvatarHeadRotation;
    eyes: AvatarEyeState;
    mouth: AvatarMouthState;
    timestamp: number;
};

export type AvatarConfig = {
    modelUrl: string;
    enabled: boolean;
};

export type AvatarMediaState = {
    enabled: boolean;
    cameraStream: MediaStream | null;
    avatarStream: MediaStream | null;
    avatarVideoTrack: MediaStreamTrack | null;
};