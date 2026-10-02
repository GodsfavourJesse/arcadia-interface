import {
    StateMachineInputType,
    type StateMachineInput,
} from "@rive-app/canvas";

import type {
    AvatarTrackingState,
} from "@/app/types/avatar/avatar.types";

export type RiveTrackingParameterMapping = {
    headYaw?: string;
    headPitch?: string;
    headRoll?: string;

    gazeX?: string;
    gazeY?: string;

    leftBlink?: string;
    rightBlink?: string;

    mouthOpen?: string;
    smile?: string;
    funnel?: string;
    pucker?: string;
};

export type RiveTrackingInputs = {
    headYaw: StateMachineInput | null;
    headPitch: StateMachineInput | null;
    headRoll: StateMachineInput | null;

    gazeX: StateMachineInput | null;
    gazeY: StateMachineInput | null;

    leftBlink: StateMachineInput | null;
    rightBlink: StateMachineInput | null;

    mouthOpen: StateMachineInput | null;
    smile: StateMachineInput | null;
    funnel: StateMachineInput | null;
    pucker: StateMachineInput | null;
};

const DEFAULT_MAPPING: Required<RiveTrackingParameterMapping> = {
    headYaw: "headYaw",
    headPitch: "headPitch",
    headRoll: "headRoll",

    gazeX: "gazeX",
    gazeY: "gazeY",

    leftBlink: "leftBlink",
    rightBlink: "rightBlink",

    mouthOpen: "mouthOpen",
    smile: "smile",
    funnel: "funnel",
    pucker: "pucker",
};

export function createRiveTrackingInputs(
    inputs: StateMachineInput[],
    mapping: RiveTrackingParameterMapping = {},
): RiveTrackingInputs {
    const resolved = {
        ...DEFAULT_MAPPING,
        ...mapping,
    };

    return {
        headYaw: findInput(
            inputs,
            resolved.headYaw,
        ),

        headPitch: findInput(
            inputs,
            resolved.headPitch,
        ),

        headRoll: findInput(
            inputs,
            resolved.headRoll,
        ),

        gazeX: findInput(
            inputs,
            resolved.gazeX,
        ),

        gazeY: findInput(
            inputs,
            resolved.gazeY,
        ),

        leftBlink: findInput(
            inputs,
            resolved.leftBlink,
        ),

        rightBlink: findInput(
            inputs,
            resolved.rightBlink,
        ),

        mouthOpen: findInput(
            inputs,
            resolved.mouthOpen,
        ),

        smile: findInput(
            inputs,
            resolved.smile,
        ),

        funnel: findInput(
            inputs,
            resolved.funnel,
        ),

        pucker: findInput(
            inputs,
            resolved.pucker,
        ),
    };
}

export function updateRiveTrackingInputs(
    inputs: RiveTrackingInputs,
    tracking: AvatarTrackingState,
): void {
    setNumberInput(
        inputs.headYaw,
        tracking.head.yaw,
    );

    setNumberInput(
        inputs.headPitch,
        tracking.head.pitch,
    );

    setNumberInput(
        inputs.headRoll,
        tracking.head.roll,
    );

    setNumberInput(
        inputs.gazeX,
        tracking.eyes.gazeX,
    );

    setNumberInput(
        inputs.gazeY,
        tracking.eyes.gazeY,
    );

    setNumberInput(
        inputs.leftBlink,
        clamp01(tracking.eyes.leftBlink),
    );

    setNumberInput(
        inputs.rightBlink,
        clamp01(tracking.eyes.rightBlink),
    );

    setNumberInput(
        inputs.mouthOpen,
        clamp01(tracking.mouth.open),
    );

    setNumberInput(
        inputs.smile,
        clamp01(tracking.mouth.smile),
    );

    setNumberInput(
        inputs.funnel,
        clamp01(tracking.mouth.funnel),
    );

    setNumberInput(
        inputs.pucker,
        clamp01(tracking.mouth.pucker),
    );
}

function findInput(
    inputs: StateMachineInput[],
    name: string,
): StateMachineInput | null {
    return (
        inputs.find(
            (input) => input.name === name,
        ) ?? null
    );
}

function setNumberInput(
    input: StateMachineInput | null,
    value: number,
): void {
    if (!input) {
        return;
    }

    if (
        input.type !==
        StateMachineInputType.Number
    ) {
        return;
    }

    input.value = value;
}

function clamp01(value: number): number {
    return Math.min(
        1,
        Math.max(0, value),
    );
}