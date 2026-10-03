export type WebRTCPeerContext = {
    peerConnection: RTCPeerConnection;
    videoSender: RTCRtpSender | null;
    audioSender: RTCRtpSender | null;
};

export type LocalTrackSenders = {
    videoSender: RTCRtpSender | null;
    audioSender: RTCRtpSender | null;
};

export function createPeerConnection(
    iceServers: RTCIceServer[],
): RTCPeerConnection {
    return new RTCPeerConnection({
        iceServers,
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
    });
}

export function addLocalTracks(
    peerConnection: RTCPeerConnection,
    stream: MediaStream,
): LocalTrackSenders {
    let videoSender: RTCRtpSender | null = null;
    let audioSender: RTCRtpSender | null = null;

    const existingSenders =
        peerConnection.getSenders();

    for (const track of stream.getTracks()) {
        const existingSender =
            existingSenders.find(
                (sender) =>
                    sender.track?.id ===
                    track.id,
            );

        const sender =
            existingSender ??
            peerConnection.addTrack(
                track,
                stream,
            );

        if (track.kind === "video") {
            videoSender = sender;
        }

        if (track.kind === "audio") {
            audioSender = sender;
        }
    }

    return {
        videoSender,
        audioSender,
    };
}

export async function replaceVideoTrack(
    videoSender: RTCRtpSender | null,
    nextTrack: MediaStreamTrack | null,
): Promise<void> {
    if (!videoSender) {
        throw new Error(
            "WebRTC video sender is not available.",
        );
    }

    if (
        nextTrack !== null &&
        nextTrack.kind !== "video"
    ) {
        throw new Error(
            "replaceVideoTrack requires a video track.",
        );
    }

    await videoSender.replaceTrack(
        nextTrack,
    );
}

export function getVideoSender(
    peerConnection: RTCPeerConnection,
): RTCRtpSender | null {
    return (
        peerConnection
            .getSenders()
            .find(
                (sender) =>
                    sender.track?.kind ===
                    "video",
            ) ?? null
    );
}

export function getAudioSender(
    peerConnection: RTCPeerConnection,
): RTCRtpSender | null {
    return (
        peerConnection
            .getSenders()
            .find(
                (sender) =>
                    sender.track?.kind ===
                    "audio",
            ) ?? null
    );
}

/*
 * Apply conservative real-time media preferences.
 *
 * We deliberately keep browser negotiation in charge of the final
 * codec choice. When the browser exposes codec preferences, Opus is
 * preferred for speech and VP8/VP9 are preferred for video. Sender
 * bitrate caps prevent a poor connection from producing excessive
 * queueing while still leaving enough headroom for clear 720p video.
 */
export function configureMediaSenders(
    peerConnection: RTCPeerConnection,
    audioSender: RTCRtpSender | null,
    videoSender: RTCRtpSender | null,
): void {
    if (audioSender) {
        try {
            const audioTransceiver =
                peerConnection
                    .getTransceivers()
                    .find(
                        (transceiver) =>
                            transceiver.sender === audioSender,
                    );

            const audioCodecs =
                RTCRtpReceiver.getCapabilities?.("audio")
                    ?.codecs ?? [];

            const preferredAudioCodecs =
                [...audioCodecs].sort(
                    (left, right) => {
                        const leftIsOpus =
                            left.mimeType.toLowerCase() ===
                            "audio/opus";
                        const rightIsOpus =
                            right.mimeType.toLowerCase() ===
                            "audio/opus";

                        return (
                            Number(!leftIsOpus) -
                            Number(!rightIsOpus)
                        );
                    },
                );

            if (
                audioTransceiver &&
                preferredAudioCodecs.length > 0 &&
                typeof audioTransceiver.setCodecPreferences ===
                    "function"
            ) {
                audioTransceiver.setCodecPreferences(
                    preferredAudioCodecs,
                );
            }
        } catch (error) {
            console.debug(
                "[WebRTC] Native audio codec preference unavailable:",
                error,
            );
        }

        try {
            const parameters =
                audioSender.getParameters();

            if (parameters.encodings.length > 0) {
                parameters.encodings[0].maxBitrate =
                    64_000;

                audioSender.setParameters(
                    parameters,
                ).catch(() => {
                    // Browser may reject optional sender tuning.
                });
            }
        } catch {
            // Optional sender tuning is browser-dependent.
        }
    }

    if (videoSender) {
        try {
            const videoTransceiver =
                peerConnection
                    .getTransceivers()
                    .find(
                        (transceiver) =>
                            transceiver.sender === videoSender,
                    );

            const videoCodecs =
                RTCRtpReceiver.getCapabilities?.("video")
                    ?.codecs ?? [];

            const preferredVideoCodecs =
                [...videoCodecs].sort(
                    (left, right) => {
                        const leftMime =
                            left.mimeType.toLowerCase();
                        const rightMime =
                            right.mimeType.toLowerCase();

                        const score = (mimeType: string) =>
                            mimeType === "video/vp8" ||
                            mimeType === "video/vp9"
                                ? 0
                                : 1;

                        return (
                            score(leftMime) -
                            score(rightMime)
                        );
                    },
                );

            if (
                videoTransceiver &&
                preferredVideoCodecs.length > 0 &&
                typeof videoTransceiver.setCodecPreferences ===
                    "function"
            ) {
                videoTransceiver.setCodecPreferences(
                    preferredVideoCodecs,
                );
            }
        } catch (error) {
            console.debug(
                "[WebRTC] Native video codec preference unavailable:",
                error,
            );
        }

        try {
            const parameters =
                videoSender.getParameters();

            if (parameters.encodings.length > 0) {
                parameters.encodings[0].maxBitrate =
                    2_500_000;

                videoSender.setParameters(
                    parameters,
                ).catch(() => {
                    // Browser may reject optional sender tuning.
                });
            }
        } catch {
            // Optional sender tuning is browser-dependent.
        }
    }
}
