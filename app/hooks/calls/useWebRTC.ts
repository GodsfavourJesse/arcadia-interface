"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    realtimeClient,
} from "@/app/lib/realtime/realtime.client";

import type {
    RealtimeWebRTCEvent,
} from "@/app/types/realtime/realtime.types";

import type {
    CallType,
} from "@/app/types/calls/calls.types";

type WebRTCConnectionState =
    | "idle"
    | "requesting-media"
    | "connecting"
    | "connected"
    | "disconnected"
    | "failed"
    | "closed";

type UseWebRTCOptions = {
    callId: string | null;
    callType: CallType | null;
    isCaller: boolean;
    enabled: boolean;

    onConnected?: () => void;

    onFailed?: (
        error: Error,
    ) => void;
};

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        {
            urls: [
                "stun:stun.l.google.com:19302",
            ],
        },
    ],
};

function createMediaConstraints(
    callType: CallType,
): MediaStreamConstraints {
    if (callType === "video") {
        return {
            audio: true,
            video: {
                facingMode: "user",
                width: {
                    ideal: 1280,
                },
                height: {
                    ideal: 720,
                },
                frameRate: {
                    ideal: 30,
                    max: 30,
                },
            },
        };
    }

    return {
        audio: true,
        video: false,
    };
}

export function useWebRTC({
    callId,
    callType,
    isCaller,
    enabled,
    onConnected,
    onFailed,
}: UseWebRTCOptions) {
    const peerConnectionRef =
        useRef<RTCPeerConnection | null>(
            null,
        );

    const localStreamRef =
        useRef<MediaStream | null>(
            null,
        );

    const remoteStreamRef =
        useRef<MediaStream | null>(
            null,
        );

    const pendingIceCandidatesRef =
        useRef<RTCIceCandidateInit[]>(
            [],
        );

    const negotiationStartedRef =
        useRef(false);

    const connectedReportedRef =
        useRef(false);

    const callIdRef =
        useRef(callId);

    const callTypeRef =
        useRef(callType);

    const isCallerRef =
        useRef(isCaller);

    const onConnectedRef =
        useRef(onConnected);

    const onFailedRef =
        useRef(onFailed);

    const [localStream, setLocalStream] =
        useState<MediaStream | null>(
            null,
        );

    const [remoteStream, setRemoteStream] =
        useState<MediaStream | null>(
            null,
        );

    const [
        connectionState,
        setConnectionState,
    ] =
        useState<WebRTCConnectionState>(
            "idle",
        );

    const [isMuted, setIsMuted] =
        useState(false);

    const [
        isCameraEnabled,
        setIsCameraEnabled,
    ] = useState(
        callType === "video",
    );

    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {
        callIdRef.current = callId;
    }, [callId]);

    useEffect(() => {
        callTypeRef.current = callType;
    }, [callType]);

    useEffect(() => {
        isCallerRef.current =
            isCaller;
    }, [isCaller]);

    useEffect(() => {
        onConnectedRef.current =
            onConnected;
    }, [onConnected]);

    useEffect(() => {
        onFailedRef.current =
            onFailed;
    }, [onFailed]);

    const reportFailure =
        useCallback(
            (error: unknown) => {
                const normalized =
                    error instanceof Error
                        ? error
                        : new Error(
                              "WebRTC connection failed.",
                          );

                console.error(
                    "[WebRTC] Failure:",
                    normalized,
                );

                setError(
                    normalized.message,
                );

                setConnectionState(
                    "failed",
                );

                onFailedRef.current?.(
                    normalized,
                );
            },
            [],
        );

    const cleanup = useCallback(() => {
        const peer =
            peerConnectionRef.current;

        peerConnectionRef.current =
            null;

        if (peer) {
            peer.onicecandidate = null;
            peer.ontrack = null;
            peer.onconnectionstatechange =
                null;
            peer.oniceconnectionstatechange =
                null;
            peer.onicegatheringstatechange =
                null;

            try {
                peer.close();
            } catch {
                // Already closed.
            }
        }

        const stream =
            localStreamRef.current;

        localStreamRef.current = null;

        if (stream) {
            for (const track of stream.getTracks()) {
                track.stop();
            }
        }

        remoteStreamRef.current = null;

        pendingIceCandidatesRef.current =
            [];

        negotiationStartedRef.current =
            false;

        connectedReportedRef.current =
            false;

        setLocalStream(null);
        setRemoteStream(null);
        setConnectionState("idle");
        setError(null);
        setIsMuted(false);
        setIsCameraEnabled(
            callTypeRef.current === "video",
        );
    }, []);

    const toggleMute = useCallback(() => {
        const stream =
            localStreamRef.current;

        if (!stream) {
            return;
        }

        const audioTracks =
            stream.getAudioTracks();

        if (!audioTracks.length) {
            return;
        }

        const nextMuted = !isMuted;

        for (const track of audioTracks) {
            track.enabled = !nextMuted;
        }

        setIsMuted(nextMuted);
    }, [isMuted]);

    const toggleCamera = useCallback(() => {
        const stream =
            localStreamRef.current;

        if (!stream) {
            return;
        }

        const videoTracks =
            stream.getVideoTracks();

        if (!videoTracks.length) {
            return;
        }

        const nextEnabled =
            !isCameraEnabled;

        for (const track of videoTracks) {
            track.enabled = nextEnabled;
        }

        setIsCameraEnabled(
            nextEnabled,
        );
    }, [isCameraEnabled]);

    const addPendingIceCandidates =
        useCallback(
            async (
                peer: RTCPeerConnection,
            ) => {
                if (
                    !peer.remoteDescription
                ) {
                    return;
                }

                const candidates =
                    pendingIceCandidatesRef.current;

                pendingIceCandidatesRef.current =
                    [];

                for (const candidate of candidates) {
                    try {
                        await peer.addIceCandidate(
                            candidate,
                        );
                    } catch (error) {
                        console.warn(
                            "[WebRTC] Failed to add queued ICE candidate:",
                            error,
                        );
                    }
                }
            },
            [],
        );

    const createPeerConnection =
        useCallback(() => {
            const existing =
                peerConnectionRef.current;

            if (existing) {
                return existing;
            }

            const peer =
                new RTCPeerConnection(
                    ICE_SERVERS,
                );

            peerConnectionRef.current =
                peer;

            const remoteStream =
                new MediaStream();

            remoteStreamRef.current =
                remoteStream;

            setRemoteStream(
                remoteStream,
            );

            peer.ontrack = (event) => {
                const tracks =
                    event.streams[0]?.getTracks() ??
                    [event.track];

                for (const track of tracks) {
                    if (
                        !remoteStream.getTrackById(
                            track.id,
                        )
                    ) {
                        remoteStream.addTrack(
                            track,
                        );
                    }
                }

                setRemoteStream(
                    new MediaStream(
                        remoteStream.getTracks(),
                    ),
                );
            };

            peer.onicecandidate = (
                event,
            ) => {
                const currentCallId =
                    callIdRef.current;

                if (
                    !currentCallId ||
                    !event.candidate
                ) {
                    return;
                }

                const candidate =
                    event.candidate;

                const sent =
                    realtimeClient.send({
                        type: "ICE_CANDIDATE",
                        callId:
                            currentCallId,
                        candidate: {
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
                        },
                    });

                if (!sent) {
                    console.warn(
                        "[WebRTC] Realtime socket unavailable while sending ICE candidate.",
                    );
                }
            };

            peer.onconnectionstatechange =
                () => {
                    const state =
                        peer.connectionState;

                    console.log(
                        "[WebRTC] Connection state:",
                        state,
                    );

                    switch (state) {
                        case "new":
                        case "connecting":
                            setConnectionState(
                                "connecting",
                            );
                            break;

                        case "connected":
                            setConnectionState(
                                "connected",
                            );

                            if (
                                !connectedReportedRef.current
                            ) {
                                connectedReportedRef.current =
                                    true;

                                onConnectedRef.current?.();
                            }

                            break;

                        case "disconnected":
                            setConnectionState(
                                "disconnected",
                            );
                            break;

                        case "failed": {
                            const error =
                                new Error(
                                    "WebRTC connection failed.",
                                );

                            setError(
                                error.message,
                            );

                            setConnectionState(
                                "failed",
                            );

                            onFailedRef.current?.(
                                error,
                            );

                            break;
                        }

                        case "closed":
                            setConnectionState(
                                "closed",
                            );
                            break;
                    }
                };

            peer.oniceconnectionstatechange =
                () => {
                    console.log(
                        "[WebRTC] ICE connection state:",
                        peer.iceConnectionState,
                    );
                };

            peer.onicegatheringstatechange =
                () => {
                    console.log(
                        "[WebRTC] ICE gathering state:",
                        peer.iceGatheringState,
                    );
                };

            return peer;
        }, []);

    const ensureLocalMedia =
        useCallback(
            async () => {
                if (
                    localStreamRef.current
                ) {
                    return localStreamRef.current;
                }

                const type =
                    callTypeRef.current;

                if (!type) {
                    throw new Error(
                        "Call type is unavailable.",
                    );
                }

                if (
                    !navigator.mediaDevices?.getUserMedia
                ) {
                    throw new Error(
                        "This browser does not support microphone or camera access.",
                    );
                }

                setConnectionState(
                    "requesting-media",
                );

                const stream =
                    await navigator.mediaDevices.getUserMedia(
                        createMediaConstraints(
                            type,
                        ),
                    );

                localStreamRef.current =
                    stream;

                setLocalStream(stream);

                setIsMuted(false);

                setIsCameraEnabled(
                    type === "video",
                );

                return stream;
            },
            [],
        );

    const addLocalTracks =
        useCallback(
            async (
                peer: RTCPeerConnection,
                stream: MediaStream,
            ) => {
                const senders =
                    peer.getSenders();

                for (const track of stream.getTracks()) {
                    const alreadyAdded =
                        senders.some(
                            (sender) =>
                                sender.track
                                    ?.id ===
                                track.id,
                        );

                    if (
                        !alreadyAdded
                    ) {
                        peer.addTrack(
                            track,
                            stream,
                        );
                    }
                }
            },
            [],
        );

    const waitForRealtime =
        useCallback(async () => {
            const connected =
                await realtimeClient.waitUntilOpen(
                    10_000,
                );

            if (!connected) {
                throw new Error(
                    "Realtime connection is unavailable.",
                );
            }
        }, []);

    const createOffer =
        useCallback(
            async (
                peer: RTCPeerConnection,
            ) => {
                if (
                    negotiationStartedRef.current
                ) {
                    return;
                }

                negotiationStartedRef.current =
                    true;

                try {
                    await waitForRealtime();

                    const offer =
                        await peer.createOffer();

                    await peer.setLocalDescription(
                        offer,
                    );

                    const currentCallId =
                        callIdRef.current;

                    if (!currentCallId) {
                        throw new Error(
                            "Call ID is unavailable.",
                        );
                    }

                    const description =
                        peer.localDescription;

                    if (
                        !description?.sdp
                    ) {
                        throw new Error(
                            "Local WebRTC offer is unavailable.",
                        );
                    }

                    const sent =
                        realtimeClient.send({
                            type: "OFFER",
                            callId:
                                currentCallId,
                            sdp:
                                description.sdp,
                        });

                    if (!sent) {
                        throw new Error(
                            "Unable to send WebRTC offer.",
                        );
                    }

                    setConnectionState(
                        "connecting",
                    );
                } catch (error) {
                    negotiationStartedRef.current =
                        false;

                    throw error;
                }
            },
            [waitForRealtime],
        );

    const handleOffer =
        useCallback(
            async (
                event: Extract<
                    RealtimeWebRTCEvent,
                    { type: "OFFER" }
                >,
            ) => {
                if (
                    event.callId !==
                    callIdRef.current
                ) {
                    return;
                }

                if (
                    isCallerRef.current
                ) {
                    return;
                }

                const peer =
                    createPeerConnection();

                const stream =
                    await ensureLocalMedia();

                await addLocalTracks(
                    peer,
                    stream,
                );

                await peer.setRemoteDescription(
                    {
                        type: "offer",
                        sdp: event.sdp,
                    },
                );

                await addPendingIceCandidates(
                    peer,
                );

                await waitForRealtime();

                const answer =
                    await peer.createAnswer();

                await peer.setLocalDescription(
                    answer,
                );

                const description =
                    peer.localDescription;

                if (
                    !description?.sdp
                ) {
                    throw new Error(
                        "Local WebRTC answer is unavailable.",
                    );
                }

                const sent =
                    realtimeClient.send({
                        type: "ANSWER",
                        callId:
                            event.callId,
                        sdp:
                            description.sdp,
                    });

                if (!sent) {
                    throw new Error(
                        "Unable to send WebRTC answer.",
                    );
                }

                setConnectionState(
                    "connecting",
                );
            },
            [
                addLocalTracks,
                addPendingIceCandidates,
                createPeerConnection,
                ensureLocalMedia,
                waitForRealtime,
            ],
        );

    const handleAnswer =
        useCallback(
            async (
                event: Extract<
                    RealtimeWebRTCEvent,
                    { type: "ANSWER" }
                >,
            ) => {
                if (
                    event.callId !==
                    callIdRef.current
                ) {
                    return;
                }

                if (
                    !isCallerRef.current
                ) {
                    return;
                }

                const peer =
                    peerConnectionRef.current;

                if (!peer) {
                    return;
                }

                await peer.setRemoteDescription(
                    {
                        type: "answer",
                        sdp: event.sdp,
                    },
                );

                await addPendingIceCandidates(
                    peer,
                );

                setConnectionState(
                    "connecting",
                );
            },
            [addPendingIceCandidates],
        );

    const handleIceCandidate =
        useCallback(
            async (
                event: Extract<
                    RealtimeWebRTCEvent,
                    { type: "ICE_CANDIDATE" }
                >,
            ) => {
                if (
                    event.callId !==
                    callIdRef.current
                ) {
                    return;
                }

                const peer =
                    peerConnectionRef.current;

                if (
                    !peer ||
                    !peer.remoteDescription
                ) {
                    pendingIceCandidatesRef.current.push(
                        event.candidate,
                    );

                    return;
                }

                try {
                    await peer.addIceCandidate(
                        event.candidate,
                    );
                } catch (error) {
                    console.warn(
                        "[WebRTC] Failed to add ICE candidate:",
                        error,
                    );
                }
            },
            [],
        );

    /*
     * Listen for signaling.
     */
    useEffect(() => {
        if (
            !enabled ||
            !callId ||
            !callType
        ) {
            return;
        }

        const unsubscribe =
            realtimeClient.subscribe(
                (event) => {
                    if (
                        event.type !== "OFFER" &&
                        event.type !== "ANSWER" &&
                        event.type !==
                            "ICE_CANDIDATE"
                    ) {
                        return;
                    }

                    if (
                        event.callId !==
                        callIdRef.current
                    ) {
                        return;
                    }

                    void (async () => {
                        try {
                            switch (
                                event.type
                            ) {
                                case "OFFER":
                                    await handleOffer(
                                        event,
                                    );
                                    break;

                                case "ANSWER":
                                    await handleAnswer(
                                        event,
                                    );
                                    break;

                                case "ICE_CANDIDATE":
                                    await handleIceCandidate(
                                        event,
                                    );
                                    break;
                            }
                        } catch (error) {
                            reportFailure(
                                error,
                            );
                        }
                    })();
                },
            );

        return unsubscribe;
    }, [
        enabled,
        callId,
        callType,
        handleOffer,
        handleAnswer,
        handleIceCandidate,
        reportFailure,
    ]);

    /*
     * Caller automatically starts negotiation.
     *
     * There is NO "Enter call" button.
     */
    useEffect(() => {
        if (
            !enabled ||
            !callId ||
            !callType ||
            !isCaller
        ) {
            return;
        }

        let cancelled = false;

        async function startCallerNegotiation() {
            try {
                const stream =
                    await ensureLocalMedia();

                if (cancelled) {
                    return;
                }

                const peer =
                    createPeerConnection();

                await addLocalTracks(
                    peer,
                    stream,
                );

                if (cancelled) {
                    return;
                }

                await createOffer(peer);
            } catch (error) {
                if (cancelled) {
                    return;
                }

                reportFailure(error);
            }
        }

        void startCallerNegotiation();

        return () => {
            cancelled = true;
        };
    }, [
        enabled,
        callId,
        callType,
        isCaller,
        ensureLocalMedia,
        createPeerConnection,
        addLocalTracks,
        createOffer,
        reportFailure,
    ]);

    /*
     * Release all media when the call disappears
     * or the hook becomes disabled.
     */
    useEffect(() => {
        if (
            enabled &&
            callId &&
            callType
        ) {
            return;
        }

        cleanup();
    }, [
        enabled,
        callId,
        callType,
        cleanup,
    ]);

    return {
        localStream,
        remoteStream,

        connectionState,

        error,

        isMuted,
        isCameraEnabled,

        isConnected:
            connectionState ===
            "connected",

        isConnecting:
            connectionState ===
                "requesting-media" ||
            connectionState ===
                "connecting",

        toggleMute,
        toggleCamera,

        cleanup,
    };
}