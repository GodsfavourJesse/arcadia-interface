/**
 * MediaPipe Face Landmarker landmark indices.
 *
 * These indices are intentionally kept in one place so that
 * the rest of the application does not depend on magic numbers.
 */

export const FACE_LANDMARK = {
    NOSE_TIP: 1,

    CHIN: 152,

    LEFT_EYE_INNER: 133,
    LEFT_EYE_OUTER: 33,

    RIGHT_EYE_INNER: 362,
    RIGHT_EYE_OUTER: 263,

    LEFT_EYE_TOP: 159,
    LEFT_EYE_BOTTOM: 145,

    RIGHT_EYE_TOP: 386,
    RIGHT_EYE_BOTTOM: 374,

    LEFT_MOUTH_CORNER: 61,
    RIGHT_MOUTH_CORNER: 291,

    MOUTH_TOP: 13,
    MOUTH_BOTTOM: 14,

    LEFT_EYEBROW_INNER: 107,
    LEFT_EYEBROW_OUTER: 70,

    RIGHT_EYEBROW_INNER: 336,
    RIGHT_EYEBROW_OUTER: 300,

    LEFT_CHEEK: 234,
    RIGHT_CHEEK: 454,

    FOREHEAD: 10,
} as const;