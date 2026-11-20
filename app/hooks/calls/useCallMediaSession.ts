"use client";

import { useWebRTC } from "@/app/hooks/calls/useWebRTC";
import type { CallType } from "@/app/types/calls/calls.types";

type UseCallMediaSessionOptions = {
    callId: string | null;
    callType: CallType | null;
    isCaller: boolean;
    enabled: boolean;
    onConnected?: () => void;
    onFailed?: (error: Error) => void;
};

/**
 * Owns the normal camera/microphone WebRTC session for one active call.
 * Video effects can later replace the sender track through replaceVideoTrack
 * without coupling camera capture to call signaling.
 */
export function useCallMediaSession({
    callId,
    callType,
    isCaller,
    enabled,
    onConnected,
    onFailed,
}: UseCallMediaSessionOptions) {
    const media = useWebRTC({
        callId,
        callType,
        isCaller,
        enabled,
        initialVideoSource: "camera",
        onConnected,
        onFailed,
    });

    return {
        localStream: media.localStream,
        remoteStream: media.remoteStream,
        connectionState: media.connectionState,
        error: media.error,
        isMuted: media.isMuted,
        isCameraEnabled: media.isCameraEnabled,
        remoteAudioEnabled: media.remoteAudioEnabled,
        remoteVideoEnabled: media.remoteVideoEnabled,
        isConnected: media.isConnected,
        isConnecting: media.isConnecting,
        toggleMute: media.toggleMute,
        toggleCamera: media.toggleCamera,
        replaceVideoTrack: media.replaceVideoTrack,
        cleanup: media.cleanup,
        isVideoCall: callType === "video",
    };
}
