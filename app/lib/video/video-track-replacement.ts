export async function replaceVideoSenderTrack(
    sender: RTCRtpSender,
    track: MediaStreamTrack,
): Promise<void> {
    if (track.kind !== "video") {
        throw new Error(
            "replaceVideoSenderTrack requires a video track.",
        );
    }

    await sender.replaceTrack(track);
}

export function getVideoSender(
    peerConnection: RTCPeerConnection,
): RTCRtpSender | null {
    return (
        peerConnection
            .getSenders()
            .find((sender) => sender.track?.kind === "video") ??
        null
    );
}

export async function replacePeerVideoTrack(
    peerConnection: RTCPeerConnection,
    track: MediaStreamTrack,
): Promise<void> {
    const sender = getVideoSender(peerConnection);

    if (!sender) {
        throw new Error(
            "No video RTCRtpSender exists on the peer connection.",
        );
    }

    await replaceVideoSenderTrack(sender, track);
}