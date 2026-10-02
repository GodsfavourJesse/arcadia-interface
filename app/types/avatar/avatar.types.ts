/**
 * Supported avatar asset types.
 *
 * - VRM: Rigged 3D humanoid avatar.
 * - GLTF: General GLTF/GLB 3D avatar.
 * - 2D: Rigged 2D avatar.
 * - IMAGE: Static image fallback.
 */
export const AVATAR_TYPE = {
    VRM: "vrm",
    GLTF: "gltf",
    TWO_D: "2d",
    IMAGE: "image",
} as const;

export type AvatarType =
    (typeof AVATAR_TYPE)[keyof typeof AVATAR_TYPE];

/**
 * Rendering strategy used by the avatar engine.
 */
export const AVATAR_RENDER_MODE = {
    VRM: "vrm",
    TWO_D: "2d",
    STATIC: "static",
} as const;

export type AvatarRenderMode =
    (typeof AVATAR_RENDER_MODE)[keyof typeof AVATAR_RENDER_MODE];

/**
 * Head orientation derived from local face tracking.
 *
 * Values are expressed in radians.
 */
export type AvatarHeadRotation = {
    yaw: number;
    pitch: number;
    roll: number;
};

/**
 * Eye state derived from local face tracking.
 *
 * Blink values are normalized to 0..1:
 * - 0 = open
 * - 1 = fully closed
 *
 * Gaze values are normalized directional values.
 */
export type AvatarEyeState = {
    leftBlink: number;
    rightBlink: number;
    gazeX: number;
    gazeY: number;
};

/**
 * Mouth state derived from local face tracking.
 *
 * Values are normalized to 0..1.
 */
export type AvatarMouthState = {
    open: number;
    smile: number;
    funnel: number;
    pucker: number;
};

/**
 * Complete local face-tracking state consumed by the avatar renderer.
 *
 * This type intentionally contains no WebRTC, networking, or backend
 * concerns. Tracking remains local to the user's device.
 */
export type AvatarTrackingState = {
    faceDetected: boolean;
    head: AvatarHeadRotation;
    eyes: AvatarEyeState;
    mouth: AvatarMouthState;
    timestamp: number;
};

export type AvatarRendererCapabilities = {
    headTracking: boolean;
    eyeTracking: boolean;
    mouthTracking: boolean;
    facialExpressions: boolean;
};

/**
 * Metadata describing an avatar available to the application.
 */
export type AvatarDefinition = {
    id: string;
    name: string;
    type: AvatarType;
    renderMode: AvatarRenderMode;
    thumbnailUrl: string;
    assetUrl: string;
    enabled: boolean;
    capabilities?: AvatarRendererCapabilities;
};

/**
 * Current avatar configuration.
 */
export type AvatarConfig = {
    avatar: AvatarDefinition | null;
    enabled: boolean;
};

/**
 * Runtime media state owned by the avatar module.
 *
 * These are browser-local media objects and must not be persisted
 * in application state sent to the backend.
 */
export type AvatarMediaState = {
    enabled: boolean;
    cameraStream: MediaStream | null;
    avatarStream: MediaStream | null;
    avatarVideoTrack: MediaStreamTrack | null;
};