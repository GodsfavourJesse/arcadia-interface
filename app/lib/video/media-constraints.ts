import type { CallType } from "@/app/types/calls/calls.types";

export function createMediaConstraints(
    callType: CallType,
): MediaStreamConstraints {
    const audio: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 48_000 },
        sampleSize: { ideal: 16 },
    };

    if (callType === "video") {
        return {
            audio,
            video: {
                facingMode: "user",
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                frameRate: { ideal: 30, max: 30 },
            },
        };
    }

    return { audio, video: false };
}

export async function configureAudioTracks(
    stream: MediaStream,
): Promise<void> {
    for (const track of stream.getAudioTracks()) {
        try {
            await track.applyConstraints({
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: { ideal: 1 },
                sampleRate: { ideal: 48_000 },
                sampleSize: { ideal: 16 },
            });
        } catch (error) {
            console.warn(
                "[VideoSource] Advanced microphone constraints unavailable:",
                error,
            );
        }

        try {
            track.contentHint = "speech";
        } catch {
            // Optional browser optimization.
        }
    }
}

export function configureVideoTracks(
    stream: MediaStream,
): void {
    for (const track of stream.getVideoTracks()) {
        try {
            track.contentHint = "motion";
        } catch {
            // Optional browser optimization.
        }
    }
}

export function getAudioDiagnostics(
    stream: MediaStream,
): MediaTrackSettings | undefined {
    return stream.getAudioTracks()[0]?.getSettings();
}

export function stopMediaStream(
    stream: MediaStream | null,
): void {
    if (!stream) {
        return;
    }

    for (const track of stream.getTracks()) {
        if (track.readyState !== "ended") {
            track.stop();
        }
    }
}
