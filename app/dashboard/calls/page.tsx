"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCheck, Phone, PhoneMissed, Video } from "lucide-react";
import { listCalls } from "@/app/services/call/calls.service";
import type { CallWithOwnParticipant } from "@/app/types/calls/calls.types";
import { useAuth } from "@/app/hooks/auth/useAuth";
import { useConversations } from "@/app/hooks/conversations/useConversations";
import {
    Avatar,
    EmptyState,
    ListSkeleton,
    Page,
    PageHeader,
    StaggerItem,
    StaggerList,
    Surface,
    callStateLabel,
    dayLabel,
    focusRing,
    isMissed,
} from "@/app/components/dashboard/dashboard-ui";

type Tab = "all" | "missed";

export default function CallHistoryPage() {
    const [calls, setCalls] = useState<CallWithOwnParticipant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>("all");
    const { user, isHydrated } = useAuth();
    const router = useRouter();
    const { conversations } = useConversations();

    useEffect(() => {
        if (isHydrated && !user) router.replace("/login");
    }, [isHydrated, user, router]);

    useEffect(() => {
        let active = true;
        void listCalls(100)
            .then((response) => {
                if (active) setCalls(response.data);
            })
            .catch((cause) => {
                if (active)
                    setError(
                        cause instanceof Error
                            ? cause.message
                            : "Call history could not be loaded.",
                    );
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    const missed = useMemo(() => calls.filter(isMissed), [calls]);
    const visible = tab === "missed" ? missed : calls;

    const groups = useMemo(() => {
        const map = new Map<string, CallWithOwnParticipant[]>();
        for (const entry of visible) {
            const label = dayLabel(entry.call.createdAt);
            map.set(label, [...(map.get(label) ?? []), entry]);
        }
        return [...map.entries()];
    }, [visible]);

    const personFor = (entry: CallWithOwnParticipant) =>
        conversations.find((c) => c.id === entry.call.conversationId)?.participant;

    return (
        <Page width="max-w-3xl">
            <PageHeader
                title="Calls"
                subtitle="Recent and missed conversations, together in one place."
                actions={
                    <motion.div whileTap={{ scale: 0.94 }} whileHover={{ y: -1 }}>
                        <Link
                            href="/dashboard/calls/new"
                            className={`flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-b from-[#2B8CF5] to-[#0971ED] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(9,113,237,0.7)] ${focusRing}`}
                        >
                            <Video size={18} aria-hidden="true" />
                            <span className="hidden sm:inline">New call</span>
                            <span className="sm:hidden">New</span>
                        </Link>
                    </motion.div>
                }
            />

            {error && (
                <p
                    role="alert"
                    className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                    <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {error}
                </p>
            )}

            {/* Segmented tabs */}
            <div
                role="tablist"
                aria-label="Call filter"
                className="mb-5 grid grid-cols-2 rounded-2xl border border-white/70 bg-white/60 p-1 backdrop-blur-xl"
            >
                {(
                    [
                        ["all", "All calls", calls.length],
                        ["missed", "Missed", missed.length],
                    ] as const
                ).map(([value, label, count]) => (
                    <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={tab === value}
                        onClick={() => setTab(value)}
                        className={`relative flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${
                            tab === value ? "text-[#0971ED]" : "text-[#0C1A2E]/55"
                        } ${focusRing}`}
                    >
                        {tab === value && (
                            <motion.span
                                layoutId="calls-tab"
                                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                                className="absolute inset-0 rounded-xl bg-white shadow-sm"
                            />
                        )}
                        <span className="relative">{label}</span>
                        <span
                            className={`relative flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                                value === "missed" && count > 0
                                    ? "bg-red-50 text-red-600"
                                    : "bg-[#0C1A2E]/[0.07] text-[#0C1A2E]/60"
                            }`}
                        >
                            {count}
                        </span>
                    </button>
                ))}
            </div>

            {loading ? (
                <Surface>
                    <ListSkeleton rows={5} />
                </Surface>
            ) : (
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={tab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                    >
                        {groups.length === 0 ? (
                            <Surface>
                                <EmptyState
                                    icon={tab === "missed" ? CheckCheck : Phone}
                                    title={
                                        tab === "missed"
                                            ? "You’re all caught up"
                                            : "No calls yet"
                                    }
                                    text={
                                        tab === "missed"
                                            ? "Missed calls will appear here."
                                            : "Your recent calls will appear here."
                                    }
                                />
                            </Surface>
                        ) : (
                            <div className="space-y-6">
                                {groups.map(([label, entries]) => (
                                    <section key={label} aria-label={label}>
                                        <h2 className="mb-2 px-2 text-sm font-semibold text-[#0C1A2E]/50">
                                            {label}
                                        </h2>

                                        <Surface className="overflow-hidden">
                                            <StaggerList className="p-1.5">
                                                {entries.map((entry) => {
                                                    const miss = isMissed(entry);
                                                    const person = personFor(entry);
                                                    const KindIcon = miss
                                                        ? PhoneMissed
                                                        : entry.call.type === "video"
                                                          ? Video
                                                          : Phone;

                                                    return (
                                                        <StaggerItem key={entry.call.id}>
                                                            <div className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-colors hover:bg-[#0971ED]/[0.05]">
                                                                <span className="relative">
                                                                    <Avatar
                                                                        name={person?.displayName ?? "Miyor"}
                                                                        src={person?.profilePictureUrl}
                                                                        size={48}
                                                                    />
                                                                    <span
                                                                        className={`absolute -bottom-1 -right-1 flex h-[22px] w-[22px] items-center justify-center rounded-full text-white ring-2 ring-white ${
                                                                            miss ? "bg-red-500" : "bg-[#0971ED]"
                                                                        }`}
                                                                    >
                                                                        <KindIcon size={12} strokeWidth={2.4} aria-hidden="true" />
                                                                    </span>
                                                                </span>

                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-[15px] font-semibold">
                                                                        {person?.displayName ??
                                                                            (entry.call.type === "video"
                                                                                ? "Video call"
                                                                                : "Voice call")}
                                                                    </p>
                                                                    <p
                                                                        className={`mt-0.5 truncate text-xs ${
                                                                            miss ? "text-red-500" : "text-[#0C1A2E]/55"
                                                                        }`}
                                                                    >
                                                                        {entry.call.type === "video" ? "Video" : "Voice"} ·{" "}
                                                                        {callStateLabel(entry)} ·{" "}
                                                                        {new Date(entry.call.createdAt).toLocaleTimeString(
                                                                            [],
                                                                            { hour: "numeric", minute: "2-digit" },
                                                                        )}
                                                                    </p>
                                                                </div>

                                                                <motion.div whileTap={{ scale: 0.92 }}>
                                                                    <Link
                                                                        href={`/dashboard/conversations/${entry.call.conversationId}`}
                                                                        aria-label={`Call back ${person?.displayName ?? ""}`.trim()}
                                                                        className={`flex h-10 items-center gap-1.5 rounded-full bg-[#0971ED]/10 px-3.5 text-sm font-semibold text-[#0971ED] transition-colors hover:bg-[#0971ED] hover:text-white ${focusRing}`}
                                                                    >
                                                                        <Phone size={16} aria-hidden="true" />
                                                                        <span className="hidden sm:inline">Call back</span>
                                                                    </Link>
                                                                </motion.div>
                                                            </div>
                                                        </StaggerItem>
                                                    );
                                                })}
                                            </StaggerList>
                                        </Surface>
                                    </section>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            )}
        </Page>
    );
}