import type { FaceTrackingState } from "@/app/types/face/face-tracking.types";

export interface AvatarFaceBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface AvatarFaceLandmark {
    x: number;
    y: number;
    z: number;
}

/**
 * Converts the live FaceTrackingState bounding box into the
 * normalized coordinate format used by the avatar renderer.
 */
export function getAvatarFaceBounds(
    tracking: FaceTrackingState,
): AvatarFaceBounds | null {
    const bounds = tracking.boundingBox;

    if (!bounds) {
        return null;
    }

    const x =
        typeof bounds.x === "number"
            ? bounds.x
            : 0;

    const y =
        typeof bounds.y === "number"
            ? bounds.y
            : 0;

    const width =
        typeof bounds.width === "number"
            ? bounds.width
            : 0;

    const height =
        typeof bounds.height === "number"
            ? bounds.height
            : 0;

    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
    ) {
        return null;
    }

    return {
        x: clamp01(x),
        y: clamp01(y),
        width: clamp01(width),
        height: clamp01(height),
    };
}

/**
 * Converts the live MediaPipe landmarks into the normalized
 * coordinate format used by the avatar renderer.
 *
 * IMPORTANT:
 *
 * We MUST preserve the original MediaPipe landmark indexes.
 *
 * Do not filter invalid landmarks out of the array because
 * removing one landmark shifts every following landmark index
 * and breaks source/live landmark correspondence.
 */
export function getAvatarLandmarks(
    tracking: FaceTrackingState,
): AvatarFaceLandmark[] {
    return tracking.landmarks.map(
        (landmark) => ({
            x: Number.isFinite(landmark.x)
                ? clamp01(landmark.x)
                : 0,

            y: Number.isFinite(landmark.y)
                ? clamp01(landmark.y)
                : 0,

            z: Number.isFinite(landmark.z)
                ? landmark.z
                : 0,
        }),
    );
}

function clamp01(
    value: number,
): number {
    return Math.min(
        Math.max(
            value,
            0,
        ),
        1,
    );
}