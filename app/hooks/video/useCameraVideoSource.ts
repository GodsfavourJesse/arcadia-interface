"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CallType } from "@/app/types/calls/calls.types";
import {
    getCameraDiagnostics,
    requestCameraMedia,
    stopCameraMedia,
} from "@/app/lib/video/camera-source";
import { VideoFrameSource } from "@/app/lib/video/video-frame-source";
import type {
    VideoFrameCallback,
    VideoSourceState,
} from "@/app/lib/video/video.types";

export type UseCameraVideoSourceOptions = {
    callType?: CallType;
    enabled?: boolean;
    maxFps?: number;
    autoStartFrames?: boolean;
};

export function useCameraVideoSource({
    callType = "video",
    enabled = true,
    maxFps = 30,
    autoStartFrames = false,
}: UseCameraVideoSourceOptions = {}) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameSourceRef = useRef<VideoFrameSource | null>(null);
    const frameCallbackRef = useRef<VideoFrameCallback | null>(null);
    const pendingStartRef = useRef<Promise<MediaStream | null> | null>(null);
    const requestVersionRef = useRef(0);
    const mountedRef = useRef(true);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [state, setState] = useState<VideoSourceState>("idle");
    const [error, setError] = useState<string | null>(null);

    const attachVideoElement = useCallback(
        (element: HTMLVideoElement | null) => {
            videoRef.current = element;

            if (!element) {
                frameSourceRef.current?.dispose();
                frameSourceRef.current = null;
                return;
            }

            const currentStream = streamRef.current;
            if (currentStream && element.srcObject !== currentStream) {
                element.srcObject = currentStream;
                element.playsInline = true;
                element.muted = true;
            }
        },
        [],
    );

    const start = useCallback(async () => {
        if (!enabled) {
            return null;
        }

        if (streamRef.current) {
            return streamRef.current;
        }

        if (pendingStartRef.current) {
            return pendingStartRef.current;
        }

        setState("starting");
        setError(null);

        const requestVersion = ++requestVersionRef.current;
        const request = Promise.resolve().then(async () => {
            try {
                const nextStream = await requestCameraMedia(callType);

                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    stopCameraMedia(nextStream);
                    return null;
                }

                streamRef.current = nextStream;
                setStream(nextStream);
                setState("ready");

                const video = videoRef.current;
                if (video) {
                    video.srcObject = nextStream;
                    video.playsInline = true;
                    video.muted = true;
                    await video.play().catch(() => undefined);
                }

                if (autoStartFrames && video) {
                    const source = new VideoFrameSource(video, { maxFps });
                    source.onFrame((frame, timestamp) =>
                        frameCallbackRef.current?.(frame, timestamp),
                    );
                    frameSourceRef.current = source;
                    source.start();
                }

                return nextStream;
            } catch (caughtError) {
                const normalized =
                    caughtError instanceof Error
                        ? caughtError
                        : new Error("Unable to start camera capture.");

                if (
                    mountedRef.current &&
                    requestVersion === requestVersionRef.current
                ) {
                    setState("error");
                    setError(normalized.message);
                }

                throw normalized;
            }
        });

        pendingStartRef.current = request;
        const clearPendingStart = () => {
            if (pendingStartRef.current === request) {
                pendingStartRef.current = null;
            }
        };
        void request.then(clearPendingStart, clearPendingStart);
        return request;
    }, [autoStartFrames, callType, enabled, maxFps]);

    const stop = useCallback(() => {
        requestVersionRef.current += 1;
        pendingStartRef.current = null;
        frameSourceRef.current?.dispose();
        frameSourceRef.current = null;
        stopCameraMedia(streamRef.current);
        streamRef.current = null;
        setStream(null);
        setState("stopped");
        setError(null);
    }, []);

    const startFrames = useCallback(() => {
        const video = videoRef.current;
        if (!video) {
            throw new Error("Attach a video element before starting frames.");
        }

        if (!frameSourceRef.current) {
            const source = new VideoFrameSource(video, { maxFps });
            source.onFrame((frame, timestamp) =>
                frameCallbackRef.current?.(frame, timestamp),
            );
            frameSourceRef.current = source;
        }

        frameSourceRef.current.start();
    }, [maxFps]);

    const stopFrames = useCallback(() => {
        frameSourceRef.current?.stop();
    }, []);

    const setFrameCallback = useCallback(
        (callback: VideoFrameCallback | null) => {
            frameCallbackRef.current = callback;
        },
        [],
    );

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            requestVersionRef.current += 1;
            pendingStartRef.current = null;
            frameSourceRef.current?.dispose();
            frameSourceRef.current = null;
            stopCameraMedia(streamRef.current);
            streamRef.current = null;
        };
    }, []);

    return {
        videoRef: attachVideoElement,
        stream,
        state,
        error,
        diagnostics: getCameraDiagnostics(stream),
        start,
        stop,
        startFrames,
        stopFrames,
        setFrameCallback,
    };
}
