"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
    createVideoOutput,
    type VideoOutput,
    type VideoOutputDiagnostics,
    type VideoOutputSettings,
    type VideoOutputState,
} from "@/app/lib/video/video-output";

interface UseVideoOutputResult {
    output: VideoOutput | null;
    canvas: HTMLCanvasElement | null;
    stream: MediaStream | null;
    track: MediaStreamTrack | null;

    state: VideoOutputState;

    diagnostics: VideoOutputDiagnostics | null;

    start: () => Promise<MediaStreamTrack>;
    stop: () => void;

    render: (video: HTMLVideoElement) => void;
}

export function useVideoOutput(
    settings: VideoOutputSettings = {},
): UseVideoOutputResult {
    const outputRef = useRef<VideoOutput | null>(null);

    const [output, setOutput] = useState<VideoOutput | null>(null);

    const [canvas, setCanvas] =
        useState<HTMLCanvasElement | null>(null);

    const [stream, setStream] =
        useState<MediaStream | null>(null);

    const [track, setTrack] =
        useState<MediaStreamTrack | null>(null);

    const [state, setState] =
        useState<VideoOutputState>("idle");

    const [diagnostics, setDiagnostics] =
        useState<VideoOutputDiagnostics | null>(null);

    useEffect(() => {
        const instance = createVideoOutput(settings);

        outputRef.current = instance;

        setOutput(instance);
        setCanvas(instance.getCanvas());
        setState(instance.state);
        setDiagnostics(instance.getDiagnostics());

        return () => {
            instance.stop();

            outputRef.current = null;

            setOutput(null);
            setCanvas(null);
            setStream(null);
            setTrack(null);
            setState("stopped");
            setDiagnostics(null);
        };
    }, [
        settings.width,
        settings.height,
        settings.frameRate,
        settings.mirror,
    ]);

    const start = useCallback(async () => {
        const instance = outputRef.current;

        if (!instance) {
            throw new Error("Video output has not been initialized.");
        }

        setState("starting");

        const nextTrack = await instance.start();

        setStream(instance.getStream());
        setTrack(nextTrack);
        setState(instance.state);
        setDiagnostics(instance.getDiagnostics());

        return nextTrack;
    }, []);

    const stop = useCallback(() => {
        const instance = outputRef.current;

        if (!instance) {
            return;
        }

        instance.stop();

        setStream(null);
        setTrack(null);
        setState(instance.state);
        setDiagnostics(instance.getDiagnostics());
    }, []);

    const render = useCallback((video: HTMLVideoElement) => {
        const instance = outputRef.current;

        if (!instance) {
            return;
        }

        instance.render(video);

        setDiagnostics(instance.getDiagnostics());
    }, []);

    return {
        output,
        canvas,
        stream,
        track,

        state,

        diagnostics,

        start,
        stop,

        render,
    };
}