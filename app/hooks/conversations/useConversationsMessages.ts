"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    getConversationMessages,
    markConversationAsRead,
    sendConversationMessage,
} from "@/app/services/conversation/conversations.service";

import type {
    Message,
} from "@/app/types/conversations/conversations.types";

import {
    useConversationsRealtime,
} from "./useConversationsRealtime";

/*
 * How often to re-fetch recent messages over REST
 * while the realtime socket is NOT connected. This
 * is a safety net only — the socket is the primary,
 * instant delivery path. If your socket connects
 * reliably in your environment (check the console
 * for "[Conversations WS] Connected" /
 * "[Conversations WS] Subscribed: <id>"), this
 * fallback will rarely if ever run.
 */
const DISCONNECTED_POLL_INTERVAL_MS = 4000;

/*
 * Slow "just in case" refresh even while the socket
 * reports itself open, in case a message slips through
 * (e.g. a missed broadcast). Cheap and infrequent.
 */
const CONNECTED_POLL_INTERVAL_MS = 20000;

export function useConversationMessages(
    conversationId: string | undefined,
) {
    const [
        messages,
        setMessages,
    ] = useState<Message[]>([]);

    const isSocketOpenRef =
        useRef(false);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        isSending,
        setIsSending,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState<string | null>(null);

    /*
     * Add a message while keeping the
     * newest-first ordering.
     */
    const addMessage =
        useCallback(
            (message: Message) => {
                if (
                    !conversationId ||
                    message.conversationId !==
                        conversationId
                ) {
                    return;
                }

                setMessages(
                    (current) => {
                        const existingIndex =
                            current.findIndex(
                                (
                                    existing,
                                ) =>
                                    existing.id ===
                                    message.id,
                            );

                        /*
                         * If the message already exists,
                         * replace it with the latest server
                         * representation. This is useful for
                         * readAt changes.
                         */
                        if (
                            existingIndex !==
                            -1
                        ) {
                            const updated =
                                [...current];

                            updated[
                                existingIndex
                            ] = message;

                            return updated;
                        }

                        /*
                         * API/WebSocket ordering:
                         *
                         * newest -> oldest
                         */
                        return [
                            message,
                            ...current,
                        ];
                    },
                );
            },
            [conversationId],
        );

    /*
     * Merge server history without destroying
     * a realtime message that may have arrived
     * while the history request was in flight.
     */
    const mergeMessages =
        useCallback(
            (
                serverMessages: Message[],
            ) => {
                setMessages(
                    (current) => {
                        const byId =
                            new Map<
                                string,
                                Message
                            >();

                        /*
                         * Server state wins.
                         */
                        for (const message of
                            serverMessages) {
                            byId.set(
                                message.id,
                                message,
                            );
                        }

                        /*
                         * Preserve realtime messages
                         * that arrived during loading.
                         */
                        for (const message of current) {
                            if (
                                message.conversationId !==
                                conversationId
                            ) {
                                continue;
                            }

                            if (
                                !byId.has(
                                    message.id,
                                )
                            ) {
                                byId.set(
                                    message.id,
                                    message,
                                );
                            }
                        }

                        return [
                            ...byId.values(),
                        ].sort(
                            (
                                a,
                                b,
                            ) =>
                                new Date(
                                    b.createdAt,
                                ).getTime() -
                                new Date(
                                    a.createdAt,
                                ).getTime(),
                        );
                    },
                );
            },
            [conversationId],
        );

    /*
     * Read events are sent by the other
     * participant when they read our messages.
     */
    const handleMessageRead =
        useCallback(
            (event: {
                conversationId: string;
                readerId: string;
                messageIds: string[];
                readAt: string;
            }) => {
                if (
                    event.conversationId !==
                    conversationId
                ) {
                    return;
                }

                const messageIds =
                    new Set(
                        event.messageIds,
                    );

                setMessages(
                    (current) =>
                        current.map(
                            (
                                message,
                            ) =>
                                messageIds.has(
                                    message.id,
                                )
                                    ? {
                                          ...message,
                                          readAt:
                                              event.readAt,
                                      }
                                    : message,
                        ),
                );
            },
            [conversationId],
        );

    /*
     * Realtime connection for this
     * conversation.
     */
    useConversationsRealtime({
        conversationIds:
            conversationId
                ? [conversationId]
                : [],

        /*
         * IMPORTANT:
         *
         * We only ADD the message here. We do NOT
         * mark it as read on arrival — the caller
         * doesn't know yet whether the user is
         * actually looking at the newest message or
         * scrolled up into history. Marking read
         * unconditionally here would make the sender
         * see "Read" before the recipient has even
         * scrolled to see it.
         *
         * Marking as read is handled by `markAsRead`
         * below, which the UI calls only when the
         * user is actually viewing the newest message
         * (see MessageList's `onReachedNewest`).
         */
        onMessageNew:
            (message) => {
                addMessage(message);
            },

        onMessageRead:
            handleMessageRead,

        onConnectionStateChange:
            (state) => {
                isSocketOpenRef.current =
                    state === "open";
            },
    });

    /*
     * Load persisted history.
     */
    const loadMessages =
        useCallback(async () => {
            if (!conversationId) {
                setMessages([]);
                setIsLoading(false);
                setError(null);

                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const response =
                    await getConversationMessages(
                        conversationId,
                    );

                mergeMessages(
                    response.messages,
                );

                /*
                 * Opening a conversation starts the
                 * user pinned to the newest message
                 * (see MessageList's initial-scroll
                 * effect), so it's safe to mark
                 * incoming messages read here.
                 *
                 * The backend will broadcast
                 * MESSAGE_READ to the other
                 * participant.
                 */
                await markConversationAsRead(
                    conversationId,
                );
            } catch (error) {
                setError(
                    error instanceof Error
                        ? error.message
                        : "Unable to load messages.",
                );
            } finally {
                setIsLoading(false);
            }
        }, [
            conversationId,
            mergeMessages,
        ]);

    useEffect(() => {
        void loadMessages();
    }, [loadMessages]);

    /*
     * REST fallback so messages still arrive promptly
     * even if the WebSocket never connects in this
     * environment (wrong URL/port, cookie not reaching
     * the handshake, etc.) — see the console for
     * "[Conversations WS]" logs to find out which.
     *
     * Polls fast while the socket is down, slow (as a
     * cheap sanity check) while it reports itself open.
     * Skips work while the tab isn't visible.
     */
    useEffect(() => {
        if (!conversationId) {
            return;
        }

        let cancelled = false;
        let timeoutId: ReturnType<
            typeof setTimeout
        > | null = null;

        async function poll() {
            if (
                !cancelled &&
                !document.hidden
            ) {
                try {
                    const response =
                        await getConversationMessages(
                            conversationId as string,
                        );

                    if (!cancelled) {
                        mergeMessages(
                            response.messages,
                        );
                    }
                } catch (error) {
                    console.error(
                        "[Conversations] Background poll failed:",
                        error,
                    );
                }
            }

            if (cancelled) {
                return;
            }

            const delay =
                isSocketOpenRef.current
                    ? CONNECTED_POLL_INTERVAL_MS
                    : DISCONNECTED_POLL_INTERVAL_MS;

            timeoutId = setTimeout(
                poll,
                delay,
            );
        }

        timeoutId = setTimeout(
            poll,
            DISCONNECTED_POLL_INTERVAL_MS,
        );

        return () => {
            cancelled = true;

            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }
        };
    }, [conversationId, mergeMessages]);

    /*
     * Mark the conversation's incoming messages
     * as read. The UI should call this only when
     * the user is actually viewing the newest
     * message — not just because a message arrived
     * while this hook happens to be mounted.
     *
     * Safe to call repeatedly: the backend only
     * updates messages that are still unread.
     */
    const markAsRead =
        useCallback(async () => {
            if (!conversationId) {
                return;
            }

            try {
                await markConversationAsRead(
                    conversationId,
                );
            } catch (error) {
                console.error(
                    "Unable to mark conversation as read:",
                    error,
                );
            }
        }, [conversationId]);

    /*
     * Send through REST.
     *
     * REST is the source of truth for the
     * sender's own message.
     *
     * The backend broadcasts MESSAGE_NEW
     * to the other participant.
     */
    const sendMessage =
        useCallback(
            async (body: string) => {
                const trimmed =
                    body.trim();

                if (!trimmed) {
                    return;
                }

                if (!conversationId) {
                    const message =
                        "Conversation ID is missing.";

                    setError(message);

                    throw new Error(
                        message,
                    );
                }

                setIsSending(true);
                setError(null);

                try {
                    const response =
                        await sendConversationMessage(
                            conversationId,
                            trimmed,
                        );

                    /*
                     * Immediately render the sender's
                     * own message.
                     */
                    addMessage(
                        response.message,
                    );

                    return response.message;
                } catch (error) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "Unable to send message.",
                    );

                    throw error;
                } finally {
                    setIsSending(false);
                }
            },
            [
                conversationId,
                addMessage,
            ],
        );

    return {
        messages,
        isLoading,
        isSending,
        error,
        reload: loadMessages,
        sendMessage,
        markAsRead,
    };
}