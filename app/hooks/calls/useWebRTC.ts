"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

type UseWebRTCActions = {
    roomId: string;
    participantId: string;
    role: "host" | "guest";
    localStream: MediaStream | null;
    socket: WebSocket | null;
};

export function useWebRTC({
    roomId,
    participantId,
    role,
    localStream,
    socket,
}: UseWebRTCActions) {
    const peerRef =
        useRef<RTCPeerConnection | null>(
            null,
        );

    const remoteStreamRef =
        useRef<MediaStream | null>(
            null,
        );

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
        useCallback(() => {
            const peer =
                new RTCPeerConnection({
                    iceServers: [
                        {
                            urls:
                                "stun:stun.l.google.com:19302",
                        },
                    ],
                });

            peer.onconnectionstatechange =
                () => {
                    setConnectionState(
                        peer.connectionState,
                    );
                };

            peer.ontrack = (event) => {
                const stream =
                    event.streams[0];

                if (stream) {
                    remoteStreamRef.current =
                        stream;

                    setRemoteStream(
                        stream,
                    );
                }
            };

            peer.onicecandidate =
                (event) => {
                    if (
                        !event.candidate ||
                        !socket ||
                        socket.readyState !==
                            WebSocket.OPEN
                    ) {
                        return;
                    }

                    socket.send(
                        JSON.stringify({
                            type:
                                "ICE_CANDIDATE",
                            roomId,
                            target:
                                "REMOTE_PARTICIPANT",
                            candidate:
                                event.candidate,
                        }),
                    );
                };

            if (localStream) {
                localStream
                    .getTracks()
                    .forEach(
                        (track) => {
                            peer.addTrack(
                                track,
                                localStream,
                            );
                        },
                    );
            }

            peerRef.current =
                peer;

            return peer;
        }, [
            localStream,
            roomId,
            socket,
        ]);

    useEffect(() => {
        return () => {
            peerRef.current?.close();
            peerRef.current = null;
        };
    }, []);

    return {
        remoteStream,
        connectionState,
        peerRef,
        createPeerConnection,
    };
}