"use client";

import type { CallType } from "@/app/types/calls/calls.types";
import {
    configureAudioTracks,
    configureVideoTracks,
    createMediaConstraints,
    getAudioDiagnostics,
    stopMediaStream,
} from "./media-constraints";
import type { VideoSourceDiagnostics } from "./video.types";

export class CameraSourceError extends Error {
    constructor(message: string, public readonly causeName?: string) {
        super(message);
        this.name = "CameraSourceError";
    }
}

export function isCameraCaptureSupported(): boolean {
    return Boolean(
        typeof navigator !== "undefined" &&
            navigator.mediaDevices?.getUserMedia,
    );
}

export async function requestCameraMedia(
    callType: CallType,
): Promise<MediaStream> {
    if (!isCameraCaptureSupported()) {
        throw new CameraSourceError(
            "Camera and microphone are unavailable in this browser.",
        );
    }

    try {
        const constraints = createMediaConstraints(callType);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        await configureAudioTracks(stream);

        if (callType === "video") {
            configureVideoTracks(stream);
        }

        return stream;
    } catch (error) {
        const normalized =
            error instanceof Error
                ? error
                : new Error("Unable to access your camera or microphone.");

        if (normalized.name === "NotReadableError") {
            throw new CameraSourceError(
                "Your camera or microphone is already being used by another application or browser tab.",
                normalized.name,
            );
        }

        if (normalized.name === "NotAllowedError") {
            throw new CameraSourceError(
                "Camera and microphone permission was denied.",
                normalized.name,
            );
        }

        if (normalized.name === "NotFoundError") {
            throw new CameraSourceError(
                "No camera or microphone was found.",
                normalized.name,
            );
        }

        throw new CameraSourceError(normalized.message, normalized.name);
    }
}

export function getCameraVideoTrack(
    stream: MediaStream | null,
): MediaStreamTrack | null {
    return stream?.getVideoTracks()[0] ?? null;
}

export function getCameraDiagnostics(
    stream: MediaStream | null,
): VideoSourceDiagnostics | null {
    const track = getCameraVideoTrack(stream);

    if (!stream || !track) {
        return null;
    }

    return {
        streamId: stream.id,
        trackId: track.id,
        readyState: track.readyState,
        enabled: track.enabled,
        muted: track.muted,
        settings: track.getSettings(),
    };
}

export function getMicrophoneDiagnostics(
    stream: MediaStream | null,
): MediaTrackSettings | null {
    if (!stream) {
        return null;
    }

    return getAudioDiagnostics(stream) ?? null;
}

export function stopCameraMedia(
    stream: MediaStream | null,
): void {
    stopMediaStream(stream);
}
