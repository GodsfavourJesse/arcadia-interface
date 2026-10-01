"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
    useEffect,
    useState,
} from "react";

import {
    MessageComposer,
} from "@/app/components/conversations/message-composer";

import {
    MessageList,
} from "@/app/components/conversations/message-list";

import {
    useAuth,
} from "@/app/hooks/auth/useAuth";

import {
    useConversationMessages,
} from "@/app/hooks/conversations/useConversationsMessages";

import {
    getConversation,
} from "@/app/services/conversations.service";

import type {
    ConversationDetails,
} from "@/app/types/conversations/conversations.types";
import { CallLauncher } from "@/app/components/calls/call-launcher";

export default function ConversationPage() {
    const params =
        useParams<{
            conversationId?: string;
        }>();

    const conversationId =
        params.conversationId;

    const {
        user,
        isHydrated,
    } = useAuth();

    const [
        conversation,
        setConversation,
    ] =
        useState<ConversationDetails | null>(
            null,
        );

    const [
        isConversationLoading,
        setIsConversationLoading,
    ] = useState(true);

    const [
        conversationError,
        setConversationError,
    ] = useState<string | null>(
        null,
    );

    const {
        messages,
        isLoading: isMessagesLoading,
        isSending,
        error: messagesError,
        sendMessage,
        markAsRead,
    } =
        useConversationMessages(
            conversationId,
        );

    useEffect(() => {
        if (!conversationId) {
            setConversation(null);
            setIsConversationLoading(false);
            setConversationError(
                "Conversation ID is missing.",
            );

            return;
        }

        /*
        * From this point onward, TypeScript knows
        * that conversationId is a string.
        */
        const id = conversationId;

        let cancelled = false;

        async function loadConversation() {
            setIsConversationLoading(true);
            setConversationError(null);

            try {
                const response =
                    await getConversation(id);

                if (cancelled) {
                    return;
                }

                setConversation(
                    response.conversation,
                );
            } catch (error) {
                if (cancelled) {
                    return;
                }

                setConversationError(
                    error instanceof Error
                        ? error.message
                        : "Unable to load conversation.",
                );
            } finally {
                if (!cancelled) {
                    setIsConversationLoading(false);
                }
            }
        }

        void loadConversation();

        return () => {
            cancelled = true;
        };
    }, [conversationId]);

    if (!isHydrated) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
                Loading...
            </div>
        );
    }

    if (!user) {
        return null;
    }

    /*
     * Do not render the conversation UI when
     * there is no valid conversation ID.
     */
    if (!conversationId) {
        return (
            <main className="mx-auto w-full max-w-5xl px-4 py-8">
                <Link
                    href="/dashboard/conversations"
                    className="text-sm font-medium text-slate-500 hover:text-slate-900"
                >
                    ← Conversations
                </Link>

                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Conversation ID is missing.
                </div>
            </main>
        );
    }

    const otherMember =
        conversation?.members.find(
            (member) =>
                member.userId !== user.id,
        );

    return (
        <main className="mx-auto flex h-[calc(100vh-80px)] w-full max-w-5xl flex-col px-4 py-4">
            <div className="mb-4">
                <Link
                    href="/dashboard/conversations"
                    className="text-sm font-medium text-slate-500 hover:text-slate-900"
                >
                    ← Conversations
                </Link>
            </div>

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <header className="flex items-center gap-3 border-b border-slate-200 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-600">
                        {otherMember?.user.displayName
                            ?.charAt(0)
                            .toUpperCase() ?? "?"}
                    </div>

                    <div className="min-w-0 flex-1">
                        {isConversationLoading ? (
                            <p className="text-sm text-slate-500">
                                Loading...
                            </p>
                        ) : (
                            <>
                                <h1 className="truncate font-semibold text-slate-900">
                                    {otherMember
                                        ?.user
                                        .displayName ??
                                        "Conversation"}
                                </h1>

                                {otherMember && (
                                    <p className="text-xs text-slate-400">
                                        @
                                        {
                                            otherMember
                                                .user
                                                .username
                                        }
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    {otherMember && (
                        <div className="flex items-center gap-1">
                            <CallLauncher
                                conversationId={
                                    conversationId
                                }
                                calleeId={
                                    otherMember.userId
                                }
                                type="voice"
                                compact
                                label={`Call ${otherMember.user.displayName}`}
                            />

                            <CallLauncher
                                conversationId={
                                    conversationId
                                }
                                calleeId={
                                    otherMember.userId
                                }
                                type="video"
                                compact
                                label={`Video call ${otherMember.user.displayName}`}
                            />
                        </div>
                    )}
                </header>

                {conversationError && (
                    <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {conversationError}
                    </div>
                )}

                {messagesError && (
                    <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {messagesError}
                    </div>
                )}

                {isMessagesLoading ? (
                    <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                        Loading messages...
                    </div>
                ) : (
                    <MessageList
                        messages={messages}
                        currentUserId={user.id}
                        onReachedNewest={markAsRead}
                    />
                )}

                <MessageComposer
                    onSend={async (
                        message,
                    ) => {
                        await sendMessage(
                            message,
                        );
                    }}
                    isSending={isSending}
                />
            </section>
        </main>
    );
}