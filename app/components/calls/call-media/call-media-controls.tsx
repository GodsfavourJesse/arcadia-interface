"use client";

type CallMediaControlsProps = {
    muted: boolean;
    cameraEnabled: boolean;
    video: boolean;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onEnd: () => void;
};

export function CallMediaControls({
    muted,
    cameraEnabled,
    video,
    onToggleMute,
    onToggleCamera,
    onEnd,
}: CallMediaControlsProps) {
    return (
        <div className="flex items-center justify-center gap-3">
            <button
                type="button"
                onClick={onToggleMute}
                className="rounded-full bg-white/10 px-5 py-3 text-sm text-white transition hover:bg-white/20"
            >
                {muted ? "Unmute" : "Mute"}
            </button>

            {video && (
                <button
                    type="button"
                    onClick={onToggleCamera}
                    className="rounded-full bg-white/10 px-5 py-3 text-sm text-white transition hover:bg-white/20"
                >
                    {cameraEnabled
                        ? "Camera off"
                        : "Camera on"}
                </button>
            )}

            <button
                type="button"
                onClick={onEnd}
                className="rounded-full bg-red-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-red-500"
            >
                End
            </button>
        </div>
    );
}