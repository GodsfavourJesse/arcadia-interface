"use client";

import {
    useEffect,
    useRef,
} from "react";

type CallMediaProps = {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    video: boolean;
};

function MediaVideo({
    stream,
    muted = false,
    className,
}: {
    stream: MediaStream | null;
    muted?: boolean;
    className: string;
}) {
    const videoRef =
        useRef<HTMLVideoElement | null>(
            null,
        );

    useEffect(() => {
        const video =
            videoRef.current;

        if (!video) {
            return;
        }

        video.srcObject = stream;

        if (stream) {
            void video.play().catch(() => {
                // Browser autoplay policies can require
                // a user gesture. Controls remain available.
            });
        }

        return () => {
            video.srcObject = null;
        };
    }, [stream]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={muted}
            className={className}
        />
    );
}

export function CallMedia({
    localStream,
    remoteStream,
    video,
}: CallMediaProps) {
    if (!video) {
        return null;
    }

    return (
        <div className="absolute inset-0 overflow-hidden rounded-3xl bg-black">
            {remoteStream ? (
                <MediaVideo
                    stream={remoteStream}
                    className="h-full w-full object-cover"
                />
            ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/60">
                    Waiting for video…
                </div>
            )}

            {localStream && (
                <div className="absolute right-4 top-4 h-32 w-24 overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl sm:h-40 sm:w-28">
                    <MediaVideo
                        stream={localStream}
                        muted
                        className="h-full w-full object-cover"
                    />
                </div>
            )}
        </div>
    );
}