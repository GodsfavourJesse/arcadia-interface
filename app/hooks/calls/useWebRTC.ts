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
} from "@/app/services/call/calls.service";

import type {
    RealtimeWebRTCEvent,
    RealtimeWebRTCClientEvent,
} from "@/app/types/realtime/realtime.types";

import type {
    CallType,
    CallVideoSource,
} from "@/app/types/calls/calls.types";

import type {
    WebRTCConnectionState,
    IceServerResponse,
} from "../webrtc/webrtc.types";

import {
    DEFAULT_ICE_SERVERS,
} from "../webrtc/webrtc.constants";

import {
    createMediaConstraints,
    configureAudioTracks,
    getAudioDiagnostics,
    stopMediaStream,
} from "../webrtc/webrtc.media";

import {
    toIceCandidateInit,
    toRealtimeIceCandidate,
} from "../webrtc/webrtc.ice";

import {
    createPeerConnection as createPeerConnectionInstance,
    addLocalTracks as addLocalTracksToPeer,
    replaceVideoTrack as replacePeerVideoTrack,
} from "../webrtc/webrtc.peer";

type UseWebRTCOptions = {
    callId: string | null;
    callType: CallType | null;
    isCaller: boolean;
    enabled: boolean;
    initialVideoSource?: CallVideoSource;

    onConnected?: () => void;
    onFailed?: (error: Error) => void;
};

export function useWebRTC({
    callId,
    callType,
    isCaller,
    enabled,
    initialVideoSource = "camera",
    onConnected,
    onFailed,
}: UseWebRTCOptions) {
    const peerConnectionRef =
        useRef<RTCPeerConnection | null>(
            null,
        );

    const videoSenderRef =
        useRef<RTCRtpSender | null>(
            null,
        );

    const audioSenderRef =
        useRef<RTCRtpSender | null>(
            null,
        );

    const iceServersRef =
        useRef<RTCIceServer[]>(
            DEFAULT_ICE_SERVERS.iceServers ??
                [],
        );

    const iceConfigLoadedRef =
        useRef(false);

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

    const pendingLocalIceCandidatesRef =
        useRef<RTCIceCandidateInit[]>(
            [],
        );

    const flushingLocalIceRef =
        useRef(false);

    const pendingOfferRef =
        useRef<
            Extract<
                RealtimeWebRTCEvent,
                { type: "OFFER" }
            > | null
        >(null);

    const negotiationStartedRef =
        useRef(false);

    const connectedReportedRef =
        useRef(false);

    const peerConnectedRef =
        useRef(false);

    const remoteMediaReadyRef =
        useRef(false);

    /*
     * True when the active RTCPeerConnection has
     * a video RTCRtpSender available.
     *
     * This is the capability consumed by the
     * avatar media layer.
     */
    const [
        isVideoSenderReady,
        setIsVideoSenderReady,
    ] = useState(false);

    const callIdRef =
        useRef(callId);

    const callTypeRef =
        useRef(callType);

    const isCallerRef =
        useRef(isCaller);

    const initialVideoSourceRef =
        useRef<CallVideoSource>(initialVideoSource);

    const enabledRef =
        useRef(enabled);

    const onConnectedRef =
        useRef(onConnected);

    const onFailedRef =
        useRef(onFailed);

    const isMutedRef =
        useRef(false);

    const isCameraEnabledRef =
        useRef(
            callType === "video",
        );

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
    ] =
        useState(
            callType === "video",
        );

    const [
        remoteAudioEnabled,
        setRemoteAudioEnabled,
    ] =
        useState(true);

    const [
        remoteVideoEnabled,
        setRemoteVideoEnabled,
    ] =
        useState(
            callType === "video",
        );

    const [error, setError] =
        useState<string | null>(
            null,
        );

    useEffect(() => {
        callIdRef.current =
            callId;
    }, [callId]);

    useEffect(() => {
        callTypeRef.current =
            callType;
    }, [callType]);

    useEffect(() => {
        isCallerRef.current =
            isCaller;
    }, [isCaller]);

    useEffect(() => {
        initialVideoSourceRef.current =
            initialVideoSource;
    }, [initialVideoSource]);

    useEffect(() => {
        enabledRef.current =
            enabled;
    }, [enabled]);

    useEffect(() => {
        onConnectedRef.current =
            onConnected;
    }, [onConnected]);

    useEffect(() => {
        onFailedRef.current =
            onFailed;
    }, [onFailed]);

    useEffect(() => {
        isMutedRef.current =
            isMuted;
    }, [isMuted]);

    useEffect(() => {
        isCameraEnabledRef.current =
            isCameraEnabled;
    }, [isCameraEnabled]);

    const reportFailure =
        useCallback(
            (unknownError: unknown) => {
                const normalized =
                    unknownError instanceof
                    Error
                        ? unknownError
                        : new Error(
                              "Unable to connect the call.",
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

    const maybeReportConnected =
        useCallback(() => {
            console.log(
                "[WebRTC] Checking connected state",
                {
                    callId: callIdRef.current,
                    peerConnected:
                        peerConnectedRef.current,
                    remoteMediaReady:
                        remoteMediaReadyRef.current,
                    alreadyReported:
                        connectedReportedRef.current,
                    peerConnectionState:
                        peerConnectionRef.current
                            ?.connectionState ?? null,
                    iceConnectionState:
                        peerConnectionRef.current
                            ?.iceConnectionState ?? null,
                },
            );

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
     * Send local microphone/camera state to the
     * remote participant.
     *
     * Media itself continues to travel through WebRTC.
     * This message only synchronizes UI state.
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
                    console.warn(
                        "[WebRTC] Cannot send media state without callId",
                    );
                    return;
                }

                console.log("[WebRTC] Sending media state", {
                    callId: currentCallId,
                    audioEnabled,
                    videoEnabled,
                });

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

                console.log("[WebRTC] Media state send result", {
                    callId: currentCallId,
                    sent,
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

    /*
     * Completely release the WebRTC call.
     *
     * This owns the physical camera/microphone
     * because those tracks were acquired by
     * useWebRTC().
     *
     * Avatar-owned MediaStreams are NOT stored here
     * and therefore are not touched by this cleanup.
     */
    const cleanup =
        useCallback(() => {
            console.log("[WebRTC] Cleanup requested", {
                callId: callIdRef.current,
                callType: callTypeRef.current,
                isCaller: isCallerRef.current,
                peerConnectionState:
                    peerConnectionRef.current
                        ?.connectionState ?? null,
                iceConnectionState:
                    peerConnectionRef.current
                        ?.iceConnectionState ?? null,
                localTracks:
                    localStreamRef.current
                        ?.getTracks()
                        .map((track) => ({
                            kind: track.kind,
                            id: track.id,
                            readyState: track.readyState,
                            enabled: track.enabled,
                        })) ?? [],
                remoteTracks:
                    remoteStreamRef.current
                        ?.getTracks()
                        .map((track) => ({
                            kind: track.kind,
                            id: track.id,
                            readyState: track.readyState,
                        })) ?? [],
            });

            const peer =
                peerConnectionRef.current;

            peerConnectionRef.current =
                null;

            videoSenderRef.current =
                null;

            setIsVideoSenderReady(
                false,
            );

            audioSenderRef.current =
                null;

            if (peer) {
                peer.onicecandidate =
                    null;

                peer.ontrack =
                    null;

                peer.onconnectionstatechange =
                    null;

                peer.oniceconnectionstatechange =
                    null;

                try {
                    peer.close();
                } catch {
                    // Already closed.
                }
            }

            const stream =
                localStreamRef.current;

            localStreamRef.current =
                null;

            stopMediaStream(
                stream,
            );

            remoteStreamRef.current =
                null;

            pendingIceCandidatesRef.current =
                [];

            pendingLocalIceCandidatesRef.current =
                [];

            pendingOfferRef.current =
                null;

            negotiationStartedRef.current =
                false;

            connectedReportedRef.current =
                false;

            peerConnectedRef.current =
                false;

            remoteMediaReadyRef.current =
                false;

            flushingLocalIceRef.current =
                false;

            iceConfigLoadedRef.current =
                false;

            iceServersRef.current =
                DEFAULT_ICE_SERVERS.iceServers ??
                    [];

            isMutedRef.current =
                false;

            isCameraEnabledRef.current =
                callTypeRef.current ===
                "video";

            setLocalStream(
                null,
            );

            setRemoteStream(
                null,
            );

            setConnectionState(
                "idle",
            );

            setError(
                null,
            );

            setIsMuted(
                false,
            );

            setIsCameraEnabled(
                callTypeRef.current ===
                    "video",
            );

            setRemoteAudioEnabled(
                true,
            );

            setRemoteVideoEnabled(
                callTypeRef.current ===
                    "video",
            );
        }, []);

    /*
     * Toggle microphone mute state.
     */
    const toggleMute =
        useCallback(() => {
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

            setIsMuted(
                nextMuted,
            );

            void sendMediaState(
                !nextMuted,
                isCameraEnabledRef.current,
            );
        }, [sendMediaState]);

    /*
     * Toggle the physical camera track.
     *
     * This controls the camera source itself.
     * It does not know whether WebRTC is currently
     * sending the camera track or an avatar track.
     */
    const toggleCamera =
        useCallback(() => {
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

    /*
     * Replace the video track already owned by
     * the active RTCRtpSender.
     *
     * This is intentionally generic.
     *
     * It does NOT:
     * - create a new RTCPeerConnection
     * - add another track
     * - create another offer
     * - create another answer
     * - renegotiate the call
     *
     * This capability is consumed by higher-level
     * media features such as the avatar media bridge.
     */
    const replaceVideoTrack =
        useCallback(
            async (
                nextTrack: MediaStreamTrack | null,
            ): Promise<void> => {
                const peer =
                    peerConnectionRef.current;

                if (!peer) {
                    throw new Error(
                        "WebRTC peer connection is not available.",
                    );
                }

                if (
                    peer.connectionState ===
                        "closed" ||
                    peer.connectionState ===
                        "failed"
                ) {
                    throw new Error(
                        "WebRTC peer connection is no longer active.",
                    );
                }

                const sender =
                    videoSenderRef.current;

                if (!sender) {
                    throw new Error(
                        "WebRTC video sender is not available.",
                    );
                }

                const previousTrack =
                    sender.track;

                console.log(
                    "[WebRTC] Replacing video sender track",
                    {
                        callId: callIdRef.current,
                        connectionState:
                            peer.connectionState,
                        senderTrackBefore: {
                            id:
                                previousTrack?.id ??
                                null,
                            readyState:
                                previousTrack
                                    ?.readyState ??
                                null,
                            kind:
                                previousTrack?.kind ??
                                null,
                            enabled:
                                previousTrack?.enabled ??
                                null,
                        },
                        nextTrack: {
                            id:
                                nextTrack?.id ??
                                null,
                            readyState:
                                nextTrack
                                    ?.readyState ??
                                null,
                            kind:
                                nextTrack?.kind ??
                                null,
                            enabled:
                                nextTrack?.enabled ??
                                null,
                        },
                    },
                );

                await replacePeerVideoTrack(
                    sender,
                    nextTrack,
                );

                console.log(
                    "[WebRTC] Video sender track replaced",
                    {
                        senderTrackAfter: {
                            id:
                                sender.track?.id ??
                                null,
                            readyState:
                                sender.track
                                    ?.readyState ??
                                null,
                            kind:
                                sender.track?.kind ??
                                null,
                            enabled:
                                sender.track
                                    ?.enabled ??
                                null,
                        },
                    },
                );
            },
            [],
        );

    const waitForRealtime =
        useCallback(
            async () => {
                const available =
                    await realtimeClient.waitUntilOpen(
                        10_000,
                    );

                if (!available) {
                    throw new Error(
                        "Realtime connection is unavailable.",
                    );
                }
            },
            [],
        );

    const flushLocalIceCandidates =
        useCallback(
            async () => {
                if (
                    flushingLocalIceRef.current ||
                    pendingLocalIceCandidatesRef
                        .current.length === 0 ||
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
                                    .slice(
                                        index,
                                    )
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
            },
            [waitForRealtime],
        );

    const sendSignalingEvent =
        useCallback(
            async (
                event: RealtimeWebRTCClientEvent,
            ) => {
                await waitForRealtime();

                const sent =
                    realtimeClient.send(
                        event,
                    );

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

    const loadIceConfig =
        useCallback(
            async () => {
                if (
                    iceConfigLoadedRef.current
                ) {
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

            console.log(
                "[WebRTC] Creating RTCPeerConnection",
                {
                    callId: callIdRef.current,
                    callType: callTypeRef.current,
                    isCaller: isCallerRef.current,
                    initialVideoSource:
                        initialVideoSourceRef.current,
                    iceServers:
                        iceServersRef.current.map(
                            (server) => ({
                                urls: server.urls,
                                hasUsername:
                                    Boolean(
                                        server.username,
                                    ),
                                hasCredential:
                                    Boolean(
                                        server.credential,
                                    ),
                            }),
                        ),
                },
            );

            const peer =
                createPeerConnectionInstance(
                    iceServersRef.current,
                );

            peerConnectionRef.current =
                peer;

            console.log(
                "[WebRTC] RTCPeerConnection created",
                {
                    connectionState:
                        peer.connectionState,
                    signalingState:
                        peer.signalingState,
                    iceConnectionState:
                        peer.iceConnectionState,
                },
            );

            const incomingStream =
                new MediaStream();

            remoteStreamRef.current =
                incomingStream;

            setRemoteStream(
                incomingStream,
            );

            peer.ontrack =
                (event) => {
                    console.log("[WebRTC] Remote track received", {
                        kind: event.track.kind,
                        id: event.track.id,
                        readyState: event.track.readyState,
                        streams: event.streams.map(
                            (stream) => stream.id,
                        ),
                    });
                    /*
                     * Always use the actual incoming
                     * WebRTC track. Never use the
                     * local stream here.
                     */
                    const tracks =
                        event.streams.length >
                        0
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

                    console.log(
                        "[WebRTC] Remote stream updated",
                        {
                            callId: callIdRef.current,
                            requiredKind,
                            streamId:
                                nextStream.id,
                            tracks:
                                nextStream
                                    .getTracks()
                                    .map(
                                        (track) => ({
                                            kind:
                                                track.kind,
                                            id:
                                                track.id,
                                            readyState:
                                                track.readyState,
                                            enabled:
                                                track.enabled,
                                        }),
                                    ),
                        },
                    );

                    remoteMediaReadyRef.current =
                        incomingStream
                            .getTracks()
                            .some(
                                (
                                    track,
                                ) =>
                                    track.kind ===
                                    requiredKind,
                            );

                    maybeReportConnected();
                };

            peer.onicecandidate =
                (event) => {
                    console.log(
                        "[WebRTC] Local ICE candidate event",
                        {
                            callId: callIdRef.current,
                            hasCandidate:
                                Boolean(event.candidate),
                            candidate:
                                event.candidate?.candidate ??
                                null,
                        },
                    );

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

                    console.log(
                        "[WebRTC] Local ICE queued",
                        {
                            callId: callIdRef.current,
                            pendingCount:
                                pendingLocalIceCandidatesRef
                                    .current.length,
                        },
                    );

                    void flushLocalIceCandidates();
                };

            peer.onconnectionstatechange =
                () => {
                    const state =
                        peer.connectionState;

                    console.log(
                        "[WebRTC] Peer connection state changed",
                        {
                            callId: callIdRef.current,
                            connectionState:
                                state,
                            signalingState:
                                peer.signalingState,
                            iceConnectionState:
                                peer.iceConnectionState,
                        },
                    );

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
                    console.log(
                        "[WebRTC] ICE connection state changed",
                        {
                            callId: callIdRef.current,
                            iceConnectionState:
                                peer.iceConnectionState,
                            connectionState:
                                peer.connectionState,
                            signalingState:
                                peer.signalingState,
                        },
                    );

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

    /*
     * Acquire the local microphone/camera.
     *
     * The browser receives the requested
     * audio-processing constraints first.
     * The acquired audio tracks are then
     * configured by the extracted WebRTC
     * media utility.
     */
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
                    const constraints =
                        createMediaConstraints(type);

                    console.log(
                        "[WebRTC] Requesting local media",
                        {
                            callId: callIdRef.current,
                            callType: type,
                            constraints,
                        },
                    );

                    const stream =
                        await navigator.mediaDevices.getUserMedia(
                            constraints,
                        );

                    console.log(
                        "[WebRTC] Local media acquired",
                        {
                            streamId: stream.id,
                            tracks:
                                stream
                                    .getTracks()
                                    .map(
                                        (track) => ({
                                            kind:
                                                track.kind,
                                            id:
                                                track.id,
                                            readyState:
                                                track.readyState,
                                            enabled:
                                                track.enabled,
                                            label:
                                                track.label,
                                            settings:
                                                track.getSettings(),
                                        }),
                                    ),
                        },
                    );

                    await configureAudioTracks(
                        stream,
                    );

                    const audioSettings =
                        getAudioDiagnostics(
                            stream,
                        );

                    console.debug(
                        "[WebRTC] Microphone settings:",
                        {
                            echoCancellation:
                                audioSettings?.echoCancellation,

                            noiseSuppression:
                                audioSettings?.noiseSuppression,

                            autoGainControl:
                                audioSettings?.autoGainControl,

                            channelCount:
                                audioSettings?.channelCount,
                        },
                    );

                    localStreamRef.current =
                        stream;

                    console.log(
                        "[WebRTC] Local media stored",
                        {
                            streamId: stream.id,
                            audioTrackIds:
                                stream
                                    .getAudioTracks()
                                    .map(
                                        (track) =>
                                            track.id,
                                    ),
                            videoTrackIds:
                                stream
                                    .getVideoTracks()
                                    .map(
                                        (track) =>
                                            track.id,
                                    ),
                        },
                    );

                    setLocalStream(
                        stream,
                    );

                    isMutedRef.current =
                        false;

                    isCameraEnabledRef.current =
                        type === "video";

                    setIsMuted(
                        false,
                    );

                    setIsCameraEnabled(
                        type === "video",
                    );

                    return stream;
                } catch (error) {
                    const normalized =
                        error instanceof
                        Error
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
            },
            [],
        );

    /*
     * Add local tracks only once.
     *
     * The caller's video preparation can execute once
     * before the avatar track exists and again when the
     * avatar track becomes available. Reusing the existing
     * RTCRtpSenders prevents duplicate tracks.
     */
    const addLocalTracks =
        useCallback(
            (
                peer: RTCPeerConnection,
                stream: MediaStream,
            ) => {
                console.log(
                    "[WebRTC] addLocalTracks called",
                    {
                        callId: callIdRef.current,
                        callType: callTypeRef.current,
                        peerConnectionState:
                            peer.connectionState,
                        streamId: stream.id,
                        tracks:
                            stream
                                .getTracks()
                                .map(
                                    (track) => ({
                                        kind:
                                            track.kind,
                                        id:
                                            track.id,
                                        readyState:
                                            track.readyState,
                                        enabled:
                                            track.enabled,
                                    }),
                                ),
                        existingVideoSender:
                            videoSenderRef.current
                                ?.track?.id ?? null,
                        existingAudioSender:
                            audioSenderRef.current
                                ?.track?.id ?? null,
                    },
                );

                /*
                 * Normal first-time setup.
                 */
                if (
                    !videoSenderRef.current &&
                    !audioSenderRef.current
                ) {
                    const result =
                        addLocalTracksToPeer(
                            peer,
                            stream,
                        );

                    videoSenderRef.current =
                        result.videoSender;

                    audioSenderRef.current =
                        result.audioSender;

                    console.log(
                        "[WebRTC] Local tracks added",
                        {
                            videoSenderTrack:
                                result.videoSender
                                    ?.track
                                    ? {
                                          id:
                                              result
                                                  .videoSender
                                                  .track
                                                  .id,
                                          readyState:
                                              result
                                                  .videoSender
                                                  .track
                                                  .readyState,
                                      }
                                    : null,
                            audioSenderTrack:
                                result.audioSender
                                    ?.track
                                    ? {
                                          id:
                                              result
                                                  .audioSender
                                                  .track
                                                  .id,
                                          readyState:
                                              result
                                                  .audioSender
                                                  .track
                                                  .readyState,
                                      }
                                    : null,
                        },
                    );

                    setIsVideoSenderReady(
                        result.videoSender !== null,
                    );

                    return;
                }

                /*
                 * Defensive recovery for a video sender
                 * that was not created during an earlier pass.
                 */
                if (
                    callTypeRef.current ===
                        "video" &&
                    !videoSenderRef.current
                ) {
                    const result =
                        addLocalTracksToPeer(
                            peer,
                            stream,
                        );

                    videoSenderRef.current =
                        result.videoSender;

                    if (
                        result.videoSender
                    ) {
                        setIsVideoSenderReady(
                            true,
                        );
                    }

                    if (
                        !audioSenderRef.current
                    ) {
                        audioSenderRef.current =
                            result.audioSender;
                    }

                    return;
                }

                /*
                 * Defensive recovery for an audio sender
                 * that was not created during an earlier pass.
                 */
                if (
                    !audioSenderRef.current
                ) {
                    const result =
                        addLocalTracksToPeer(
                            peer,
                            stream,
                        );

                    audioSenderRef.current =
                        result.audioSender;

                    if (
                        !videoSenderRef.current &&
                        result.videoSender
                    ) {
                        videoSenderRef.current =
                            result.videoSender;

                        setIsVideoSenderReady(
                            true,
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
                    console.log(
                        "[WebRTC] createOffer skipped: negotiation already started",
                        {
                            callId:
                                callIdRef.current,
                        },
                    );
                    return;
                }

                negotiationStartedRef.current =
                    true;

                console.log(
                    "[WebRTC] Starting offer creation",
                    {
                        callId:
                            callIdRef.current,
                        callType:
                            callTypeRef.current,
                        initialVideoSource:
                            initialVideoSourceRef.current,
                        connectionState:
                            peer.connectionState,
                        iceConnectionState:
                            peer.iceConnectionState,
                        senders:
                            peer
                                .getSenders()
                                .map(
                                    (sender) => ({
                                        kind:
                                            sender
                                                .track
                                                ?.kind ??
                                            null,
                                        trackId:
                                            sender
                                                .track
                                                ?.id ??
                                            null,
                                        readyState:
                                            sender
                                                .track
                                                ?.readyState ??
                                            null,
                                        enabled:
                                            sender
                                                .track
                                                ?.enabled ??
                                            null,
                                    }),
                                ),
                    },
                );

                try {
                    const videoSender =
                        peer.getSenders().find(
                            (sender) => sender.track?.kind === "video",
                        );

                    console.log("[WebRTC] Creating offer", {
                        videoTrackId: videoSender?.track?.id ?? null,
                        videoTrackReadyState: videoSender?.track?.readyState ?? null,
                    });


                    const offer = await peer.createOffer();

                    await peer.setLocalDescription(
                        offer,
                    );

                    console.log(
                        "[WebRTC] Local OFFER description created",
                        {
                            type:
                                peer
                                    .localDescription
                                    ?.type ?? null,
                            sdpLength:
                                peer
                                    .localDescription
                                    ?.sdp
                                    ?.length ?? 0,
                            senders:
                                peer
                                    .getSenders()
                                    .map(
                                        (sender) => ({
                                            kind:
                                                sender
                                                    .track
                                                    ?.kind ??
                                                null,
                                            trackId:
                                                sender
                                                    .track
                                                    ?.id ??
                                                null,
                                            readyState:
                                                sender
                                                    .track
                                                    ?.readyState ??
                                                null,
                                        }),
                                    ),
                        },
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

                    console.log(
                        "[WebRTC] Sending OFFER",
                        {
                            callId:
                                currentCallId,
                            sdpLength:
                                description.sdp
                                    .length,
                            videoSenderTrack:
                                peer
                                    .getSenders()
                                    .find(
                                        (sender) =>
                                            sender
                                                .track
                                                ?.kind ===
                                            "video",
                                    )
                                    ?.track
                                    ?.id ?? null,
                            videoSenderReadyState:
                                peer
                                    .getSenders()
                                    .find(
                                        (sender) =>
                                            sender
                                                .track
                                                ?.kind ===
                                            "video",
                                    )
                                    ?.track
                                    ?.readyState ??
                                null,
                        },
                    );

                    await sendSignalingEvent({
                        type: "OFFER",
                        callId:
                            currentCallId,
                        sdp: description.sdp,
                    });

                    console.log(
                        "[WebRTC] OFFER sent",
                        {
                            callId:
                                currentCallId,
                        },
                    );

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

    /*
     * Start the initial caller negotiation after the higher-level
     * media coordinator has installed the desired video track.
     *
     * Voice calls still use the automatic caller path below.
     * Video callers use this explicit entry point so the avatar
     * track can replace the camera before the first SDP offer.
     */
    const startInitialOffer =
        useCallback(
            async (): Promise<void> => {
                if (!isCallerRef.current) {
                    throw new Error(
                        "Only the caller can start the initial offer.",
                    );
                }

                const peer =
                    peerConnectionRef.current;

                if (!peer) {
                    throw new Error(
                        "WebRTC peer connection is not available.",
                    );
                }

                if (
                    peer.connectionState === "closed" ||
                    peer.connectionState === "failed"
                ) {
                    throw new Error(
                        "WebRTC peer connection is no longer active.",
                    );
                }

                if (
                    callTypeRef.current === "video" &&
                    !videoSenderRef.current
                ) {
                    throw new Error(
                        "WebRTC video sender is not available.",
                    );
                }

                if (negotiationStartedRef.current) {
                    console.log(
                        "[WebRTC] startInitialOffer skipped: negotiation already started",
                        {
                            callId:
                                callIdRef.current,
                        },
                    );
                    return;
                }

                console.log(
                    "[WebRTC] startInitialOffer called",
                    {
                        callId:
                            callIdRef.current,
                        callType:
                            callTypeRef.current,
                        initialVideoSource:
                            initialVideoSourceRef.current,
                        videoSenderTrack:
                            videoSenderRef.current
                                ?.track?.id ?? null,
                        videoSenderReadyState:
                            videoSenderRef.current
                                ?.track?.readyState ?? null,
                        videoSenderEnabled:
                            videoSenderRef.current
                                ?.track?.enabled ?? null,
                        peerConnectionState:
                            peer.connectionState,
                        signalingState:
                            peer.signalingState,
                    },
                );

                await sendMediaState(
                    !isMutedRef.current,
                    isCameraEnabledRef.current,
                );

                await createOffer(peer);
            },
            [
                createOffer,
                sendMediaState,
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
                console.log("[WebRTC] OFFER received", {
                    eventCallId: event.callId,
                    activeCallId: callIdRef.current,
                    sdpLength: event.sdp.length,
                    isCaller: isCallerRef.current,
                    enabled: enabledRef.current,
                });

                if (
                    event.callId !==
                    callIdRef.current
                ) {
                    console.warn(
                        "[WebRTC] Ignoring OFFER for another call",
                        {
                            eventCallId: event.callId,
                            activeCallId: callIdRef.current,
                        },
                    );
                    return;
                }

                if (
                    isCallerRef.current
                ) {
                    console.log(
                        "[WebRTC] Ignoring OFFER because this peer is the caller",
                    );
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

                addLocalTracks(
                    peer,
                    stream,
                );

                console.log(
                    "[WebRTC] Applying remote OFFER",
                    {
                        callId: event.callId,
                        localSenders:
                            peer.getSenders().map(
                                (sender) => ({
                                    kind:
                                        sender.track?.kind ??
                                        null,
                                    trackId:
                                        sender.track?.id ??
                                        null,
                                    readyState:
                                        sender.track?.readyState ??
                                        null,
                                }),
                            ),
                    },
                );

                await peer.setRemoteDescription(
                    {
                        type: "offer",
                        sdp: event.sdp,
                    },
                );

                console.log(
                    "[WebRTC] Remote OFFER applied",
                    {
                        callId: event.callId,
                        signalingState:
                            peer.signalingState,
                        remoteDescriptionType:
                            peer.remoteDescription?.type ??
                            null,
                    },
                );

                await addPendingIceCandidates(
                    peer,
                );

                const answer =
                    await peer.createAnswer();

                await peer.setLocalDescription(
                    answer,
                );

                console.log(
                    "[WebRTC] Local ANSWER created",
                    {
                        callId: event.callId,
                        signalingState:
                            peer.signalingState,
                        sdpLength:
                            peer.localDescription?.sdp
                                ?.length ?? 0,
                        localSenders:
                            peer.getSenders().map(
                                (sender) => ({
                                    kind:
                                        sender.track?.kind ??
                                        null,
                                    trackId:
                                        sender.track?.id ??
                                        null,
                                    readyState:
                                        sender.track?.readyState ??
                                        null,
                                }),
                            ),
                    },
                );

                const description =
                    peer.localDescription;

                if (!description?.sdp) {
                    throw new Error(
                        "WebRTC answer is unavailable.",
                    );
                }

                console.log(
                    "[WebRTC] Sending ANSWER",
                    {
                        callId: event.callId,
                        sdpLength: description.sdp.length,
                    },
                );

                await sendSignalingEvent({
                    type: "ANSWER",
                    callId:
                        event.callId,
                    sdp: description.sdp,
                });

                console.log(
                    "[WebRTC] ANSWER sent",
                    {
                        callId: event.callId,
                    },
                );

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
                console.log("[WebRTC] ANSWER received", {
                    eventCallId: event.callId,
                    activeCallId: callIdRef.current,
                    sdpLength: event.sdp.length,
                    isCaller: isCallerRef.current,
                });

                if (
                    event.callId !==
                        callIdRef.current ||
                    !isCallerRef.current
                ) {
                    console.warn(
                        "[WebRTC] Ignoring ANSWER",
                        {
                            eventCallId:
                                event.callId,
                            activeCallId:
                                callIdRef.current,
                            isCaller:
                                isCallerRef.current,
                        },
                    );
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

                console.log(
                    "[WebRTC] Remote ANSWER applied",
                    {
                        callId: event.callId,
                        signalingState:
                            peer.signalingState,
                        connectionState:
                            peer.connectionState,
                    },
                );

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
     * Subscribe to WebRTC signaling and
     * remote media state.
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
     * Retry local ICE and renegotiate after
     * the shared realtime socket reconnects.
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
                     * Re-send current media state
                     * after reconnect.
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
     * Process an offer that arrived before
     * ACCEPTED was applied locally.
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

        pendingOfferRef.current =
            null;

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
     * Callee prepares microphone/camera
     * immediately after accepting.
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

        console.log(
            "[WebRTC] Receiver media preparation effect started",
            {
                callId,
                callType,
                enabled,
                isCaller,
            },
        );

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

                addLocalTracks(
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
     * Caller prepares local media and creates the peer connection.
     *
     * Voice calls negotiate immediately.
     * Video calls stop after the local sender is prepared; the
     * CallMediaSession coordinator installs the avatar track and
     * explicitly calls startInitialOffer().
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

        console.log(
            "[WebRTC] Caller preparation effect started",
            {
                callId,
                callType,
                initialVideoSource,
                enabled,
                isCaller,
            },
        );

        if (negotiationStartedRef.current) {
            return;
        }

        let cancelled = false;

        async function prepareCaller() {
            try {
                const stream =
                    await ensureLocalMedia();

                if (cancelled) {
                    return;
                }

                await loadIceConfig();

                if (cancelled) {
                    return;
                }

                const peer =
                    createPeerConnection();

                addLocalTracks(
                    peer,
                    stream,
                );

                if (cancelled) {
                    return;
                }

                if (callType === "video" &&
                    initialVideoSourceRef.current === "avatar") {
                    console.log(
                        "[WebRTC] Caller prepared camera sender; waiting for avatar media layer before OFFER",
                        {
                            callId: callIdRef.current,
                            cameraTrackId:
                                videoSenderRef.current
                                    ?.track?.id ?? null,
                            cameraTrackReadyState:
                                videoSenderRef.current
                                    ?.track?.readyState ?? null,
                            initialVideoSource:
                                initialVideoSourceRef.current,
                        },
                    );

                    setConnectionState(
                        "connecting",
                    );

                    void sendMediaState(
                        !isMutedRef.current,
                        isCameraEnabledRef.current,
                    );

                    return;
                }

                void sendMediaState(
                    !isMutedRef.current,
                    isCameraEnabledRef.current,
                );

                await createOffer(peer);
            } catch (error) {
                if (!cancelled) {
                    reportFailure(error);
                }
            }
        }

        void prepareCaller();

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

        /*
         * Generic WebRTC media replacement
         * capability.
         *
         * Avatar media consumes this without
         * WebRTC knowing anything about avatars.
         */
        replaceVideoTrack,
        isVideoSenderReady,
        startInitialOffer,

        cleanup,
    };
}