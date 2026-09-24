"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

export function useLocalMedia() {
    const videoRef =
        useRef<HTMLVideoElement | null>(null);

    const streamRef =
        useRef<MediaStream | null>(null);

    const startingRef =
        useRef(false);

    const [cameraEnabled, setCameraEnabled] =
        useState(true);

    const [microphoneEnabled, setMicrophoneEnabled] =
        useState(true);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    /**
     * Attach the current stream to the video element.
     */
    const attachStreamToVideo =
        useCallback(() => {
            const video =
                videoRef.current;

            const stream =
                streamRef.current;

            if (!video || !stream) {
                return;
            }

            if (video.srcObject !== stream) {
                video.srcObject = stream;
            }

            void video.play().catch(() => {
                // Autoplay may be blocked by the browser.
                // The muted preview should normally still
                // be allowed to play.
            });
        }, []);

    /**
     * Start camera + microphone.
     */
    const startMedia = useCallback(
        async () => {
            // Prevent concurrent getUserMedia() calls.
            if (startingRef.current) {
                return streamRef.current;
            }

            // Reuse the existing stream.
            if (streamRef.current) {
                attachStreamToVideo();

                return streamRef.current;
            }

            startingRef.current = true;

            setLoading(true);
            setError(null);

            try {
                if (
                    !navigator.mediaDevices ||
                    !navigator.mediaDevices.getUserMedia
                ) {
                    throw new Error(
                        "MEDIA_NOT_SUPPORTED",
                    );
                }

                const stream =
                    await navigator.mediaDevices.getUserMedia(
                        {
                            video: true,
                            audio: true,
                        },
                    );

                streamRef.current = stream;

                const videoTrack =
                    stream.getVideoTracks()[0];

                const audioTrack =
                    stream.getAudioTracks()[0];

                setCameraEnabled(
                    videoTrack?.enabled ?? false,
                );

                setMicrophoneEnabled(
                    audioTrack?.enabled ?? false,
                );

                attachStreamToVideo();

                return stream;
            } catch (error) {
                let message =
                    "Camera and microphone access is required to join the call.";

                if (
                    error instanceof DOMException
                ) {
                    switch (error.name) {
                        case "NotAllowedError":
                            message =
                                "Camera and microphone access was denied. Please allow access in your browser settings.";

                            break;

                        case "NotFoundError":
                            message =
                                "No camera or microphone was found on this device.";

                            break;

                        case "NotReadableError":
                            message =
                                "Your camera or microphone is already being used by another application.";

                            break;

                        case "SecurityError":
                            message =
                                "Camera and microphone access is blocked by the browser.";

                            break;

                        case "OverconstrainedError":
                            message =
                                "Your camera or microphone does not support the required settings.";

                            break;
                    }
                } else if (
                    error instanceof Error &&
                    error.message ===
                        "MEDIA_NOT_SUPPORTED"
                ) {
                    message =
                        "Camera and microphone are not supported by this browser.";
                }

                setError(message);

                return null;
            } finally {
                startingRef.current = false;
                setLoading(false);
            }
        },
        [attachStreamToVideo],
    );

    /**
     * Toggle camera without replacing the stream.
     */
    const toggleCamera = useCallback(() => {
        const track =
            streamRef.current?.getVideoTracks()[0];

        if (!track) {
            return;
        }

        track.enabled = !track.enabled;

        setCameraEnabled(track.enabled);
    }, []);

    /**
     * Toggle microphone without replacing the stream.
     */
    const toggleMicrophone = useCallback(() => {
        const track =
            streamRef.current?.getAudioTracks()[0];

        if (!track) {
            return;
        }

        track.enabled = !track.enabled;

        setMicrophoneEnabled(track.enabled);
    }, []);

    /**
     * Stop camera + microphone completely.
     */
    const stopMedia = useCallback(() => {
        const stream =
            streamRef.current;

        if (stream) {
            stream.getTracks().forEach(
                (track) => {
                    track.stop();
                },
            );
        }

        streamRef.current = null;

        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
        }

        setCameraEnabled(true);
        setMicrophoneEnabled(true);
        setLoading(false);
        setError(null);
    }, []);

    /**
     * Re-attach the stream whenever the video
     * element becomes available.
     */
    useEffect(() => {
        attachStreamToVideo();
    }, [attachStreamToVideo]);

    /**
     * Stop media when the component unmounts.
     */
    useEffect(() => {
        return () => {
            const stream =
                streamRef.current;

            if (stream) {
                stream.getTracks().forEach(
                    (track) => {
                        track.stop();
                    },
                );
            }

            streamRef.current = null;

            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.srcObject = null;
            }
        };
    }, []);

    return {
        videoRef,
        streamRef,

        cameraEnabled,
        microphoneEnabled,

        loading,
        error,

        startMedia,
        toggleCamera,
        toggleMicrophone,
        stopMedia,
    };
}