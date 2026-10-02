import type {
    CallType,
} from "@/app/types/calls/calls.types";

/*
 * Microphone/camera capture configuration.
 *
 * Audio processing is requested from the browser:
 *
 * - Echo cancellation
 * - Noise suppression
 * - Automatic gain control
 *
 * Mono is preferred for speech calls.
 */
export function createMediaConstraints(
    callType: CallType,
): MediaStreamConstraints {
    const audio: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,

        channelCount: {
            ideal: 1,
        },
    };

    if (callType === "video") {
        return {
            audio,

            video: {
                facingMode: "user",

                width: {
                    ideal: 1280,
                    max: 1920,
                },

                height: {
                    ideal: 720,
                    max: 1080,
                },

                frameRate: {
                    ideal: 30,
                    max: 30,
                },
            },
        };
    }

    return {
        audio,
        video: false,
    };
}

/*
 * Applies the speech-focused constraints to
 * microphone tracks after getUserMedia().
 *
 * This is intentionally best-effort because
 * browser/device support differs.
 */
export async function configureAudioTracks(
    stream: MediaStream,
): Promise<void> {
    const audioTracks =
        stream.getAudioTracks();

    for (const track of audioTracks) {
        try {
            await track.applyConstraints(
                {
                    echoCancellation:
                        true,

                    noiseSuppression:
                        true,

                    autoGainControl:
                        true,

                    channelCount: {
                        ideal: 1,
                    },
                },
            );
        } catch (error) {
            console.warn(
                "[WebRTC] Advanced microphone constraints unavailable:",
                error,
            );
        }

        if (
            "contentHint" in
            track
        ) {
            try {
                track.contentHint =
                    "speech";
            } catch {
                // Optional browser optimization.
            }
        }
    }
}

/*
 * Browser/device diagnostics.
 *
 * This does not modify the stream.
 */
export function getAudioDiagnostics(
    stream: MediaStream,
) {
    return stream
        .getAudioTracks()[0]
        ?.getSettings();
}

/*
 * Stops every track in a media stream.
 */
export function stopMediaStream(
    stream: MediaStream | null,
): void {
    if (!stream) {
        return;
    }

    for (const track of stream.getTracks()) {
        if (
            track.readyState !==
            "ended"
        ) {
            track.stop();
        }
    }
}