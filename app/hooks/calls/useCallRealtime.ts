"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import type {
    RealtimeEvent,
    RealtimeParticipant,
} from "@/app/types/calls/realtime.types";

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000";

function getWebSocketUrl() {
    const url = new URL(API_URL);

    url.protocol =
        url.protocol === "https:"
            ? "wss:"
            : "ws:";

    url.pathname = "/ws";
    url.search = "";

    return url.toString();
}

type UseCallRealtimeOptions = {
    participantId?: string;
    guestToken?: string;
};

type RealtimeSignal = Extract<
    RealtimeEvent,
    {
        type:
            | "OFFER"
            | "ANSWER"
            | "ICE_CANDIDATE";
    }
>;

type RealtimeRoomJoined = Extract<
    RealtimeEvent,
    {
        type: "ROOM_JOINED";
    }
>;

export function useCallRealtime(
    roomId: string,
    options: UseCallRealtimeOptions = {},
) {
    const socketRef =
        useRef<WebSocket | null>(null);

    const manualDisconnectRef =
        useRef(false);

    const [
        participant,
        setParticipant,
    ] =
        useState<RealtimeParticipant | null>(
            null,
        );

    const [
        participants,
        setParticipants,
    ] = useState<RealtimeParticipant[]>(
        [],
    );

    const [
        connected,
        setConnected,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState<string | null>(null);

    const [
        lastSignal,
        setLastSignal,
    ] =
        useState<RealtimeSignal | null>(
            null,
        );

    const [
        lastRoomJoined,
        setLastRoomJoined,
    ] =
        useState<RealtimeRoomJoined | null>(
            null,
        );

    const sendSignal = useCallback(
        (
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
        ) => {
            const socket =
                socketRef.current;

            if (
                !socket ||
                socket.readyState !==
                    WebSocket.OPEN
            ) {
                return false;
            }

            socket.send(
                JSON.stringify(message),
            );

            return true;
        },
        [],
    );

    const connect = useCallback(() => {
        if (!roomId) {
            return;
        }

        if (
            socketRef.current?.readyState ===
            WebSocket.OPEN
        ) {
            return;
        }

        manualDisconnectRef.current =
            false;

        setError(null);

        const socket =
            new WebSocket(
                getWebSocketUrl(),
            );

        socketRef.current =
            socket;

        socket.onopen = () => {
            const isGuest =
                Boolean(
                    options.participantId &&
                        options.guestToken,
                );

            socket.send(
                JSON.stringify({
                    type: "JOIN_ROOM",
                    roomId,

                    ...(isGuest
                        ? {
                              participantId:
                                  options.participantId,
                              guestToken:
                                  options.guestToken,
                          }
                        : {}),
                }),
            );
        };

        socket.onmessage = (
            event,
        ) => {
            try {
                const message =
                    JSON.parse(
                        event.data,
                    ) as RealtimeEvent;

                switch (
                    message.type
                ) {
                    case "CONNECTED":
                        setParticipant(
                            message.participant,
                        );

                        setConnected(
                            true,
                        );

                        setError(null);

                        break;

                    case "ROOM_PRESENCE":
                        setParticipants(
                            message.participants,
                        );

                        break;

                    case "ROOM_JOINED":
                        setParticipants(
                            (current) => {
                                const exists =
                                    current.some(
                                        (
                                            currentParticipant,
                                        ) =>
                                            currentParticipant.participantId ===
                                            message
                                                .participant
                                                .participantId,
                                    );

                                if (
                                    exists
                                ) {
                                    return current;
                                }

                                return [
                                    ...current,
                                    message.participant,
                                ];
                            },
                        );

                        setLastRoomJoined(
                            message,
                        );

                        break;

                    case "ROOM_LEFT":
                        setParticipants(
                            (current) =>
                                current.filter(
                                    (
                                        currentParticipant,
                                    ) =>
                                        currentParticipant.participantId !==
                                        message
                                            .participant
                                            .participantId,
                                ),
                        );

                        break;

                    case "OFFER":
                    case "ANSWER":
                    case "ICE_CANDIDATE":
                        setLastSignal(
                            message,
                        );

                        break;

                    case "AUTH_ERROR":
                        manualDisconnectRef.current =
                            true;

                        setConnected(
                            false,
                        );

                        setError(
                            message.message,
                        );

                        socket.close(
                            1008,
                            "Authentication failed",
                        );

                        break;

                    case "ERROR":
                        setError(
                            message.message,
                        );

                        break;

                    case "CALL_ENDED":
                        setConnected(
                            false,
                        );

                        break;
                }
            } catch {
                setError(
                    "Invalid realtime message.",
                );
            }
        };

        socket.onerror = () => {
            setConnected(
                false,
            );

            setError(
                "Realtime connection failed.",
            );
        };

        socket.onclose = () => {
            setConnected(
                false,
            );

            if (
                socketRef.current ===
                socket
            ) {
                socketRef.current =
                    null;
            }
        };
    }, [
        roomId,
        options.participantId,
        options.guestToken,
    ]);

    const disconnect =
        useCallback(() => {
            manualDisconnectRef.current =
                true;

            const socket =
                socketRef.current;

            if (!socket) {
                setConnected(
                    false,
                );

                return;
            }

            if (
                socket.readyState ===
                WebSocket.OPEN
            ) {
                socket.send(
                    JSON.stringify({
                        type: "LEAVE_ROOM",
                    }),
                );
            }

            socket.close();

            socketRef.current =
                null;

            setConnected(
                false,
            );
        }, []);

    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [
        connect,
        disconnect,
    ]);

    return {
        participant,
        participants,
        connected,
        error,
        lastSignal,
        lastRoomJoined,
        sendSignal,
        connect,
        disconnect,
    };
}