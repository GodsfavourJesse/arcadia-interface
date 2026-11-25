"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    Loader2,
    Phone,
    PhoneCall,
    Search,
    SearchX,
    Video,
} from "lucide-react";

import { createDirectConversation } from "@/app/services/conversation/conversations.service";
import { searchUsers } from "@/app/services/users/users.service";
import { useCallStore } from "@/app/store/calls/call.store";
import { CALL_TYPE } from "@/app/types/calls/calls.types";
import type { CallType } from "@/app/types/calls/calls.types";
import type { DiscoverableUser } from "@/app/types/users/users.types";
import { useActiveCall } from "@/app/hooks/calls/useActiveCall";
import {
    Avatar,
    EmptyState,
    IconTile,
    Page,
    PageHeader,
    StaggerItem,
    StaggerList,
    Surface,
    ease,
    focusRing,
} from "@/app/components/dashboard/dashboard-ui";

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
    const [searched, setSearched] = useState(false);
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
            setSearched(true);
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
            <Page width="max-w-2xl">
                <Surface>
                    <EmptyState
                        icon={PhoneCall}
                        title="You’re already in a call"
                        text="End the current call before starting another one."
                        action={
                            <Link
                                href="/dashboard"
                                className={`inline-flex h-11 items-center rounded-xl bg-[#0971ED] px-5 text-sm font-semibold text-white ${focusRing}`}
                            >
                                Back to dashboard
                            </Link>
                        }
                    />
                </Surface>
            </Page>
        );
    }

    return (
        <Page width="max-w-3xl">
            <Link
                href="/dashboard/calls"
                className={`mb-4 inline-flex items-center gap-1 rounded-full py-1.5 pr-3 text-sm font-semibold text-[#0971ED] ${focusRing}`}
            >
                <ChevronLeft size={18} aria-hidden="true" />
                Calls
            </Link>

            <PageHeader
                title="Start a call"
                subtitle="Find a Miyor member, then choose voice or video."
            />

            <AnimatePresence initial={false}>
                {visibleError && (
                    <motion.p
                        key="error"
                        role="alert"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                    >
                        <span className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                            <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                            {visibleError}
                        </span>
                    </motion.p>
                )}
            </AnimatePresence>

            <Surface className="p-4 sm:p-7">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                    Who would you like to call?
                </h2>
                <p className="mt-1 text-sm text-[#0C1A2E]/55">
                    Search by Miyor number or username.
                </p>

                <form
                    className="mt-5 flex flex-col gap-3 sm:flex-row"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void handleSearch();
                    }}
                >
                    <label className="flex h-12 flex-1 items-center gap-2.5 rounded-xl border border-[#0C1A2E]/15 bg-white px-4 transition focus-within:border-[#0971ED] focus-within:ring-4 focus-within:ring-[#0971ED]/15">
                        <Search size={18} className="shrink-0 text-[#0C1A2E]/40" aria-hidden="true" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            autoComplete="off"
                            placeholder="Miyor number or username"
                            aria-label="Miyor number or username"
                            className="w-full border-0 bg-transparent p-0 text-[15px] outline-none placeholder:text-[#0C1A2E]/40 focus:ring-0"
                        />
                    </label>

                    <motion.button
                        type="submit"
                        disabled={isSearching || !query.trim()}
                        whileTap={{ scale: 0.97 }}
                        className={`flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#2B8CF5] to-[#0971ED] px-6 text-[15px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(9,113,237,0.7)] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                    >
                        {isSearching ? (
                            <>
                                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                                Searching…
                            </>
                        ) : (
                            "Search"
                        )}
                    </motion.button>
                </form>

                {/* Results */}
                {results.length > 0 && (
                    <StaggerList className="mt-5 space-y-2.5">
                        {results.map((member) => {
                            const selected = selectedUser?.id === member.id;

                            return (
                                <StaggerItem key={member.id}>
                                    <motion.button
                                        type="button"
                                        onClick={() => setSelectedUser(member)}
                                        aria-pressed={selected}
                                        whileTap={{ scale: 0.985 }}
                                        className={`flex w-full items-center gap-4 rounded-2xl border p-3.5 text-left transition-colors ${
                                            selected
                                                ? "border-[#0971ED] bg-[#0971ED]/[0.06] ring-4 ring-[#0971ED]/10"
                                                : "border-[#0C1A2E]/10 bg-white/70 hover:border-[#0971ED]/40"
                                        } ${focusRing}`}
                                    >
                                        <Avatar
                                            name={member.displayName}
                                            src={member.profilePictureUrl}
                                            size={52}
                                        />

                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[15px] font-semibold">
                                                {member.displayName}
                                            </span>
                                            <span className="mt-0.5 block truncate text-sm text-[#0C1A2E]/55">
                                                {member.miyorNumber
                                                    ? `Miyor #${member.miyorNumber}`
                                                    : `@${member.username}`}
                                            </span>
                                        </span>

                                        {selected && (
                                            <CheckCircle2
                                                size={24}
                                                className="shrink-0 text-[#0971ED]"
                                                aria-label="Selected"
                                            />
                                        )}
                                    </motion.button>
                                </StaggerItem>
                            );
                        })}
                    </StaggerList>
                )}

                {searched && !isSearching && results.length === 0 && (
                    <EmptyState
                        icon={SearchX}
                        title="No members found"
                        text="Check the Miyor number or username and try again."
                    />
                )}

                {/* Call type */}
                <AnimatePresence initial={false}>
                    {selectedUser && (
                        <motion.div
                            key="call-type"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.35, ease }}
                            className="overflow-hidden"
                        >
                            <div className="mt-7 border-t border-[#0C1A2E]/10 pt-6">
                                <p className="text-sm font-semibold text-[#0C1A2E]/75">
                                    Call {selectedUser.displayName.split(" ")[0]}
                                </p>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <CallTypeButton
                                        icon={Phone}
                                        tone="teal"
                                        title="Voice call"
                                        text="Connect with audio."
                                        disabled={busy}
                                        onClick={() => void handleStartCall(CALL_TYPE.VOICE)}
                                    />
                                    <CallTypeButton
                                        icon={Video}
                                        tone="blue"
                                        title="Video call"
                                        text="Use your camera. Effects can be chosen during the call."
                                        disabled={busy}
                                        onClick={() => void handleStartCall(CALL_TYPE.VIDEO)}
                                    />
                                </div>

                                {busy && (
                                    <p
                                        className="mt-4 flex items-center gap-2 text-sm text-[#0C1A2E]/60"
                                        role="status"
                                    >
                                        <Loader2
                                            size={16}
                                            className="animate-spin text-[#0971ED]"
                                            aria-hidden="true"
                                        />
                                        Preparing your call…
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Surface>
        </Page>
    );
}

function CallTypeButton({
    icon,
    tone,
    title,
    text,
    disabled,
    onClick,
}: {
    icon: React.ComponentProps<typeof IconTile>["icon"];
    tone: React.ComponentProps<typeof IconTile>["tone"];
    title: string;
    text: string;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            disabled={disabled}
            whileHover={disabled ? undefined : { y: -2 }}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            className={`flex items-start gap-4 rounded-2xl border border-[#0C1A2E]/10 bg-white/80 p-4 text-left transition-colors hover:border-[#0971ED]/40 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
        >
            <IconTile icon={icon} tone={tone} />
            <span>
                <span className="block text-[15px] font-semibold">{title}</span>
                <span className="mt-1 block text-sm leading-5 text-[#0C1A2E]/55">
                    {text}
                </span>
            </span>
        </motion.button>
    );
}