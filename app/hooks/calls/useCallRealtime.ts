"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

    return url.toString();
}

export function useCallRealtime(
    roomId: string,
) {
    const socketRef =
        useRef<WebSocket | null>(null);

    const [
        participants,
        setParticipants,
    ] = useState<RealtimeParticipant[]>([]);

    const [connected, setConnected] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

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

        const socket = new WebSocket(
            getWebSocketUrl(),
        );

        socketRef.current = socket;

        socket.onopen = () => {
            setConnected(true);
            setError(null);

            socket.send(
                JSON.stringify({
                    type: "JOIN_ROOM",
                    roomId,
                }),
            );
        };

        socket.onmessage = (event) => {
            try {
                const message =
                    JSON.parse(
                        event.data,
                    ) as RealtimeEvent;

                switch (message.type) {
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
                                        (participant) =>
                                            participant.participantId ===
                                            message
                                                .participant
                                                .participantId,
                                    );

                                if (exists) {
                                    return current;
                                }

                                return [
                                    ...current,
                                    message.participant,
                                ];
                            },
                        );
                        break;

                    case "ROOM_LEFT":
                        setParticipants(
                            (current) =>
                                current.filter(
                                    (participant) =>
                                        participant.participantId !==
                                        message
                                            .participant
                                            .participantId,
                                ),
                        );
                        break;
                }
            } catch {
                console.error(
                    "Invalid realtime message",
                );
            }
        };

        socket.onerror = () => {
            setError(
                "Realtime connection failed.",
            );
        };

        socket.onclose = () => {
            setConnected(false);
            socketRef.current = null;
        };
    }, [roomId]);

    const disconnect = useCallback(() => {
        const socket =
            socketRef.current;

        if (!socket) {
            return;
        }

        socket.close();

        socketRef.current = null;
        setConnected(false);
    }, []);

    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        participants,
        connected,
        error,
        connect,
        disconnect,
    };
}