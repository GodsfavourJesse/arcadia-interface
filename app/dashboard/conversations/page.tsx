"use client";

import Link from "next/link";

import {
    ConversationList,
} from "@/app/components/conversations/conversation-list";

import {
    useConversations,
} from "@/app/hooks/conversations/useConversations";

export default function ConversationsPage() {
    const {
        conversations,
        isLoading,
        error,
    } = useConversations();

    return (
        <main className="mx-auto w-full max-w-4xl px-6 py-8">
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        Miyor
                    </p>

                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                        Conversations
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Stay connected with the
                        people you know.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/dashboard/calls/new"
                        className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        Start a call
                    </Link>

                    <Link
                        href="/dashboard/discover"
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Find people
                    </Link>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                    Loading conversations...
                </div>
            ) : (
                <ConversationList
                    conversations={
                        conversations
                    }
                />
            )}
        </main>
    );
}