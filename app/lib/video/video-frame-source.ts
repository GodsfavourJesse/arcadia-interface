"use client";

import type { VideoFrameCallback } from "./video.types";

export type VideoFrameSourceOptions = {
    maxFps?: number;
};

/**
 * Turns an HTMLVideoElement into a stream of WebCodecs VideoFrame objects.
 *
 * This class intentionally has no ML, WebRTC, or canvas responsibilities.
 * It is the frame boundary that later processors will consume.
 */
export class VideoFrameSource {
    private readonly video: HTMLVideoElement;
    private readonly maxFps: number;
    private callback: VideoFrameCallback | null = null;
    private running = false;
    private rafId: number | null = null;
    private lastTimestamp = -Infinity;
    private videoFrameCallbackId: number | null = null;

    constructor(
        video: HTMLVideoElement,
        options: VideoFrameSourceOptions = {},
    ) {
        this.video = video;
        this.maxFps = Math.max(1, options.maxFps ?? 30);
    }

    get isRunning(): boolean {
        return this.running;
    }

    onFrame(callback: VideoFrameCallback): void {
        this.callback = callback;
    }

    start(): void {
        if (this.running) {
            return;
        }

        if (typeof VideoFrame === "undefined") {
            throw new Error(
                "WebCodecs VideoFrame is unavailable in this browser.",
            );
        }

        this.running = true;
        this.lastTimestamp = -Infinity;
        this.scheduleNextFrame();
    }

    stop(): void {
        this.running = false;

        if (this.videoFrameCallbackId !== null) {
            this.video.cancelVideoFrameCallback(this.videoFrameCallbackId);
            this.videoFrameCallbackId = null;
        }

        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    dispose(): void {
        this.stop();
        this.callback = null;
    }

    private scheduleNextFrame(): void {
        if (!this.running) {
            return;
        }

        if ("requestVideoFrameCallback" in this.video) {
            this.videoFrameCallbackId = this.video.requestVideoFrameCallback(
                (_now, metadata) => {
                    this.videoFrameCallbackId = null;
                    void this.handleFrame(metadata.mediaTime);
                },
            );
            return;
        }

        this.rafId = requestAnimationFrame(() => {
            this.rafId = null;
            void this.handleFrame(performance.now() / 1000);
        });
    }

    private async handleFrame(timestamp: number): Promise<void> {
        if (!this.running) {
            return;
        }

        const minimumInterval = 1 / this.maxFps;
        if (timestamp - this.lastTimestamp < minimumInterval) {
            this.scheduleNextFrame();
            return;
        }

        if (
            this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
            this.video.videoWidth === 0 ||
            this.video.videoHeight === 0
        ) {
            this.scheduleNextFrame();
            return;
        }

        const callback = this.callback;
        if (!callback) {
            this.scheduleNextFrame();
            return;
        }

        this.lastTimestamp = timestamp;

        let frame: VideoFrame | null = null;

        try {
            frame = new VideoFrame(this.video, {
                timestamp: Math.round(timestamp * 1_000_000),
            });

            await callback(frame, timestamp);
            frame = null;
        } catch (error) {
            console.error("[VideoFrameSource] Frame processing failed:", error);
        } finally {
            frame?.close();
        }

        this.scheduleNextFrame();
    }
}
