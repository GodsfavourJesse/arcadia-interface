import { apiRequest } from "../lib/client";

import type {
    ConversationResponse,
    ConversationsResponse,
    CreateConversationResponse,
    MarkConversationReadResponse,
    MessagesResponse,
    SendMessageResponse,
} from "@/app/types/conversations/conversations.types";

export async function getConversations() {
    return apiRequest<ConversationsResponse>(
        "/conversations",
        {
            method: "GET",
        },
    );
}

export async function createDirectConversation(
    userId: string,
) {
    return apiRequest<CreateConversationResponse>(
        "/conversations",
        {
            method: "POST",
            body: JSON.stringify({
                userId,
            }),
        },
    );
}

export async function getConversation(
    conversationId: string,
) {
    return apiRequest<ConversationResponse>(
        `/conversations/${conversationId}`,
        {
            method: "GET",
        },
    );
}

export async function getConversationMessages(
    conversationId: string,
    options?: {
        limit?: number;
        before?: string;
    },
) {
    const params = new URLSearchParams();

    if (options?.limit) {
        params.set(
            "limit",
            String(options.limit),
        );
    }

    if (options?.before) {
        params.set(
            "before",
            options.before,
        );
    }

    const query =
        params.toString();

    return apiRequest<MessagesResponse>(
        `/conversations/${conversationId}/messages${
            query ? `?${query}` : ""
        }`,
        {
            method: "GET",
        },
    );
}

export async function sendConversationMessage(
    conversationId: string,
    body: string,
) {
    return apiRequest<SendMessageResponse>(
        `/conversations/${conversationId}/messages`,
        {
            method: "POST",
            body: JSON.stringify({
                body,
            }),
        },
    );
}

export async function markConversationAsRead(
    conversationId: string,
) {
    return apiRequest<MarkConversationReadResponse>(
        `/conversations/${conversationId}/read`,
        {
            method: "POST",
        },
    );
}