"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ChevronLeft, Loader2 } from "lucide-react";

import { MessageComposer } from "@/app/components/conversations/message-composer";
import { MessageList } from "@/app/components/conversations/message-list";
import { useAuth } from "@/app/hooks/auth/useAuth";
import { useConversationMessages } from "@/app/hooks/conversations/useConversationsMessages";
import { getConversation } from "@/app/services/conversation/conversations.service";
import type { ConversationDetails } from "@/app/types/conversations/conversations.types";
import { CallLauncher } from "@/app/components/calls/call-launcher";
import { Avatar, Skeleton, focusRing } from "@/app/components/dashboard/dashboard-ui";

export default function ConversationPage() {
    const params = useParams<{ conversationId?: string }>();
    const conversationId = params.conversationId;

    const { user, isHydrated } = useAuth();

    const [conversation, setConversation] = useState<ConversationDetails | null>(null);
    const [isConversationLoading, setIsConversationLoading] = useState(true);
    const [conversationError, setConversationError] = useState<string | null>(null);

    const {
        messages,
        isLoading: isMessagesLoading,
        isSending,
        error: messagesError,
        sendMessage,
        changeMessage,
        markAsRead,
    } = useConversationMessages(conversationId);
    const [replyTo, setReplyTo] = useState<import("@/app/types/conversations/conversations.types").Message | null>(null);
    const [editing, setEditing] = useState<import("@/app/types/conversations/conversations.types").Message | null>(null);

    useEffect(() => {
        if (!conversationId) {
            setConversation(null);
            setIsConversationLoading(false);
            setConversationError("Conversation ID is missing.");

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
                const response = await getConversation(id);

                if (cancelled) {
                    return;
                }

                setConversation(response.conversation);
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
            <div className="flex h-full flex-1 items-center justify-center text-[#0971ED]">
                <Loader2 className="animate-spin" size={26} aria-label="Loading" />
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
            <main className="mx-auto w-full max-w-xl px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
                <Link
                    href="/dashboard/conversations"
                    className={`inline-flex items-center gap-1 rounded-full py-2 pr-3 text-sm font-semibold text-[#0971ED] ${focusRing}`}
                >
                    <ChevronLeft size={18} aria-hidden="true" />
                    Chats
                </Link>

                <div
                    role="alert"
                    className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                    <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                    Conversation ID is missing.
                </div>
            </main>
        );
    }

    const otherMember = conversation?.members.find(
        (member) => member.userId !== user.id,
    );

    const photo =
        (otherMember?.user as { profilePictureUrl?: string | null } | undefined)
            ?.profilePictureUrl ?? null;

    return (
        <main className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
            {/* Header */}
            <header className="relative z-20 flex items-center gap-1 border-b border-white/70 bg-white/70 px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-2xl sm:gap-2 sm:px-4">
                <motion.div whileTap={{ scale: 0.9 }} className="md:hidden">
                    <Link
                        href="/dashboard/conversations"
                        aria-label="Back to chats"
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-[#0971ED] hover:bg-[#0971ED]/10 ${focusRing}`}
                    >
                        <ChevronLeft size={26} aria-hidden="true" />
                    </Link>
                </motion.div>

                <div className="flex min-w-0 flex-1 items-center gap-3 pl-1 md:pl-1">
                    {isConversationLoading ? (
                        <>
                            <Skeleton className="h-11 w-11 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-3.5 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </>
                    ) : (
                        <>
                            <Avatar
                                name={otherMember?.user.displayName}
                                src={photo}
                                size={44}
                            />

                            <div className="min-w-0">
                                <h1 className="truncate text-[15px] font-semibold leading-tight">
                                    {otherMember?.user.displayName ?? "Conversation"}
                                </h1>

                                {otherMember && (
                                    <p className="truncate text-xs text-[#0C1A2E]/55">
                                        @{otherMember.user.username}
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {otherMember && (
                    <div className="flex items-center gap-1">
                        <CallLauncher
                            conversationId={conversationId}
                            calleeId={otherMember.userId}
                            type="voice"
                            compact
                            label={`Call ${otherMember.user.displayName}`}
                        />

                        <CallLauncher
                            conversationId={conversationId}
                            calleeId={otherMember.userId}
                            type="video"
                            compact
                            label={`Video call ${otherMember.user.displayName}`}
                        />
                    </div>
                )}
            </header>

            {/* Errors */}
            <AnimatePresence initial={false}>
                {(conversationError || messagesError) && (
                    <motion.div
                        key="errors"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-2 p-3 sm:p-4">
                            {[conversationError, messagesError]
                                .filter((e): e is string => Boolean(e))
                                .map((e) => (
                                    <div
                                        key={e}
                                        role="alert"
                                        className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
                                    >
                                        <AlertCircle
                                            size={20}
                                            className="mt-0.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        {e}
                                    </div>
                                ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Messages */}
            {isMessagesLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-[#0C1A2E]/55">
                    <Loader2 className="animate-spin text-[#0971ED]" size={26} aria-hidden="true" />
                    Loading messages…
                </div>
            ) : (
                <MessageList
                    messages={messages}
                    currentUserId={user.id}
                    onReachedNewest={markAsRead}
                    onReply={(message) => { setReplyTo(message); setEditing(null); }}
                    onEdit={(message) => { setEditing(message); setReplyTo(null); }}
                    onDelete={(message) => { if (window.confirm("Delete this message for everyone?")) void changeMessage(message.id, "", true); }}
                />
            )}

            {/* Composer */}
            <div className="border-t border-white/70 bg-white/70 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl">
                <MessageComposer
                    onSend={async (message) => {
                        await sendMessage(message, replyTo?.id);
                    }}
                    isSending={isSending}
                    replyTo={replyTo}
                    editing={editing}
                    onCancelContext={() => { setReplyTo(null); setEditing(null); }}
                    onEdit={async (messageId, body) => { await changeMessage(messageId, body); }}
                />
            </div>
        </main>
    );
}