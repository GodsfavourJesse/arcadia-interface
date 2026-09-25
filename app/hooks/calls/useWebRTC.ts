"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import type {
    RealtimeEvent,
} from "@/app/types/calls/realtime.types";

type UseWebRTCActions = {
    participantId: string | null;
    role: "host" | "guest";
    localStream: MediaStream | null;

    sendSignal: (
        message:
            | {
                  type: "OFFER";
                  targetParticipantId: string;
                  data: RTCSessionDescriptionInit;
              }
            | {
                  type: "ANSWER";
                  targetParticipantId: string;
                  data: RTCSessionDescriptionInit;
              }
            | {
                  type: "ICE_CANDIDATE";
                  targetParticipantId: string;
                  data: RTCIceCandidateInit;
              },
    ) => boolean;

    lastSignal: Extract<
        RealtimeEvent,
        {
            type:
                | "OFFER"
                | "ANSWER"
                | "ICE_CANDIDATE";
        }
    > | null;

    lastRoomJoined: Extract<
        RealtimeEvent,
        {
            type: "ROOM_JOINED";
        }
    > | null;
};

export function useWebRTC({
    participantId,
    role,
    localStream,
    sendSignal,
    lastSignal,
    lastRoomJoined,
}: UseWebRTCActions) {
    const peerRef =
        useRef<RTCPeerConnection | null>(
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

    const negotiatedParticipantRef =
        useRef<string | null>(null);

    const [
        remoteStream,
        setRemoteStream,
    ] = useState<MediaStream | null>(
        null,
    );

    const [
        connectionState,
        setConnectionState,
    ] = useState<
        RTCPeerConnectionState
    >("new");

    const createPeerConnection =
        useCallback(
            (
                remoteParticipantId: string,
            ) => {
                if (
                    peerRef.current
                ) {
                    return peerRef.current;
                }

                const peer =
                    new RTCPeerConnection(
                        {
                            iceServers: [
                                {
                                    urls:
                                        "stun:stun.l.google.com:19302",
                                },
                            ],
                        },
                    );

                peer.onconnectionstatechange =
                    () => {
                        setConnectionState(
                            peer.connectionState,
                        );
                    };

                peer.ontrack = (
                    event,
                ) => {
                    const stream =
                        event.streams[0];

                    if (!stream) {
                        return;
                    }

                    remoteStreamRef.current =
                        stream;

                    setRemoteStream(
                        stream,
                    );
                };

                peer.onicecandidate =
                    (event) => {
                        if (
                            !event.candidate
                        ) {
                            return;
                        }

                        sendSignal({
                            type:
                                "ICE_CANDIDATE",
                            targetParticipantId:
                                remoteParticipantId,
                            data:
                                event.candidate
                                    .toJSON(),
                        });
                    };

                if (
                    localStream
                ) {
                    localStream
                        .getTracks()
                        .forEach(
                            (
                                track,
                            ) => {
                                peer.addTrack(
                                    track,
                                    localStream,
                                );
                            },
                        );
                }

                peerRef.current =
                    peer;

                negotiatedParticipantRef.current =
                    remoteParticipantId;

                return peer;
            },
            [
                localStream,
                sendSignal,
            ],
        );

    useEffect(() => {
        if (
            role !== "host" ||
            !participantId ||
            !lastRoomJoined
        ) {
            return;
        }

        const guestId =
            lastRoomJoined
                .participant
                .participantId;

        if (
            guestId ===
            participantId
        ) {
            return;
        }

        if (
            negotiatedParticipantRef.current ===
            guestId
        ) {
            return;
        }

        let cancelled = false;

        async function createOffer() {
            try {
                const peer =
                    createPeerConnection(
                        guestId,
                    );

                if (
                    cancelled
                ) {
                    return;
                }

                const offer =
                    await peer.createOffer();

                await peer.setLocalDescription(
                    offer,
                );

                if (
                    cancelled
                ) {
                    return;
                }

                sendSignal({
                    type: "OFFER",
                    targetParticipantId:
                        guestId,
                    data: offer,
                });
            } catch (
                error
            ) {
                console.error(
                    "Failed to create WebRTC offer:",
                    error,
                );
            }
        }

        void createOffer();

        return () => {
            cancelled = true;
        };
    }, [
        createPeerConnection,
        lastRoomJoined,
        participantId,
        role,
        sendSignal,
    ]);

    useEffect(() => {
        if (
            role !== "guest" ||
            !participantId ||
            !lastSignal ||
            lastSignal.type !==
                "OFFER"
        ) {
            return;
        }

        const offerSignal =
            lastSignal;

        if (
            offerSignal.fromParticipantId ===
            participantId
        ) {
            return;
        }

        let cancelled = false;

        async function handleOffer() {
            try {
                const hostId =
                    offerSignal.fromParticipantId;

                const peer =
                    createPeerConnection(
                        hostId,
                    );

                await peer.setRemoteDescription(
                    offerSignal.data,
                );

                if (
                    cancelled
                ) {
                    return;
                }

                for (
                    const candidate of
                    pendingIceCandidatesRef.current
                ) {
                    await peer.addIceCandidate(
                        candidate,
                    );
                }

                pendingIceCandidatesRef.current =
                    [];

                const answer =
                    await peer.createAnswer();

                await peer.setLocalDescription(
                    answer,
                );

                if (
                    cancelled
                ) {
                    return;
                }

                sendSignal({
                    type: "ANSWER",
                    targetParticipantId:
                        hostId,
                    data: answer,
                });
            } catch (
                error
            ) {
                console.error(
                    "Failed to handle WebRTC offer:",
                    error,
                );
            }
        }

        void handleOffer();

        return () => {
            cancelled = true;
        };
    }, [
        createPeerConnection,
        lastSignal,
        participantId,
        role,
        sendSignal,
    ]);

    useEffect(() => {
        if (
            role !== "host" ||
            !lastSignal ||
            lastSignal.type !==
                "ANSWER"
        ) {
            return;
        }

        const answerSignal =
            lastSignal;

        let cancelled = false;

        async function handleAnswer() {
            try {
                const peer =
                    peerRef.current;

                if (!peer) {
                    return;
                }

                if (
                    peer.signalingState !==
                    "have-local-offer"
                ) {
                    return;
                }

                await peer.setRemoteDescription(
                    answerSignal.data,
                );

                if (
                    cancelled
                ) {
                    return;
                }

                for (
                    const candidate of
                    pendingIceCandidatesRef.current
                ) {
                    await peer.addIceCandidate(
                        candidate,
                    );
                }

                pendingIceCandidatesRef.current =
                    [];
            } catch (
                error
            ) {
                console.error(
                    "Failed to handle WebRTC answer:",
                    error,
                );
            }
        }

        void handleAnswer();

        return () => {
            cancelled = true;
        };
    }, [
        lastSignal,
        role,
    ]);

    useEffect(() => {
        if (
            !lastSignal ||
            lastSignal.type !==
                "ICE_CANDIDATE"
        ) {
            return;
        }

        const candidateSignal =
            lastSignal;

        const candidate =
            candidateSignal.data;

        const peer =
            peerRef.current;

        if (
            !peer ||
            peer.remoteDescription ===
                null
        ) {
            pendingIceCandidatesRef.current.push(
                candidate,
            );

            return;
        }

        void peer
            .addIceCandidate(
                candidate,
            )
            .catch(
                (error) => {
                    console.error(
                        "Failed to add ICE candidate:",
                        error,
                    );
                },
            );
    }, [
        lastSignal,
    ]);

    useEffect(() => {
        const peer =
            peerRef.current;

        if (
            !peer ||
            !localStream
        ) {
            return;
        }

        const existingTrackIds =
            new Set(
                peer
                    .getSenders()
                    .map(
                        (
                            sender,
                        ) =>
                            sender
                                .track
                                ?.id,
                    )
                    .filter(
                        (
                            id,
                        ): id is string =>
                            Boolean(
                                id,
                            ),
                    ),
            );

        localStream
            .getTracks()
            .forEach(
                (
                    track,
                ) => {
                    if (
                        existingTrackIds.has(
                            track.id,
                        )
                    ) {
                        return;
                    }

                    peer.addTrack(
                        track,
                        localStream,
                    );
                },
            );
    }, [
        localStream,
    ]);

    useEffect(() => {
        return () => {
            peerRef.current?.close();
            peerRef.current =
                null;

            remoteStreamRef.current =
                null;

            pendingIceCandidatesRef.current =
                [];
        };
    }, []);

    return {
        remoteStream,
        connectionState,
        peerRef,
    };
}