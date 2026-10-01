"use client";

import { useEffect, useRef } from "react";

import { realtimeClient } from "@/app/lib/realtime/realtime.client";

import type {
    Message,
} from "@/app/types/conversations/conversations.types";

import type {
    RealtimeServerEvent,
} from "@/app/types/realtime/realtime.types";

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

    onConnectionStateChange?: (
        state: "connecting" | "open" | "closed",
    ) => void;
};

export function useConversationsRealtime({
    conversationIds,
    onMessageNew,
    onMessageRead,
    onConnectionStateChange,
}: UseConversationsRealtimeOptions) {
    const conversationIdsRef =
        useRef(conversationIds);

    const onMessageNewRef =
        useRef(onMessageNew);

    const onMessageReadRef =
        useRef(onMessageRead);

    const onConnectionStateChangeRef =
        useRef(onConnectionStateChange);

    const subscribedIdsRef =
        useRef<Set<string>>(new Set());

    const pendingIdsRef =
        useRef<Set<string>>(new Set());

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
        const subscribeCurrent =
            () => {
                if (
                    realtimeClient.connectionState !==
                    "open"
                ) {
                    return;
                }

                const requested =
                    new Set(
                        conversationIdsRef.current,
                    );

                for (const conversationId of requested) {
                    if (
                        subscribedIdsRef.current.has(
                            conversationId,
                        ) ||
                        pendingIdsRef.current.has(
                            conversationId,
                        )
                    ) {
                        continue;
                    }

                    const sent =
                        realtimeClient.send({
                            type:
                                "SUBSCRIBE_CONVERSATION",
                            conversationId,
                        });

                    if (sent) {
                        pendingIdsRef.current.add(
                            conversationId,
                        );
                    }
                }

                for (const conversationId of [
                    ...subscribedIdsRef.current,
                ]) {
                    if (
                        requested.has(
                            conversationId,
                        )
                    ) {
                        continue;
                    }

                    realtimeClient.send({
                        type:
                            "UNSUBSCRIBE_CONVERSATION",
                        conversationId,
                    });

                    subscribedIdsRef.current.delete(
                        conversationId,
                    );
                }
            };

        const unsubscribe =
            realtimeClient.subscribe(
                (event: RealtimeServerEvent) => {
                    switch (event.type) {
                        case "CONNECTED":
                            subscribedIdsRef.current.clear();
                            pendingIdsRef.current.clear();

                            subscribeCurrent();

                            break;

                        case "SUBSCRIBED":
                            pendingIdsRef.current.delete(
                                event.conversationId,
                            );

                            subscribedIdsRef.current.add(
                                event.conversationId,
                            );

                            break;

                        case "UNSUBSCRIBED":
                            subscribedIdsRef.current.delete(
                                event.conversationId,
                            );

                            pendingIdsRef.current.delete(
                                event.conversationId,
                            );

                            break;

                        case "MESSAGE_NEW":
                            onMessageNewRef.current?.(
                                event.message as Message,
                            );

                            break;

                        case "MESSAGE_READ":
                            onMessageReadRef.current?.(
                                event,
                            );

                            break;

                        case "ERROR":
                            console.error(
                                "[Conversations Realtime] Server error:",
                                event.code,
                                event.message,
                            );

                            pendingIdsRef.current.clear();

                            break;

                        default:
                            /*
                             * Calls, WebRTC, presence, etc.
                             * are handled by their own listeners.
                             */
                            break;
                    }
                },
            );

        realtimeClient.connect();

        const state =
            realtimeClient.connectionState;

        if (state === "connecting") {
            onConnectionStateChangeRef.current?.(
                "connecting",
            );
        } else if (state === "open") {
            onConnectionStateChangeRef.current?.(
                "open",
            );

            subscribeCurrent();
        } else if (state === "closed") {
            onConnectionStateChangeRef.current?.(
                "closed",
            );
        }

        return () => {
            unsubscribe();

            if (
                realtimeClient.connectionState ===
                "open"
            ) {
                for (const conversationId of [
                    ...subscribedIdsRef.current,
                ]) {
                    realtimeClient.send({
                        type:
                            "UNSUBSCRIBE_CONVERSATION",
                        conversationId,
                    });
                }
            }

            subscribedIdsRef.current.clear();
            pendingIdsRef.current.clear();

            /*
             * IMPORTANT:
             *
             * Never disconnect the shared realtime client here.
             *
             * Calls and conversations use the same /ws.
             */
        };
    }, [conversationIdsKey]);
}