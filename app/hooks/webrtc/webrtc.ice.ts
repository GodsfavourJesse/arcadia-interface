import type {
    RealtimeWebRTCClientEvent,
} from "@/app/types/realtime/realtime.types";

export type RealtimeIceCandidate =
    Extract<
        RealtimeWebRTCClientEvent,
        {
            type: "ICE_CANDIDATE";
        }
    >["candidate"];

export function toIceCandidateInit(
    candidate: RTCIceCandidate,
): RTCIceCandidateInit {
    return {
        candidate:
            candidate.candidate,

        sdpMid:
            candidate.sdpMid,

        sdpMLineIndex:
            candidate.sdpMLineIndex,

        ...(candidate.usernameFragment !==
        undefined
            ? {
                  usernameFragment:
                      candidate.usernameFragment,
              }
            : {}),
    };
}

export function toRealtimeIceCandidate(
    candidate: RTCIceCandidateInit,
): RealtimeIceCandidate {
    if (
        typeof candidate.candidate !==
        "string"
    ) {
        throw new Error(
            "Invalid WebRTC ICE candidate.",
        );
    }

    return {
        candidate:
            candidate.candidate,

        sdpMid:
            candidate.sdpMid ?? null,

        sdpMLineIndex:
            candidate.sdpMLineIndex ??
            null,

        ...(candidate.usernameFragment !==
        undefined
            ? {
                  usernameFragment:
                      candidate.usernameFragment,
              }
            : {}),
    };
}