"use client";

import Link from "next/link";

import type {
    ConversationSummary,
} from "@/app/types/conversations/conversations.types";

type ConversationListProps = {
    conversations: ConversationSummary[];
};

function formatMessagePreview(
    conversation: ConversationSummary,
) {
    if (!conversation.lastMessage) {
        return "No messages yet";
    }

    return conversation.lastMessage.body;
}

export function ConversationList({
    conversations,
}: ConversationListProps) {
    if (conversations.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <h2 className="text-lg font-semibold text-slate-900">
                    No conversations yet
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                    Start a conversation with
                    one of your contacts.
                </p>

                <Link
                    href="/dashboard/discover"
                    className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                    Discover people
                </Link>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {conversations.map(
                (conversation) => {
                    const participant =
                        conversation.participant;

                    const unreadCount =
                        conversation.unreadCount;

                    return (
                        <Link
                            key={
                                conversation.id
                            }
                            href={`/dashboard/conversations/${conversation.id}`}
                            className={`flex items-center gap-4 border-b border-slate-100 p-4 transition last:border-b-0 hover:bg-slate-50 ${
                                unreadCount > 0
                                    ? "bg-slate-50/70"
                                    : ""
                            }`}
                        >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-600">
                                {participant?.displayName
                                    ?.charAt(0)
                                    .toUpperCase() ??
                                    "?"}
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                    <p
                                        className={`truncate ${
                                            unreadCount >
                                            0
                                                ? "font-bold text-slate-950"
                                                : "font-semibold text-slate-900"
                                        }`}
                                    >
                                        {participant?.displayName ??
                                            "Conversation"}
                                    </p>

                                    <div className="flex shrink-0 items-center gap-2">
                                        {conversation.lastMessage && (
                                            <time className="text-xs text-slate-400">
                                                {new Date(
                                                    conversation
                                                        .lastMessage
                                                        .createdAt,
                                                ).toLocaleTimeString(
                                                    [],
                                                    {
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                    },
                                                )}
                                            </time>
                                        )}

                                        {unreadCount >
                                            0 && (
                                            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-950 px-1.5 text-[11px] font-bold text-white">
                                                {unreadCount >
                                                99
                                                    ? "99+"
                                                    : unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {participant && (
                                    <p className="text-xs text-slate-400">
                                        @
                                        {
                                            participant.username
                                        }
                                    </p>
                                )}

                                <p
                                    className={`mt-1 truncate text-sm ${
                                        unreadCount >
                                        0
                                            ? "font-medium text-slate-700"
                                            : "text-slate-500"
                                    }`}
                                >
                                    {formatMessagePreview(
                                        conversation,
                                    )}
                                </p>
                            </div>
                        </Link>
                    );
                },
            )}
        </div>
    );
}