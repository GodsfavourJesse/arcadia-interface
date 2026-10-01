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

import {
    getIceConfig,
} from "@/app/services/calls.service";

import type {
    RealtimeWebRTCEvent,
    RealtimeWebRTCClientEvent,
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
    onFailed?: (error: Error) => void;
};

type IceServerResponse = {
    urls:
        | string
        | string[];
    username?: string | null;
    credential?: string | null;
};

type RealtimeIceCandidate = Extract<
    RealtimeWebRTCClientEvent,
    { type: "ICE_CANDIDATE" }
>["candidate"];

const DEFAULT_ICE_SERVERS: RTCConfiguration = {
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
                    max: 1920,
                },
                height: {
                    ideal: 720,
                    max: 1080,
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

function toIceCandidateInit(
    candidate: RTCIceCandidate,
): RTCIceCandidateInit {
    return {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
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

function toRealtimeIceCandidate(
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
        candidate: candidate.candidate,
        sdpMid:
            candidate.sdpMid ?? null,
        sdpMLineIndex:
            candidate.sdpMLineIndex ?? null,
        ...(candidate.usernameFragment !==
        undefined
            ? {
                  usernameFragment:
                      candidate.usernameFragment,
              }
            : {}),
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
        useRef<RTCPeerConnection | null>(null);

    const iceServersRef =
        useRef<RTCIceServer[]>(
            DEFAULT_ICE_SERVERS.iceServers ?? [],
        );

    const iceConfigLoadedRef =
        useRef(false);

    const localStreamRef =
        useRef<MediaStream | null>(null);

    const remoteStreamRef =
        useRef<MediaStream | null>(null);

    const pendingIceCandidatesRef =
        useRef<RTCIceCandidateInit[]>([]);

    const pendingLocalIceCandidatesRef =
        useRef<RTCIceCandidateInit[]>([]);

    const flushingLocalIceRef =
        useRef(false);

    const pendingOfferRef =
        useRef<Extract<
            RealtimeWebRTCEvent,
            { type: "OFFER" }
        > | null>(null);

    const negotiationStartedRef =
        useRef(false);

    const connectedReportedRef =
        useRef(false);

    const peerConnectedRef =
        useRef(false);

    const remoteMediaReadyRef =
        useRef(false);

    const callIdRef =
        useRef(callId);

    const callTypeRef =
        useRef(callType);

    const isCallerRef =
        useRef(isCaller);

    const enabledRef =
        useRef(enabled);

    const onConnectedRef =
        useRef(onConnected);

    const onFailedRef =
        useRef(onFailed);

    const isMutedRef =
        useRef(false);

    const isCameraEnabledRef =
        useRef(callType === "video");

    const [localStream, setLocalStream] =
        useState<MediaStream | null>(null);

    const [remoteStream, setRemoteStream] =
        useState<MediaStream | null>(null);

    const [connectionState, setConnectionState] =
        useState<WebRTCConnectionState>(
            "idle",
        );

    const [isMuted, setIsMuted] =
        useState(false);

    const [isCameraEnabled, setIsCameraEnabled] =
        useState(callType === "video");

    const [remoteAudioEnabled, setRemoteAudioEnabled] =
        useState(true);

    const [remoteVideoEnabled, setRemoteVideoEnabled] =
        useState(
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
        isCallerRef.current = isCaller;
    }, [isCaller]);

    useEffect(() => {
        enabledRef.current = enabled;
    }, [enabled]);

    useEffect(() => {
        onConnectedRef.current = onConnected;
    }, [onConnected]);

    useEffect(() => {
        onFailedRef.current = onFailed;
    }, [onFailed]);

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    useEffect(() => {
        isCameraEnabledRef.current =
            isCameraEnabled;
    }, [isCameraEnabled]);

    const reportFailure =
        useCallback((unknownError: unknown) => {
            const normalized =
                unknownError instanceof Error
                    ? unknownError
                    : new Error(
                          "Unable to connect the call.",
                      );

            console.error(
                "[WebRTC] Failure:",
                normalized,
            );

            setError(normalized.message);
            setConnectionState("failed");

            onFailedRef.current?.(
                normalized,
            );
        }, []);

    const maybeReportConnected =
        useCallback(() => {
            if (
                connectedReportedRef.current ||
                !peerConnectedRef.current ||
                !remoteMediaReadyRef.current
            ) {
                return;
            }

            connectedReportedRef.current =
                true;

            setConnectionState(
                "connected",
            );

            onConnectedRef.current?.();
        }, []);

    /*
     * Send the current local microphone/camera
     * state to the remote participant.
     *
     * The actual media continues to travel directly
     * through WebRTC. This event is only for UI/state
     * synchronization.
     */
    const sendMediaState =
        useCallback(
            async (
                audioEnabled: boolean,
                videoEnabled: boolean,
            ) => {
                const currentCallId =
                    callIdRef.current;

                if (!currentCallId) {
                    return;
                }

                const available =
                    await realtimeClient.waitUntilOpen(
                        10_000,
                    );

                if (!available) {
                    console.warn(
                        "[WebRTC] Unable to send media state: realtime unavailable.",
                    );

                    return;
                }

                const sent =
                    realtimeClient.send({
                        type: "MEDIA_STATE",
                        callId:
                            currentCallId,
                        audioEnabled,
                        videoEnabled,
                    });

                if (!sent) {
                    console.warn(
                        "[WebRTC] Unable to send media state.",
                    );
                }
            },
            [],
        );

    const cleanup = useCallback(() => {
        const peer =
            peerConnectionRef.current;

        peerConnectionRef.current = null;

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

        pendingIceCandidatesRef.current = [];
        pendingLocalIceCandidatesRef.current =
            [];
        pendingOfferRef.current = null;

        negotiationStartedRef.current =
            false;
        connectedReportedRef.current =
            false;
        peerConnectedRef.current = false;
        remoteMediaReadyRef.current =
            false;
        flushingLocalIceRef.current =
            false;
        iceConfigLoadedRef.current =
            false;

        iceServersRef.current =
            DEFAULT_ICE_SERVERS.iceServers ?? [];

        isMutedRef.current = false;

        isCameraEnabledRef.current =
            callTypeRef.current ===
            "video";

        setLocalStream(null);
        setRemoteStream(null);
        setConnectionState("idle");
        setError(null);
        setIsMuted(false);

        setIsCameraEnabled(
            callTypeRef.current ===
                "video",
        );

        setRemoteAudioEnabled(true);

        setRemoteVideoEnabled(
            callTypeRef.current ===
                "video",
        );
    }, []);

    const toggleMute = useCallback(() => {
        const stream =
            localStreamRef.current;

        if (!stream) {
            return;
        }

        const tracks =
            stream.getAudioTracks();

        if (!tracks.length) {
            return;
        }

        const nextMuted =
            !isMutedRef.current;

        for (const track of tracks) {
            track.enabled =
                !nextMuted;
        }

        isMutedRef.current =
            nextMuted;

        setIsMuted(nextMuted);

        void sendMediaState(
            !nextMuted,
            isCameraEnabledRef.current,
        );
    }, [sendMediaState]);

    const toggleCamera = useCallback(() => {
        const stream =
            localStreamRef.current;

        if (!stream) {
            return;
        }

        const tracks =
            stream.getVideoTracks();

        if (!tracks.length) {
            return;
        }

        const nextEnabled =
            !isCameraEnabledRef.current;

        for (const track of tracks) {
            track.enabled =
                nextEnabled;
        }

        isCameraEnabledRef.current =
            nextEnabled;

        setIsCameraEnabled(
            nextEnabled,
        );

        void sendMediaState(
            !isMutedRef.current,
            nextEnabled,
        );
    }, [sendMediaState]);

    const waitForRealtime =
        useCallback(async () => {
            const available =
                await realtimeClient.waitUntilOpen(
                    10_000,
                );

            if (!available) {
                throw new Error(
                    "Realtime connection is unavailable.",
                );
            }
        }, []);

    const flushLocalIceCandidates =
        useCallback(async () => {
            if (
                flushingLocalIceRef.current ||
                pendingLocalIceCandidatesRef.current
                    .length === 0 ||
                !callIdRef.current
            ) {
                return;
            }

            flushingLocalIceRef.current =
                true;

            try {
                await waitForRealtime();

                const callIdValue =
                    callIdRef.current;

                if (!callIdValue) {
                    return;
                }

                const candidates =
                    pendingLocalIceCandidatesRef.current;

                pendingLocalIceCandidatesRef.current =
                    [];

                for (
                    let index = 0;
                    index <
                    candidates.length;
                    index += 1
                ) {
                    const candidate =
                        candidates[index];

                    if (
                        typeof candidate
                            .candidate !==
                        "string"
                    ) {
                        console.warn(
                            "[WebRTC] Skipping invalid ICE candidate.",
                        );

                        continue;
                    }

                    const realtimeCandidate =
                        toRealtimeIceCandidate(
                            candidate,
                        );

                    const sent =
                        realtimeClient.send({
                            type: "ICE_CANDIDATE",
                            callId:
                                callIdValue,
                            candidate:
                                realtimeCandidate,
                        });

                    if (!sent) {
                        pendingLocalIceCandidatesRef.current =
                            candidates
                                .slice(index)
                                .concat(
                                    pendingLocalIceCandidatesRef.current,
                                );

                        break;
                    }
                }
            } catch (error) {
                console.warn(
                    "[WebRTC] ICE flush deferred:",
                    error,
                );
            } finally {
                flushingLocalIceRef.current =
                    false;
            }
        }, [waitForRealtime]);

    const sendSignalingEvent =
        useCallback(
            async (
                event: RealtimeWebRTCClientEvent,
            ) => {
                await waitForRealtime();

                const sent =
                    realtimeClient.send(event);

                if (!sent) {
                    throw new Error(
                        "Realtime signaling is unavailable.",
                    );
                }
            },
            [waitForRealtime],
        );

    const addPendingIceCandidates =
        useCallback(
            async (
                peer: RTCPeerConnection,
            ) => {
                if (!peer.remoteDescription) {
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

    const loadIceConfig =
        useCallback(async () => {
            if (iceConfigLoadedRef.current) {
                return;
            }

            try {
                const response =
                    await getIceConfig();

                const iceServers =
                    response.data
                        .iceServers as IceServerResponse[];

                const servers: RTCIceServer[] =
                    iceServers
                        .filter(
                            (
                                server: IceServerResponse,
                            ) =>
                                Boolean(
                                    server.urls,
                                ),
                        )
                        .map(
                            (
                                server: IceServerResponse,
                            ) => ({
                                urls:
                                    server.urls,

                                ...(server.username
                                    ? {
                                          username:
                                              server.username,
                                      }
                                    : {}),

                                ...(server.credential
                                    ? {
                                          credential:
                                              server.credential,
                                      }
                                    : {}),
                            }),
                        );

                if (
                    servers.length > 0
                ) {
                    iceServersRef.current =
                        servers;
                }
            } catch (error) {
                console.warn(
                    "[WebRTC] ICE configuration unavailable; using STUN fallback.",
                    error,
                );
            } finally {
                iceConfigLoadedRef.current =
                    true;
            }
        }, []);

    const createPeerConnection =
        useCallback(() => {
            const existing =
                peerConnectionRef.current;

            if (existing) {
                return existing;
            }

            const peer =
                new RTCPeerConnection({
                    iceServers:
                        iceServersRef.current,
                });

            peerConnectionRef.current =
                peer;

            const incomingStream =
                new MediaStream();

            remoteStreamRef.current =
                incomingStream;

            setRemoteStream(
                incomingStream,
            );

            peer.ontrack = (event) => {
                /*
                 * Always use the actual incoming WebRTC
                 * track. Do not use the local stream here.
                 */
                const tracks =
                    event.streams.length > 0
                        ? event.streams.flatMap(
                              (
                                  stream,
                              ) =>
                                  stream.getTracks(),
                          )
                        : [
                              event.track,
                          ];

                for (const track of tracks) {
                    if (
                        !incomingStream.getTrackById(
                            track.id,
                        )
                    ) {
                        incomingStream.addTrack(
                            track,
                        );
                    }
                }

                const nextStream =
                    new MediaStream(
                        incomingStream.getTracks(),
                    );

                setRemoteStream(
                    nextStream,
                );

                const requiredKind =
                    callTypeRef.current ===
                    "video"
                        ? "video"
                        : "audio";

                remoteMediaReadyRef.current =
                    incomingStream
                        .getTracks()
                        .some(
                            (track) =>
                                track.kind ===
                                requiredKind,
                        );

                maybeReportConnected();
            };

            peer.onicecandidate = (event) => {
                if (
                    !event.candidate ||
                    !callIdRef.current
                ) {
                    return;
                }

                pendingLocalIceCandidatesRef.current.push(
                    toIceCandidateInit(
                        event.candidate,
                    ),
                );

                void flushLocalIceCandidates();
            };

            peer.onconnectionstatechange =
                () => {
                    const state =
                        peer.connectionState;

                    switch (state) {
                        case "new":
                        case "connecting":
                            setConnectionState(
                                "connecting",
                            );
                            break;

                        case "connected":
                            peerConnectedRef.current =
                                true;

                            maybeReportConnected();
                            break;

                        case "disconnected":
                            setConnectionState(
                                "disconnected",
                            );
                            break;

                        case "failed": {
                            const failure =
                                new Error(
                                    "Unable to establish the call.",
                                );

                            setError(
                                failure.message,
                            );

                            setConnectionState(
                                "failed",
                            );

                            onFailedRef.current?.(
                                failure,
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
                    if (
                        peer.iceConnectionState ===
                            "connected" ||
                        peer.iceConnectionState ===
                            "completed"
                    ) {
                        peerConnectedRef.current =
                            true;

                        maybeReportConnected();
                    }
                };

            return peer;
        }, [
            flushLocalIceCandidates,
            maybeReportConnected,
        ]);

    const ensureLocalMedia =
        useCallback(async () => {
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
                !navigator.mediaDevices
                    ?.getUserMedia
            ) {
                throw new Error(
                    "Camera and microphone are unavailable in this browser.",
                );
            }

            setConnectionState(
                "requesting-media",
            );

            try {
                const stream =
                    await navigator.mediaDevices.getUserMedia(
                        createMediaConstraints(
                            type,
                        ),
                    );

                localStreamRef.current =
                    stream;

                setLocalStream(stream);

                isMutedRef.current =
                    false;

                isCameraEnabledRef.current =
                    type === "video";

                setIsMuted(false);

                setIsCameraEnabled(
                    type === "video",
                );

                return stream;
            } catch (error) {
                const normalized =
                    error instanceof Error
                        ? error
                        : new Error(
                              "Unable to access your camera or microphone.",
                          );

                if (
                    normalized.name ===
                    "NotReadableError"
                ) {
                    throw new Error(
                        "Your camera or microphone is already being used by another application or browser tab.",
                    );
                }

                if (
                    normalized.name ===
                    "NotAllowedError"
                ) {
                    throw new Error(
                        "Camera and microphone permission was denied.",
                    );
                }

                if (
                    normalized.name ===
                    "NotFoundError"
                ) {
                    throw new Error(
                        "No camera or microphone was found.",
                    );
                }

                throw normalized;
            }
        }, []);

    const addLocalTracks =
        useCallback(
            async (
                peer: RTCPeerConnection,
                stream: MediaStream,
            ) => {
                const senders =
                    peer.getSenders();

                for (const track of stream.getTracks()) {
                    const exists =
                        senders.some(
                            (sender) =>
                                sender.track
                                    ?.id ===
                                track.id,
                        );

                    if (!exists) {
                        peer.addTrack(
                            track,
                            stream,
                        );
                    }
                }
            },
            [],
        );

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
                    const offer =
                        await peer.createOffer();

                    await peer.setLocalDescription(
                        offer,
                    );

                    const description =
                        peer.localDescription;

                    if (
                        !description?.sdp
                    ) {
                        throw new Error(
                            "WebRTC offer is unavailable.",
                        );
                    }

                    const currentCallId =
                        callIdRef.current;

                    if (!currentCallId) {
                        throw new Error(
                            "Call ID is unavailable.",
                        );
                    }

                    await sendSignalingEvent({
                        type: "OFFER",
                        callId:
                            currentCallId,
                        sdp: description.sdp,
                    });

                    await flushLocalIceCandidates();

                    setConnectionState(
                        "connecting",
                    );
                } catch (error) {
                    negotiationStartedRef.current =
                        false;

                    throw error;
                }
            },
            [
                flushLocalIceCandidates,
                sendSignalingEvent,
            ],
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

                if (
                    !enabledRef.current
                ) {
                    pendingOfferRef.current =
                        event;

                    return;
                }

                await loadIceConfig();

                const peer =
                    createPeerConnection();

                const stream =
                    await ensureLocalMedia();

                await addLocalTracks(
                    peer,
                    stream,
                );

                await peer.setRemoteDescription({
                    type: "offer",
                    sdp: event.sdp,
                });

                await addPendingIceCandidates(
                    peer,
                );

                const answer =
                    await peer.createAnswer();

                await peer.setLocalDescription(
                    answer,
                );

                const description =
                    peer.localDescription;

                if (!description?.sdp) {
                    throw new Error(
                        "WebRTC answer is unavailable.",
                    );
                }

                await sendSignalingEvent({
                    type: "ANSWER",
                    callId:
                        event.callId,
                    sdp: description.sdp,
                });

                await flushLocalIceCandidates();

                setConnectionState(
                    "connecting",
                );
            },
            [
                addLocalTracks,
                addPendingIceCandidates,
                createPeerConnection,
                ensureLocalMedia,
                loadIceConfig,
                flushLocalIceCandidates,
                sendSignalingEvent,
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
                        callIdRef.current ||
                    !isCallerRef.current
                ) {
                    return;
                }

                const peer =
                    peerConnectionRef.current;

                if (!peer) {
                    return;
                }

                await peer.setRemoteDescription({
                    type: "answer",
                    sdp: event.sdp,
                });

                await addPendingIceCandidates(
                    peer,
                );

                await flushLocalIceCandidates();

                setConnectionState(
                    "connecting",
                );
            },
            [
                addPendingIceCandidates,
                flushLocalIceCandidates,
            ],
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
     * Subscribe to WebRTC signaling and remote media state.
     */
    useEffect(() => {
        if (
            !callId ||
            !callType
        ) {
            return;
        }

        const unsubscribe =
            realtimeClient.subscribeWebRTC(
                callId,
                (event) => {
                    if (
                        event.type !==
                            "OFFER" &&
                        event.type !==
                            "ANSWER" &&
                        event.type !==
                            "ICE_CANDIDATE" &&
                        event.type !==
                            "MEDIA_STATE"
                    ) {
                        return;
                    }

                    if (
                        event.callId !==
                        callIdRef.current
                    ) {
                        return;
                    }

                    if (
                        event.type ===
                        "MEDIA_STATE"
                    ) {
                        setRemoteAudioEnabled(
                            event.audioEnabled,
                        );

                        setRemoteVideoEnabled(
                            event.videoEnabled,
                        );

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
        callId,
        callType,
        handleOffer,
        handleAnswer,
        handleIceCandidate,
        reportFailure,
    ]);

    /*
     * Retry local ICE and renegotiate after the shared
     * realtime socket reconnects.
     */
    useEffect(() => {
        if (
            !callId ||
            !callType
        ) {
            return;
        }

        const unsubscribe =
            realtimeClient.subscribeConnectionState(
                (state) => {
                    if (
                        state !== "open"
                    ) {
                        return;
                    }

                    void flushLocalIceCandidates();

                    /*
                     * Re-send current media state after
                     * reconnect so the remote UI can
                     * recover its state.
                     */
                    void sendMediaState(
                        !isMutedRef.current,
                        isCameraEnabledRef.current,
                    );

                    if (
                        !isCallerRef.current
                    ) {
                        return;
                    }

                    const peer =
                        peerConnectionRef.current;

                    if (
                        !peer ||
                        peer.connectionState ===
                            "closed" ||
                        peer.connectionState ===
                            "failed"
                    ) {
                        return;
                    }

                    negotiationStartedRef.current =
                        false;

                    void createOffer(
                        peer,
                    ).catch(
                        reportFailure,
                    );
                },
            );

        return unsubscribe;
    }, [
        callId,
        callType,
        createOffer,
        flushLocalIceCandidates,
        reportFailure,
        sendMediaState,
    ]);

    /*
     * Process an offer that arrived before ACCEPTED
     * was applied locally.
     */
    useEffect(() => {
        if (
            !enabled ||
            !callId ||
            !callType ||
            isCaller
        ) {
            return;
        }

        const queuedOffer =
            pendingOfferRef.current;

        if (!queuedOffer) {
            return;
        }

        pendingOfferRef.current = null;

        void handleOffer(
            queuedOffer,
        ).catch(reportFailure);
    }, [
        enabled,
        callId,
        callType,
        isCaller,
        handleOffer,
        reportFailure,
    ]);

    /*
     * Callee prepares microphone/camera immediately
     * after accepting.
     */
    useEffect(() => {
        if (
            !enabled ||
            !callId ||
            !callType ||
            isCaller
        ) {
            return;
        }

        let cancelled = false;

        async function prepareReceiverMedia() {
            try {
                const stream =
                    await ensureLocalMedia();

                if (cancelled) {
                    return;
                }

                await loadIceConfig();

                const peer =
                    createPeerConnection();

                await addLocalTracks(
                    peer,
                    stream,
                );

                if (!cancelled) {
                    setConnectionState(
                        "connecting",
                    );

                    void sendMediaState(
                        !isMutedRef.current,
                        isCameraEnabledRef.current,
                    );
                }
            } catch (error) {
                if (!cancelled) {
                    reportFailure(
                        error,
                    );
                }
            }
        }

        void prepareReceiverMedia();

        return () => {
            cancelled = true;
        };
    }, [
        enabled,
        callId,
        callType,
        isCaller,
        ensureLocalMedia,
        loadIceConfig,
        createPeerConnection,
        addLocalTracks,
        reportFailure,
        sendMediaState,
    ]);

    /*
     * Caller prepares local media and creates the offer
     * as soon as the callee accepts.
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

        async function startCaller() {
            try {
                const stream =
                    await ensureLocalMedia();

                if (cancelled) {
                    return;
                }

                await loadIceConfig();

                const peer =
                    createPeerConnection();

                await addLocalTracks(
                    peer,
                    stream,
                );

                if (cancelled) {
                    return;
                }

                void sendMediaState(
                    !isMutedRef.current,
                    isCameraEnabledRef.current,
                );

                await createOffer(peer);
            } catch (error) {
                if (!cancelled) {
                    reportFailure(
                        error,
                    );
                }
            }
        }

        void startCaller();

        return () => {
            cancelled = true;
        };
    }, [
        enabled,
        callId,
        callType,
        isCaller,
        ensureLocalMedia,
        loadIceConfig,
        createPeerConnection,
        addLocalTracks,
        createOffer,
        reportFailure,
        sendMediaState,
    ]);

    /*
     * Release media when the call disappears.
     */
    useEffect(() => {
        if (
            callId &&
            callType
        ) {
            return;
        }

        cleanup();
    }, [
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

        remoteAudioEnabled,
        remoteVideoEnabled,

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