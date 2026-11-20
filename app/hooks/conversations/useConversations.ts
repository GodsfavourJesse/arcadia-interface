"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    createDirectConversation,
    getConversations,
} from "@/app/services/conversation/conversations.service";

import type {
    ConversationSummary,
} from "@/app/types/conversations/conversations.types";

import {
    useConversationsRealtime,
} from "./useConversationsRealtime";
import { useAuth } from "@/app/hooks/auth/useAuth";
import { toast } from "sonner";

export function useConversations() {
    const { user } = useAuth();
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
            (message: import("@/app/types/conversations/conversations.types").Message) => {
                void loadConversations();
                if (message.senderId !== user?.id) toast("New message", { id: `message-${message.id}`, description: message.sender.displayName, action: { label: "Open chat", onClick: () => { window.location.href = `/dashboard/conversations/${message.conversationId}`; } } });
            },
            [loadConversations, user?.id],
        );

    const handleMessagesRead = useCallback(() => { void loadConversations(); }, [loadConversations]);
    const handleMessageUpdated = useCallback(() => { void loadConversations(); }, [loadConversations]);

    useConversationsRealtime({
        conversationIds:
            conversations.map(
                (conversation) =>
                    conversation.id,
            ),
        onMessageNew:
            handleNewMessage,
        onMessageRead: handleMessagesRead,
        onMessageUpdated: handleMessageUpdated,
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
