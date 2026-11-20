import {
    FACE_LANDMARK,
} from "./face-landmark-indices";

import {
    distance,
    normalize,
} from "./face-tracking.math";

import type {
    EyebrowState,
    EyeState,
    FacePoint,
    MouthState,
} from "../../types/face/face-tracking.types";

export function calculateEyes(
    landmarks: FacePoint[],
): EyeState {
    const leftTop =
        landmarks[FACE_LANDMARK.LEFT_EYE_TOP];

    const leftBottom =
        landmarks[FACE_LANDMARK.LEFT_EYE_BOTTOM];

    const leftInner =
        landmarks[FACE_LANDMARK.LEFT_EYE_INNER];

    const leftOuter =
        landmarks[FACE_LANDMARK.LEFT_EYE_OUTER];

    const rightTop =
        landmarks[FACE_LANDMARK.RIGHT_EYE_TOP];

    const rightBottom =
        landmarks[FACE_LANDMARK.RIGHT_EYE_BOTTOM];

    const rightInner =
        landmarks[FACE_LANDMARK.RIGHT_EYE_INNER];

    const rightOuter =
        landmarks[FACE_LANDMARK.RIGHT_EYE_OUTER];

    if (
        !leftTop ||
        !leftBottom ||
        !leftInner ||
        !leftOuter ||
        !rightTop ||
        !rightBottom ||
        !rightInner ||
        !rightOuter
    ) {
        return {
            left: 0,
            right: 0,
        };
    }

    const leftHeight = distance(
        leftTop,
        leftBottom,
    );

    const leftWidth = distance(
        leftInner,
        leftOuter,
    );

    const rightHeight = distance(
        rightTop,
        rightBottom,
    );

    const rightWidth = distance(
        rightInner,
        rightOuter,
    );

    return {
        left: normalize(
            leftHeight / Math.max(leftWidth, 0.0001),
            0.08,
            0.45,
        ),

        right: normalize(
            rightHeight / Math.max(rightWidth, 0.0001),
            0.08,
            0.45,
        ),
    };
}

export function calculateMouth(
    landmarks: FacePoint[],
): MouthState {
    const left =
        landmarks[FACE_LANDMARK.LEFT_MOUTH_CORNER];

    const right =
        landmarks[FACE_LANDMARK.RIGHT_MOUTH_CORNER];

    const top =
        landmarks[FACE_LANDMARK.MOUTH_TOP];

    const bottom =
        landmarks[FACE_LANDMARK.MOUTH_BOTTOM];

    if (!left || !right || !top || !bottom) {
        return {
            openness: 0,
            width: 0,
            smile: 0,
        };
    }

    const width = distance(left, right);

    const openness = distance(top, bottom);

    const opennessRatio =
        openness / Math.max(width, 0.0001);

    return {
        openness: normalize(
            opennessRatio,
            0.03,
            0.45,
        ),

        width: width,

        smile: normalize(
            opennessRatio,
            0.08,
            0.28,
        ),
    };
}

export function calculateEyebrows(
    landmarks: FacePoint[],
): EyebrowState {
    const leftInner =
        landmarks[
            FACE_LANDMARK.LEFT_EYEBROW_INNER
        ];

    const leftOuter =
        landmarks[
            FACE_LANDMARK.LEFT_EYEBROW_OUTER
        ];

    const rightInner =
        landmarks[
            FACE_LANDMARK.RIGHT_EYEBROW_INNER
        ];

    const rightOuter =
        landmarks[
            FACE_LANDMARK.RIGHT_EYEBROW_OUTER
        ];

    const forehead =
        landmarks[FACE_LANDMARK.FOREHEAD];

    if (
        !leftInner ||
        !leftOuter ||
        !rightInner ||
        !rightOuter ||
        !forehead
    ) {
        return {
            left: 0,
            right: 0,
        };
    }

    const leftDistance =
        distance(leftInner, forehead);

    const rightDistance =
        distance(rightInner, forehead);

    const leftOuterDistance =
        distance(leftOuter, forehead);

    const rightOuterDistance =
        distance(rightOuter, forehead);

    return {
        left: normalize(
            (leftDistance + leftOuterDistance) / 2,
            0.05,
            0.35,
        ),

        right: normalize(
            (rightDistance + rightOuterDistance) / 2,
            0.05,
            0.35,
        ),
    };
}