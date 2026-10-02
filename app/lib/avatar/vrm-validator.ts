import type { VRM } from "@pixiv/three-vrm";

const REQUIRED_HUMANOID_BONES = [
    "head",
    "leftEye",
    "rightEye",
] as const;

const REQUIRED_EXPRESSIONS = [
    "blinkLeft",
    "blinkRight",
    "aa",
    "happy",
    "ou",
] as const;

export type VRMValidationResult = {
    valid: boolean;
    humanoid: boolean;
    humanoidBones: Record<
        (typeof REQUIRED_HUMANOID_BONES)[number],
        boolean
    >;
    expressionManager: boolean;
    expressions: Record<
        (typeof REQUIRED_EXPRESSIONS)[number],
        boolean
    >;
    lookAt: boolean;
};

export function validateVRM(vrm: VRM): VRMValidationResult {
    const humanoid = vrm.humanoid;

    const humanoidBones = {
        head:
            humanoid.getNormalizedBoneNode("head") !== null,

        leftEye:
            humanoid.getNormalizedBoneNode("leftEye") !== null,

        rightEye:
            humanoid.getNormalizedBoneNode("rightEye") !== null,
    };

    const expressionManager =
        vrm.expressionManager !== undefined;

    const expressions = {
        blinkLeft:
            vrm.expressionManager?.getExpression(
                "blinkLeft",
            ) !== null,

        blinkRight:
            vrm.expressionManager?.getExpression(
                "blinkRight",
            ) !== null,

        aa:
            vrm.expressionManager?.getExpression(
                "aa",
            ) !== null,

        happy:
            vrm.expressionManager?.getExpression(
                "happy",
            ) !== null,

        ou:
            vrm.expressionManager?.getExpression(
                "ou",
            ) !== null,
    };

    const lookAt = vrm.lookAt !== undefined;

    const valid =
        humanoidBones.head &&
        humanoidBones.leftEye &&
        humanoidBones.rightEye &&
        expressionManager &&
        expressions.blinkLeft &&
        expressions.blinkRight &&
        expressions.aa &&
        expressions.happy &&
        expressions.ou &&
        lookAt;

    return {
        valid,
        humanoid: true,
        humanoidBones,
        expressionManager,
        expressions,
        lookAt,
    };
}

export function logVRMValidation(
    result: VRMValidationResult,
): void {
    console.group(
        "[Miyor] VRM capability validation",
    );

    console.log(
        `VRM valid: ${result.valid ? "✓" : "✗"}`,
    );

    console.log(
        `Humanoid: ${result.humanoid ? "✓" : "✗"}`,
    );

    for (const [bone, available] of Object.entries(
        result.humanoidBones,
    )) {
        console.log(
            `${bone}: ${available ? "✓" : "✗"}`,
        );
    }

    console.log(
        `Expression manager: ${
            result.expressionManager ? "✓" : "✗"
        }`,
    );

    for (const [expression, available] of Object.entries(
        result.expressions,
    )) {
        console.log(
            `${expression}: ${available ? "✓" : "✗"}`,
        );
    }

    console.log(
        `LookAt: ${result.lookAt ? "✓" : "✗"}`,
    );

    console.groupEnd();
}