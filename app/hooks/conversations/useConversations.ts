"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    createDirectConversation,
    getConversations,
} from "@/app/services/conversations.service";

import type {
    ConversationSummary,
} from "@/app/types/conversations/conversations.types";

import {
    useConversationsRealtime,
} from "./useConversationsRealtime";

export function useConversations() {
    const [
        conversations,
        setConversations,
    ] = useState<ConversationSummary[]>(
        [],
    );

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState<string | null>(
        null,
    );

    const loadConversations =
        useCallback(async () => {
            setError(null);

            try {
                const response =
                    await getConversations();

                setConversations(
                    response.conversations,
                );
            } catch (error) {
                setError(
                    error instanceof Error
                        ? error.message
                        : "Unable to load conversations.",
                );
            } finally {
                setIsLoading(false);
            }
        }, []);

    useEffect(() => {
        void loadConversations();
    }, [loadConversations]);

    const handleNewMessage =
        useCallback(
            () => {
                void loadConversations();
            },
            [loadConversations],
        );

    useConversationsRealtime({
        conversationIds:
            conversations.map(
                (conversation) =>
                    conversation.id,
            ),
        onMessageNew:
            handleNewMessage,
    });

    const startConversation =
        useCallback(
            async (userId: string) => {
                const response =
                    await createDirectConversation(
                        userId,
                    );

                await loadConversations();

                return response.conversation;
            },
            [loadConversations],
        );

    return {
        conversations,
        isLoading,
        error,
        reload: loadConversations,
        startConversation,
    };
}