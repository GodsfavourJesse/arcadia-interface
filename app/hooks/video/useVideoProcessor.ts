"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import type { RefObject } from "react";

import type {
    FaceTrackingState,
} from "@/app/types/face/face-tracking.types";

import {
    VideoProcessor,
} from "@/app/lib/video/video-processor";

import type {
    VideoProcessorDiagnostics,
    VideoProcessorMode,
    VideoProcessorOutput,
} from "@/app/types/video/video-processor.types";

interface UseVideoProcessorOptions {
    sourceVideoRef: RefObject<HTMLVideoElement | null>;

    trackingState?: FaceTrackingState | null;

    trackingStateRef?: RefObject<FaceTrackingState | null>;

    enabled?: boolean;

    width?: number;

    height?: number;

    fps?: number;

    mode?: VideoProcessorMode;

    retryKey?: number;
}

const INITIAL_DIAGNOSTICS: VideoProcessorDiagnostics = {
    width: 0,

    height: 0,

    fps: 0,

    mode: "camera",

    frameCount: 0,

    lastFrameTimestamp: 0,

    outputTrackReady: false,

    avatarReady: false,

    avatarImageLoaded: false,

    avatarFramesRendered: 0,

    faceDetected: false,

    faceX: 0,

    faceY: 0,

    faceWidth: 0,

    faceHeight: 0,
};

export function useVideoProcessor({
    sourceVideoRef,

    trackingState = null,

    trackingStateRef: externalTrackingStateRef,

    enabled = true,

    width = 1280,

    height = 720,

    fps = 30,

    mode = "camera",
    retryKey = 0,
}: UseVideoProcessorOptions) {
    /**
     * Keep the latest tracking state in a ref.
     *
     * This prevents the render loop from being
     * recreated every time MediaPipe produces
     * a new tracking result.
     */
    const trackingStateRef =
        useRef<FaceTrackingState | null>(
            trackingState,
        );

    useEffect(() => {
        trackingStateRef.current =
            trackingState;
    }, [trackingState]);

    /**
     * VideoProcessor instance.
     */
    const processorRef =
        useRef<VideoProcessor | null>(
            null,
        );

    /**
     * requestAnimationFrame handle.
     */
    const animationFrameRef =
        useRef<number | null>(null);

    /**
     * Used to throttle React diagnostics
     * updates.
     */
    const diagnosticsFrameRef =
        useRef(0);

    const [
        output,
        setOutput,
    ] =
        useState<VideoProcessorOutput | null>(
            null,
        );

    const [
        diagnostics,
        setDiagnostics,
    ] =
        useState<VideoProcessorDiagnostics>(
            INITIAL_DIAGNOSTICS,
        );

    const [
        error,
        setError,
    ] =
        useState<Error | null>(null);

    const [
        initialized,
        setInitialized,
    ] =
        useState(false);

    /**
     * Stop the processor and cancel the
     * processing loop.
     */
    const stop =
        useCallback(() => {
            if (
                animationFrameRef.current !==
                null
            ) {
                cancelAnimationFrame(
                    animationFrameRef.current,
                );

                animationFrameRef.current =
                    null;
            }

            processorRef.current?.stop();

            processorRef.current =
                null;

            diagnosticsFrameRef.current =
                0;

            setOutput(null);

            setDiagnostics(
                INITIAL_DIAGNOSTICS,
            );

            setInitialized(false);
            setError(null);
        }, []);

    /**
     * Create and run the VideoProcessor.
     */
    useEffect(() => {
        if (!enabled) {
            stop();

            return;
        }

        let cancelled = false;

        const processor =
            new VideoProcessor();

        try {
            const nextOutput =
                processor.initialize({
                    width,
                    height,
                    fps,
                    mode,
                });

            if (cancelled) {
                processor.stop();

                return;
            }

            processorRef.current =
                processor;

            setOutput(
                nextOutput,
            );

            setInitialized(true);

            setError(null);

            setDiagnostics(
                processor.getDiagnostics(),
            );

            const render = (
                timestamp: number,
            ) => {
                if (cancelled) {
                    return;
                }

                const sourceVideo =
                    sourceVideoRef.current;

                /**
                 * Give the processor the
                 * current camera video element.
                 */
                processor.setSourceVideo(
                    sourceVideo,
                );

                /**
                 * Render the current frame.
                 *
                 * trackingStateRef.current always
                 * contains the latest MediaPipe
                 * tracking result.
                 */
                processor.render(
                    externalTrackingStateRef?.current ?? trackingStateRef.current,
                    timestamp,
                );

                diagnosticsFrameRef.current +=
                    1;

                /**
                 * Diagnostics are intentionally
                 * throttled so React does not
                 * re-render at the full processing
                 * frame rate.
                 */
                if (
                    diagnosticsFrameRef.current %
                        10 ===
                    0
                ) {
                    setDiagnostics(
                        processor.getDiagnostics(),
                    );
                }

                animationFrameRef.current =
                    requestAnimationFrame(
                        render,
                    );
            };

            animationFrameRef.current =
                requestAnimationFrame(
                    render,
                );
        } catch (processorError) {
            if (cancelled) {
                processor.stop();

                return;
            }

            const normalizedError =
                processorError instanceof Error
                    ? processorError
                    : new Error(
                          "Unable to initialize video processor.",
                      );

            console.error(
                "[VideoProcessor]",
                normalizedError,
            );

            setError(
                normalizedError,
            );

            setInitialized(false);

            setOutput(null);

            setDiagnostics(
                INITIAL_DIAGNOSTICS,
            );

            processor.stop();
        }

        return () => {
            cancelled = true;

            if (
                animationFrameRef.current !==
                null
            ) {
                cancelAnimationFrame(
                    animationFrameRef.current,
                );

                animationFrameRef.current =
                    null;
            }

            processor.stop();

            if (
                processorRef.current ===
                processor
            ) {
                processorRef.current =
                    null;
            }
        };
    }, [
        enabled,
        width,
        height,
        fps,
        mode,
        retryKey,
        externalTrackingStateRef,
        sourceVideoRef,
        stop,
    ]);

    /**
     * Set or replace the avatar image.
     */
    const setAvatarImage =
        useCallback(
            async (
                imageUrl: string,
            ) => {
                const processor =
                    processorRef.current;

                if (!processor) {
                    throw new Error(
                        "VideoProcessor is not initialized.",
                    );
                }

                try {
                    await processor.setAvatarImage(
                        imageUrl,
                    );

                    setError(null);

                    setDiagnostics(
                        processor.getDiagnostics(),
                    );
                } catch (cause) {
                    const normalizedError =
                        cause instanceof Error
                            ? cause
                            : new Error(
                                  "Unable to load avatar image.",
                              );

                    console.error(
                        "[VideoProcessor] Avatar image error:",
                        normalizedError,
                    );

                    setError(
                        normalizedError,
                    );

                    throw normalizedError;
                }
            },
            [],
        );

    /**
     * Switch between camera and avatar
     * processing modes.
     */
    const setMode =
        useCallback(
            (
                nextMode: VideoProcessorMode,
            ) => {
                const processor =
                    processorRef.current;

                if (!processor) {
                    throw new Error(
                        "VideoProcessor is not initialized.",
                    );
                }

                processor.setMode(
                    nextMode,
                );

                setDiagnostics(
                    processor.getDiagnostics(),
                );
            },
            [],
        );

    /**
     * Remove the active avatar and return
     * to the normal camera renderer.
     */
    const clearAvatar =
        useCallback(() => {
            const processor =
                processorRef.current;

            if (!processor) {
                return;
            }

            processor.clearAvatar();

            setDiagnostics(
                processor.getDiagnostics(),
            );
        }, []);

    return {
        /**
         * Complete processor output.
         */
        output,

        /**
         * Canvas capture stream.
         */
        stream:
            output?.stream ??
            null,

        /**
         * Video track generated by
         * canvas.captureStream().
         */
        videoTrack:
            output?.videoTrack ??
            null,

        /**
         * Processing canvas.
         */
        canvas:
            output?.canvas ??
            null,

        /**
         * Whether the processor is ready.
         */
        initialized,

        /**
         * Current processor error.
         */
        error,

        /**
         * Current processor diagnostics.
         */
        diagnostics,

        /**
         * Load/change avatar image.
         */
        setAvatarImage,

        /**
         * Switch processing mode.
         */
        setMode,

        /**
         * Remove avatar and return to camera.
         */
        clearAvatar,

        /**
         * Stop processing.
         */
        stop,
    };
}
