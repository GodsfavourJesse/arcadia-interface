"use client";

import {
    useEffect,
    useRef,
} from "react";

import type {
    FaceTrackingState,
} from "@/app/types/face/face-tracking.types";

interface FaceLandmarkCanvasProps {
    video: HTMLVideoElement | null;

    state: FaceTrackingState;

    width?: number;

    height?: number;
}

export function FaceLandmarkCanvas({
    video,
    state,
    width = 640,
    height = 480,
}: FaceLandmarkCanvasProps) {
    const canvasRef =
        useRef<HTMLCanvasElement | null>(
            null,
        );

    useEffect(() => {
        const canvas =
            canvasRef.current;

        if (!canvas) {
            return;
        }

        const context =
            canvas.getContext("2d");

        if (!context) {
            return;
        }

        context.clearRect(
            0,
            0,
            width,
            height,
        );

        if (
            !video ||
            video.videoWidth <= 0 ||
            video.videoHeight <= 0
        ) {
            return;
        }

        context.drawImage(
            video,
            0,
            0,
            width,
            height,
        );

        if (!state.detected) {
            return;
        }

        context.fillStyle =
            "rgba(255,255,255,0.9)";

        for (const point of state.landmarks) {
            const x =
                point.x * width;

            const y =
                point.y * height;

            context.beginPath();

            context.arc(
                x,
                y,
                1.25,
                0,
                Math.PI * 2,
            );

            context.fill();
        }

        if (state.boundingBox) {
            context.strokeStyle =
                "rgba(255,255,255,0.8)";

            context.lineWidth = 2;

            context.strokeRect(
                state.boundingBox.x * width,
                state.boundingBox.y * height,
                state.boundingBox.width *
                    width,
                state.boundingBox.height *
                    height,
            );
        }
    }, [
        video,
        state,
        width,
        height,
    ]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="h-auto w-full rounded-xl"
        />
    );
}