"use client";

import { useEffect, useRef } from "react";

import type {
    Message,
} from "@/app/types/conversations/conversations.types";

type ConversationRealtimeEvent =
    | {
          type: "CONNECTED";
          userId: string;
      }
    | {
          type: "SUBSCRIBED";
          conversationId: string;
      }
    | {
          type: "UNSUBSCRIBED";
          conversationId: string;
      }
    | {
          type: "MESSAGE_NEW";
          message: Message;
      }
    | {
          type: "MESSAGE_READ";
          conversationId: string;
          readerId: string;
          messageIds: string[];
          readAt: string;
      }
    | {
          type: "ERROR";
          code: string;
          message: string;
      };

type UseConversationsRealtimeOptions = {
    conversationIds: string[];

    onMessageNew?: (
        message: Message,
    ) => void;

    onMessageRead?: (event: {
        conversationId: string;
        readerId: string;
        messageIds: string[];
        readAt: string;
    }) => void;

    /*
     * Fired whenever the socket's connection state
     * changes. Useful for a UI indicator ("Reconnecting...")
     * and lets callers decide whether to lean on a REST
     * fallback while the socket is down.
     */
    onConnectionStateChange?: (
        state: "connecting" | "open" | "closed",
    ) => void;
};

function getWebSocketUrl() {
    const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ??
        "http://localhost:4000";

    const normalizedApiUrl =
        apiUrl.trim().replace(/\/+$/, "");

    const websocketUrl =
        normalizedApiUrl
            .replace(
                /^https:\/\//,
                "wss://",
            )
            .replace(
                /^http:\/\//,
                "ws://",
            );

    return `${websocketUrl}/conversations/ws`;
}

export function useConversationsRealtime({
    conversationIds,
    onMessageNew,
    onMessageRead,
    onConnectionStateChange,
}: UseConversationsRealtimeOptions) {
    const socketRef =
        useRef<WebSocket | null>(null);

    const conversationIdsRef =
        useRef<string[]>(conversationIds);

    const onMessageNewRef =
        useRef(onMessageNew);

    const onMessageReadRef =
        useRef(onMessageRead);

    const onConnectionStateChangeRef =
        useRef(onConnectionStateChange);

    /*
     * Conversations confirmed by the server.
     */
    const subscribedIdsRef =
        useRef<Set<string>>(
            new Set(),
        );

    /*
     * Conversations for which we have sent
     * a subscription request but have not
     * received SUBSCRIBED yet.
     */
    const pendingSubscriptionIdsRef =
        useRef<Set<string>>(
            new Set(),
        );

    const reconnectTimerRef =
        useRef<ReturnType<
            typeof setTimeout
        > | null>(null);

    const stoppedRef =
        useRef(false);

    const conversationIdsKey =
        [...conversationIds]
            .sort()
            .join(",");

    useEffect(() => {
        conversationIdsRef.current =
            conversationIds;
    }, [conversationIds]);

    useEffect(() => {
        onMessageNewRef.current =
            onMessageNew;
    }, [onMessageNew]);

    useEffect(() => {
        onMessageReadRef.current =
            onMessageRead;
    }, [onMessageRead]);

    useEffect(() => {
        onConnectionStateChangeRef.current =
            onConnectionStateChange;
    }, [onConnectionStateChange]);

    useEffect(() => {
        const socket =
            socketRef.current;

        if (
            !socket ||
            socket.readyState !==
                WebSocket.OPEN
        ) {
            return;
        }

        const requestedIds =
            new Set(conversationIds);

        /*
         * Subscribe to newly requested
         * conversations.
         */
        for (const conversationId of requestedIds) {
            if (
                subscribedIdsRef.current.has(
                    conversationId,
                )
            ) {
                continue;
            }

            if (
                pendingSubscriptionIdsRef.current.has(
                    conversationId,
                )
            ) {
                continue;
            }

            socket.send(
                JSON.stringify({
                    type:
                        "SUBSCRIBE_CONVERSATION",
                    conversationId,
                }),
            );

            pendingSubscriptionIdsRef.current.add(
                conversationId,
            );

            console.log(
                "[Conversations WS] Subscribe requested:",
                conversationId,
            );
        }

        /*
         * Remove subscriptions that are no
         * longer required.
         */
        for (const conversationId of [
            ...subscribedIdsRef.current,
        ]) {
            if (
                requestedIds.has(
                    conversationId,
                )
            ) {
                continue;
            }

            socket.send(
                JSON.stringify({
                    type:
                        "UNSUBSCRIBE_CONVERSATION",
                    conversationId,
                }),
            );

            subscribedIdsRef.current.delete(
                conversationId,
            );

            pendingSubscriptionIdsRef.current.delete(
                conversationId,
            );
        }

        /*
         * Also remove pending subscriptions
         * that are no longer requested.
         */
        for (const conversationId of [
            ...pendingSubscriptionIdsRef.current,
        ]) {
            if (
                requestedIds.has(
                    conversationId,
                )
            ) {
                continue;
            }

            pendingSubscriptionIdsRef.current.delete(
                conversationId,
            );
        }
    }, [conversationIdsKey]);

    useEffect(() => {
        stoppedRef.current = false;

        function clearReconnectTimer() {
            if (
                reconnectTimerRef.current !==
                null
            ) {
                clearTimeout(
                    reconnectTimerRef.current,
                );

                reconnectTimerRef.current =
                    null;
            }
        }

        function subscribeCurrentConversations() {
            const socket =
                socketRef.current;

            if (
                !socket ||
                socket.readyState !==
                    WebSocket.OPEN
            ) {
                return;
            }

            for (const conversationId of
                conversationIdsRef.current) {
                if (
                    subscribedIdsRef.current.has(
                        conversationId,
                    )
                ) {
                    continue;
                }

                if (
                    pendingSubscriptionIdsRef.current.has(
                        conversationId,
                    )
                ) {
                    continue;
                }

                socket.send(
                    JSON.stringify({
                        type:
                            "SUBSCRIBE_CONVERSATION",
                        conversationId,
                    }),
                );

                pendingSubscriptionIdsRef.current.add(
                    conversationId,
                );

                console.log(
                    "[Conversations WS] Subscribe requested:",
                    conversationId,
                );
            }
        }

        function connect() {
            if (stoppedRef.current) {
                return;
            }

            const existing =
                socketRef.current;

            if (
                existing &&
                (
                    existing.readyState ===
                        WebSocket.OPEN ||
                    existing.readyState ===
                        WebSocket.CONNECTING
                )
            ) {
                return;
            }

            clearReconnectTimer();

            const url =
                getWebSocketUrl();

            onConnectionStateChangeRef.current?.(
                "connecting",
            );

            console.log(
                "[Conversations WS] Connecting:",
                url,
            );

            const socket =
                new WebSocket(url);

            socketRef.current =
                socket;

            socket.onopen = () => {
                if (
                    stoppedRef.current ||
                    socketRef.current !==
                        socket
                ) {
                    return;
                }

                console.log(
                    "[Conversations WS] Connected",
                );

                onConnectionStateChangeRef.current?.(
                    "open",
                );

                subscribedIdsRef.current.clear();
                pendingSubscriptionIdsRef.current.clear();

                subscribeCurrentConversations();
            };

            socket.onmessage = (
                event,
            ) => {
                try {
                    const message =
                        JSON.parse(
                            event.data,
                        ) as ConversationRealtimeEvent;

                    switch (
                        message.type
                    ) {
                        case "CONNECTED":
                            console.log(
                                "[Conversations WS] Authenticated:",
                                message.userId,
                            );
                            break;

                        case "SUBSCRIBED":
                            pendingSubscriptionIdsRef.current.delete(
                                message.conversationId,
                            );

                            subscribedIdsRef.current.add(
                                message.conversationId,
                            );

                            console.log(
                                "[Conversations WS] Subscribed:",
                                message.conversationId,
                            );

                            break;

                        case "UNSUBSCRIBED":
                            subscribedIdsRef.current.delete(
                                message.conversationId,
                            );

                            pendingSubscriptionIdsRef.current.delete(
                                message.conversationId,
                            );

                            console.log(
                                "[Conversations WS] Unsubscribed:",
                                message.conversationId,
                            );

                            break;

                        case "MESSAGE_NEW":
                            console.log(
                                "[Conversations WS] MESSAGE_NEW received:",
                                message.message,
                            );

                            onMessageNewRef.current?.(
                                message.message,
                            );
                            break;

                        case "MESSAGE_READ":
                            onMessageReadRef.current?.(
                                message,
                            );
                            break;

                        case "ERROR":
                            console.error(
                                "[Conversations WS] Server error:",
                                message.code,
                                message.message,
                            );

                            /*
                             * If subscription was rejected,
                             * allow a later retry.
                             */
                            if (
                                message.code ===
                                "CONVERSATION_ACCESS_DENIED"
                            ) {
                                pendingSubscriptionIdsRef.current.clear();
                            }

                            break;
                    }
                } catch (error) {
                    console.error(
                        "[Conversations WS] Invalid server message:",
                        error,
                    );
                }
            };

            /*
             * IMPORTANT: previously this handler was
             * empty ("we keep this quiet"), which meant
             * a failed/refused WebSocket connection
             * (wrong URL, wrong port, TLS mismatch, CORS)
             * produced NO console output at all — making
             * it impossible to tell "not connecting" apart
             * from "connected but not receiving." Surface
             * it; onclose still has the fuller picture.
             */
            socket.onerror = (
                errorEvent,
            ) => {
                console.error(
                    "[Conversations WS] Socket error — check the URL below actually reaches your backend:",
                    getWebSocketUrl(),
                    errorEvent,
                );
            };

            socket.onclose = (
                event,
            ) => {
                console.log(
                    "[Conversations WS] Closed:",
                    {
                        code: event.code,
                        reason: event.reason,
                        clean:
                            event.wasClean,
                    },
                );

                if (
                    socketRef.current ===
                    socket
                ) {
                    socketRef.current =
                        null;
                }

                subscribedIdsRef.current.clear();
                pendingSubscriptionIdsRef.current.clear();

                onConnectionStateChangeRef.current?.(
                    "closed",
                );

                if (stoppedRef.current) {
                    return;
                }

                reconnectTimerRef.current =
                    setTimeout(() => {
                        reconnectTimerRef.current =
                            null;

                        connect();
                    }, 2000);
            };
        }

        connect();

        return () => {
            stoppedRef.current = true;

            clearReconnectTimer();

            const socket =
                socketRef.current;

            socketRef.current = null;

            subscribedIdsRef.current.clear();
            pendingSubscriptionIdsRef.current.clear();

            if (!socket) {
                return;
            }

            if (
                socket.readyState ===
                WebSocket.OPEN
            ) {
                socket.close(
                    1000,
                    "Component unmounted",
                );

                return;
            }

            if (
                socket.readyState ===
                WebSocket.CONNECTING
            ) {
                socket.close();
            }
        };
    }, []);
}