export type WebRTCPeerContext = {
    peerConnection: RTCPeerConnection;
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
): {
    videoSender: RTCRtpSender | null;
    audioSender: RTCRtpSender | null;
} {
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