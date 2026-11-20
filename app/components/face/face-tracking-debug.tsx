"use client";

import type {
    FaceTrackingState,
} from "@/app/types/face/face-tracking.types";

interface FaceTrackingDebugProps {
    state: FaceTrackingState;
}

export function FaceTrackingDebug({
    state,
}: FaceTrackingDebugProps) {
    return (
        <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
            <div>
                detected:{" "}
                <strong>
                    {String(state.detected)}
                </strong>
            </div>

            <div>
                confidence:{" "}
                <strong>
                    {state.confidence.toFixed(3)}
                </strong>
            </div>

            <div>
                landmarks:{" "}
                <strong>
                    {state.landmarks.length}
                </strong>
            </div>

            <div>
                pitch:{" "}
                <strong>
                    {state.rotation.pitch.toFixed(3)}
                </strong>
            </div>

            <div>
                yaw:{" "}
                <strong>
                    {state.rotation.yaw.toFixed(3)}
                </strong>
            </div>

            <div>
                roll:{" "}
                <strong>
                    {state.rotation.roll.toFixed(3)}
                </strong>
            </div>

            <div>
                left eye:{" "}
                <strong>
                    {state.eyes.left.toFixed(3)}
                </strong>
            </div>

            <div>
                right eye:{" "}
                <strong>
                    {state.eyes.right.toFixed(3)}
                </strong>
            </div>

            <div>
                mouth openness:{" "}
                <strong>
                    {state.mouth.openness.toFixed(3)}
                </strong>
            </div>

            <div>
                mouth width:{" "}
                <strong>
                    {state.mouth.width.toFixed(3)}
                </strong>
            </div>

            <div>
                left eyebrow:{" "}
                <strong>
                    {state.eyebrows.left.toFixed(3)}
                </strong>
            </div>

            <div>
                right eyebrow:{" "}
                <strong>
                    {state.eyebrows.right.toFixed(3)}
                </strong>
            </div>
        </div>
    );
}