"use client";

import {
    useEffect,
    useRef,
} from "react";

export function RemoteAudio({
    stream,
}: {
    stream: MediaStream | null;
}) {
    const audioRef =
        useRef<HTMLAudioElement | null>(
            null,
        );

    useEffect(() => {
        const audio =
            audioRef.current;

        if (!audio) {
            return;
        }

        audio.srcObject = stream;

        if (stream) {
            void audio.play().catch(() => {
                // User interaction from accept/call controls
                // normally satisfies autoplay requirements.
            });
        }

        return () => {
            audio.srcObject = null;
        };
    }, [stream]);

    return (
        <audio
            ref={audioRef}
            autoPlay
            playsInline
            className="hidden"
        />
    );
}