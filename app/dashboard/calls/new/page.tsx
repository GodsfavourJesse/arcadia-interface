"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { createDirectConversation } from "@/app/services/conversation/conversations.service";
import { searchUsers } from "@/app/services/users/users.service";
import { useCallStore } from "@/app/store/calls/call.store";
import { CALL_TYPE } from "@/app/types/calls/calls.types";
import type { CallType } from "@/app/types/calls/calls.types";
import type { DiscoverableUser } from "@/app/types/users/users.types";
import { useActiveCall } from "@/app/hooks/calls/useActiveCall";

function UserAvatar({ user }: { user: DiscoverableUser }) {
    if (user.profilePictureUrl) {
        return (
            <img
                src={user.profilePictureUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
        );
    }

    const initials = user.displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "M";

    return (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-semibold text-[#0971ED]">
            {initials}
        </div>
    );
}

export default function MakeCallPage() {
    const startCall = useCallStore((state) => state.startCall);
    const storeError = useCallStore((state) => state.error);
    const isStarting = useCallStore((state) => state.isStarting);
    const { activeCall } = useActiveCall();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<DiscoverableUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<DiscoverableUser | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const busy = isStarting || isPreparing;
    const visibleError = error ?? storeError;

    const handleSearch = useCallback(async () => {
        const searchTerm = query.trim();
        if (!searchTerm || isSearching) {
            setError(searchTerm ? null : "Enter a Miyor number or username.");
            return;
        }

        setIsSearching(true);
        setError(null);
        setSelectedUser(null);
        setResults([]);

        try {
            const response = await searchUsers(searchTerm);
            setResults(response.results);
            if (response.results.length === 0) {
                setError("No Miyor member matched that search.");
            } else if (response.results.length === 1) {
                setSelectedUser(response.results[0]);
            }
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Unable to search Miyor members.");
        } finally {
            setIsSearching(false);
        }
    }, [isSearching, query]);

    const handleStartCall = async (type: CallType) => {
        if (!selectedUser || busy) return;
        setError(null);
        setIsPreparing(true);

        try {
            const conversation = await createDirectConversation(selectedUser.id);
            await startCall({
                conversationId: conversation.conversation.id,
                calleeId: selectedUser.id,
                type,
            });
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Unable to start this call.");
        } finally {
            setIsPreparing(false);
        }
    };

    if (activeCall) {
        return (
            <main className="min-h-screen bg-slate-50 px-6 py-10">
                <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <h1 className="text-xl font-semibold text-slate-950">You’re already in a call</h1>
                    <p className="mt-2 text-sm text-slate-500">End the current call before starting another one.</p>
                    <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-[#0971ED] px-5 py-3 text-sm font-semibold text-white">Back to dashboard</Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 px-6 py-8">
            <div className="mx-auto w-full max-w-3xl">
                <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-950">← Dashboard</Link>
                <header className="mt-8">
                    <p className="text-sm font-medium text-slate-500">MIYOR</p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Start a call</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Find a Miyor member, then choose voice or video.</p>
                </header>

                {visibleError && (
                    <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{visibleError}</p>
                )}

                <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="text-lg font-semibold text-slate-950">Who would you like to call?</h2>
                    <p className="mt-1 text-sm text-slate-500">Search by Miyor number or username.</p>
                    <form
                        className="mt-5 flex flex-col gap-3 sm:flex-row"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleSearch();
                        }}
                    >
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            autoComplete="off"
                            placeholder="Miyor number or username"
                            aria-label="Miyor number or username"
                            className="h-12 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />
                        <button
                            type="submit"
                            disabled={isSearching || !query.trim()}
                            className="h-12 rounded-xl bg-[#0971ED] px-5 text-sm font-semibold text-white hover:bg-[#075fc8] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSearching ? "Searching…" : "Search"}
                        </button>
                    </form>

                    {results.length > 0 && (
                        <div className="mt-5 space-y-3">
                            {results.map((member) => (
                                <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => setSelectedUser(member)}
                                    aria-pressed={selectedUser?.id === member.id}
                                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${selectedUser?.id === member.id ? "border-[#0971ED] bg-blue-50/60" : "border-slate-200 hover:border-slate-300"}`}
                                >
                                    <UserAvatar user={member} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold text-slate-950">{member.displayName}</span>
                                        <span className="mt-0.5 block truncate text-sm text-slate-500">
                                            {member.miyorNumber ? `Miyor #${member.miyorNumber}` : `@${member.username}`}
                                        </span>
                                    </span>
                                    {selectedUser?.id === member.id && <span className="text-sm font-semibold text-[#0971ED]">Selected</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedUser && (
                        <div className="mt-8 border-t border-slate-100 pt-6">
                            <p className="text-sm font-medium text-slate-700">Choose a call type</p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => void handleStartCall(CALL_TYPE.VOICE)}
                                    disabled={busy}
                                    className="rounded-2xl border border-slate-200 p-5 text-left transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <span className="block font-semibold text-slate-950">Voice call</span>
                                    <span className="mt-1 block text-sm text-slate-500">Connect with audio.</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleStartCall(CALL_TYPE.VIDEO)}
                                    disabled={busy}
                                    className="rounded-2xl border border-slate-200 p-5 text-left transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <span className="block font-semibold text-slate-950">Video call</span>
                                    <span className="mt-1 block text-sm text-slate-500">Use your camera; effects can be selected during the call.</span>
                                </button>
                            </div>
                            {busy && <p className="mt-4 text-sm text-slate-500">Preparing your call…</p>}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
