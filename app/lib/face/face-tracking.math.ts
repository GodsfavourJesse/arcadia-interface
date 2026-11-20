import type {
    FaceBoundingBox,
    FacePoint,
    FaceRotation,
} from "../../types/face/face-tracking.types";

export function distance(
    a: FacePoint,
    b: FacePoint,
): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;

    return Math.sqrt(
        dx * dx +
        dy * dy +
        dz * dz,
    );
}

export function clamp(
    value: number,
    min: number,
    max: number,
): number {
    return Math.min(
        Math.max(value, min),
        max,
    );
}

export function normalize(
    value: number,
    min: number,
    max: number,
): number {
    if (max === min) {
        return 0;
    }

    return clamp(
        (value - min) / (max - min),
        0,
        1,
    );
}

export function calculateBoundingBox(
    landmarks: FacePoint[],
): FaceBoundingBox | null {
    if (landmarks.length === 0) {
        return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const point of landmarks) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);

        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }

    if (
        !Number.isFinite(minX) ||
        !Number.isFinite(minY) ||
        !Number.isFinite(maxX) ||
        !Number.isFinite(maxY)
    ) {
        return null;
    }

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
    };
}

export function calculateRotation(
    landmarks: FacePoint[],
): FaceRotation {
    const nose = landmarks[1];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const forehead = landmarks[10];
    const chin = landmarks[152];

    if (
        !nose ||
        !leftCheek ||
        !rightCheek ||
        !forehead ||
        !chin
    ) {
        return {
            pitch: 0,
            yaw: 0,
            roll: 0,
        };
    }

    const horizontal = distance(
        leftCheek,
        rightCheek,
    );

    const vertical = distance(
        forehead,
        chin,
    );

    const roll = Math.atan2(
        rightCheek.y - leftCheek.y,
        rightCheek.x - leftCheek.x,
    );

    const faceCenterX =
        (leftCheek.x + rightCheek.x) / 2;

    const yawOffset =
        nose.x - faceCenterX;

    const yaw =
        horizontal > 0
            ? yawOffset / horizontal
            : 0;

    const faceCenterY =
        (forehead.y + chin.y) / 2;

    const pitchOffset =
        nose.y - faceCenterY;

    const pitch =
        vertical > 0
            ? pitchOffset / vertical
            : 0;

    return {
        pitch,
        yaw,
        roll,
    };
}