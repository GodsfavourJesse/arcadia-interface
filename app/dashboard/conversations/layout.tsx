"use client";

import Link from "next/link";
import { ReactNode, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Inbox, Plus, Search, SearchX, X } from "lucide-react";
import { useConversations } from "@/app/hooks/conversations/useConversations";
import {
    Avatar,
    EmptyState,
    ListSkeleton,
    ease,
    focusRing,
    formatListTime,
} from "@/app/components/dashboard/dashboard-ui";

type Filter = "all" | "unread";

export default function ConversationsLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { conversations, isLoading } = useConversations();
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<Filter>("all");

    const selectedId = pathname.split("/")[3];
    const hasSelection = Boolean(selectedId);
    const unreadTotal = conversations.filter((c) => c.unreadCount > 0).length;

    const filtered = useMemo(() => {
        const q = query.toLowerCase();
        return conversations.filter((item) => {
            if (filter === "unread" && item.unreadCount === 0) return false;
            return (
                (item.participant?.displayName ?? "").toLowerCase().includes(q) ||
                (item.participant?.username ?? "").toLowerCase().includes(q)
            );
        });
    }, [conversations, query, filter]);

    return (
        <div className="grid h-dvh w-full grid-cols-1 overflow-hidden md:grid-cols-[320px_minmax(0,1fr)] lg:grid-cols-[380px_minmax(0,1fr)]">
            {/* Chat list */}
            <aside
                className={`${
                    hasSelection ? "hidden md:flex" : "flex"
                } min-h-0 flex-col border-r border-white/70 bg-white/60 backdrop-blur-2xl`}
            >
                <header className="px-4 pb-3 pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:px-5 md:pt-6">
                    <div className="flex items-center justify-between gap-3">
                        <h1 className="font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-none tracking-[-0.03em]">
                            Chats
                        </h1>

                        <motion.div whileTap={{ scale: 0.92 }} whileHover={{ y: -1 }}>
                            <Link
                                href="/dashboard/discover"
                                aria-label="Start a new conversation"
                                className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#2B8CF5] to-[#0971ED] text-white shadow-[0_10px_24px_-8px_rgba(9,113,237,0.7)] ${focusRing}`}
                            >
                                <Plus size={22} strokeWidth={2.2} aria-hidden="true" />
                            </Link>
                        </motion.div>
                    </div>

                    <label className="mt-4 flex h-11 items-center gap-2.5 rounded-2xl border border-white/80 bg-white/70 px-3.5 shadow-sm transition focus-within:border-[#0971ED] focus-within:ring-4 focus-within:ring-[#0971ED]/15">
                        <Search size={18} className="shrink-0 text-[#0C1A2E]/40" aria-hidden="true" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search conversations"
                            aria-label="Search conversations"
                            className="w-full border-0 bg-transparent p-0 text-[15px] outline-none placeholder:text-[#0C1A2E]/40 focus:ring-0"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery("")}
                                aria-label="Clear search"
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0C1A2E]/10 text-[#0C1A2E]/60 hover:bg-[#0C1A2E]/15"
                            >
                                <X size={14} aria-hidden="true" />
                            </button>
                        )}
                    </label>

                    {/* Segmented filter */}
                    <div
                        role="tablist"
                        aria-label="Filter conversations"
                        className="mt-3 inline-flex rounded-full bg-[#0C1A2E]/[0.06] p-1"
                    >
                        {(
                            [
                                ["all", "All"],
                                ["unread", unreadTotal ? `Unread · ${unreadTotal}` : "Unread"],
                            ] as const
                        ).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                role="tab"
                                aria-selected={filter === value}
                                onClick={() => setFilter(value)}
                                className={`relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                                    filter === value ? "text-[#0971ED]" : "text-[#0C1A2E]/55"
                                } ${focusRing}`}
                            >
                                {filter === value && (
                                    <motion.span
                                        layoutId="chat-filter"
                                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                                        className="absolute inset-0 rounded-full bg-white shadow-sm"
                                    />
                                )}
                                <span className="relative">{label}</span>
                            </button>
                        ))}
                    </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-32 md:pb-4">
                    {isLoading && <ListSkeleton rows={6} />}

                    {!isLoading && filtered.length === 0 && (
                        <EmptyState
                            icon={query ? SearchX : Inbox}
                            title={
                                query
                                    ? "No matches"
                                    : filter === "unread"
                                      ? "No unread chats"
                                      : "Your conversations start here"
                            }
                            text={
                                query
                                    ? "Try a different name or username."
                                    : filter === "unread"
                                      ? "You’re all caught up."
                                      : "Find someone you know and begin a private conversation."
                            }
                            action={
                                !query && filter === "all" ? (
                                    <Link
                                        href="/dashboard/discover"
                                        className={`inline-flex h-11 items-center rounded-xl bg-[#0971ED] px-5 text-sm font-semibold text-white ${focusRing}`}
                                    >
                                        Find people
                                    </Link>
                                ) : undefined
                            }
                        />
                    )}

                    <LayoutGroup>
                        <AnimatePresence initial={false}>
                            {filtered.map((conversation) => {
                                const person = conversation.participant;
                                const active = selectedId === conversation.id;
                                const unread = conversation.unreadCount > 0;

                                return (
                                    <motion.div
                                        layout
                                        key={conversation.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.97 }}
                                        transition={{ duration: 0.25, ease }}
                                        whileTap={{ scale: 0.985 }}
                                    >
                                        <Link
                                            href={`/dashboard/conversations/${conversation.id}`}
                                            className={`relative flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors ${
                                                active
                                                    ? "bg-[#0971ED]/10"
                                                    : "hover:bg-white/70 active:bg-white/80"
                                            } ${focusRing}`}
                                        >
                                            {active && (
                                                <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-[#0971ED]" />
                                            )}

                                            <Avatar
                                                name={person?.displayName}
                                                src={person?.profilePictureUrl}
                                                size={50}
                                            />

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p
                                                        className={`truncate text-[15px] ${
                                                            unread ? "font-bold" : "font-semibold"
                                                        }`}
                                                    >
                                                        {person?.displayName ?? "Miyor contact"}
                                                    </p>
                                                    <time
                                                        className={`shrink-0 text-[11px] ${
                                                            unread
                                                                ? "font-semibold text-[#0971ED]"
                                                                : "text-[#0C1A2E]/45"
                                                        }`}
                                                    >
                                                        {conversation.lastMessage
                                                            ? formatListTime(conversation.lastMessage.createdAt)
                                                            : ""}
                                                    </time>
                                                </div>

                                                <div className="mt-0.5 flex items-center justify-between gap-2">
                                                    <p
                                                        className={`truncate text-sm ${
                                                            unread
                                                                ? "font-medium text-[#0C1A2E]/80"
                                                                : "text-[#0C1A2E]/55"
                                                        }`}
                                                    >
                                                        {conversation.lastMessage?.body || "Start a conversation"}
                                                    </p>
                                                    {unread && (
                                                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#0971ED] px-1.5 text-[11px] font-bold text-white">
                                                            {conversation.unreadCount > 99
                                                                ? "99+"
                                                                : conversation.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </LayoutGroup>
                </div>
            </aside>

            {/* Conversation pane */}
            <section
                className={`${
                    hasSelection ? "flex" : "hidden md:flex"
                } min-h-0 min-w-0 flex-col`}
            >
                {children}
            </section>
        </div>
    );
}