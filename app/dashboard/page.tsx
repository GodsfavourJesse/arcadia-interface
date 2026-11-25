"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
    MessageCircle,
    MessagesSquare,
    Phone,
    PhoneMissed,
    ScanFace,
    UserPlus,
    Users,
    Video,
} from "lucide-react";
import { useAuth } from "@/app/hooks/auth/useAuth";
import { useConversations } from "@/app/hooks/conversations/useConversations";
import { listCalls } from "@/app/services/call/calls.service";
import type { CallWithOwnParticipant } from "@/app/types/calls/calls.types";
import {
    Avatar,
    EmptyState,
    IconTile,
    ListSkeleton,
    Page,
    SectionTitle,
    Skeleton,
    StaggerItem,
    StaggerList,
    Surface,
    Tap,
    callStateLabel,
    ease,
    focusRing,
    formatListTime,
    glass,
    isMissed,
} from "@/app/components/dashboard/dashboard-ui";

export default function DashboardPage() {
    const router = useRouter();
    const reduce = useReducedMotion();
    const { user, isHydrated, isLoading } = useAuth();
    const { conversations, isLoading: chatsLoading } = useConversations();
    const [calls, setCalls] = useState<CallWithOwnParticipant[]>([]);
    const [callsLoading, setCallsLoading] = useState(true);

    useEffect(() => {
        if (isHydrated && !user) router.replace("/login");
    }, [isHydrated, user, router]);

    useEffect(() => {
        let active = true;
        void listCalls(20)
            .then((response) => {
                if (active) setCalls(response.data);
            })
            .catch(() => undefined)
            .finally(() => {
                if (active) setCallsLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    if (!isHydrated || isLoading) return <HomeSkeleton />;
    if (!user) return null;

    const hour = new Date().getHours();
    const greeting =
        hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const firstName = user.displayName.split(" ")[0];

    const unread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
    const missed = calls.filter(isMissed);
    const nameFor = (entry: CallWithOwnParticipant) =>
        conversations.find((c) => c.id === entry.call.conversationId)?.participant
            ?.displayName ?? (entry.call.type === "video" ? "Video call" : "Voice call");

    const summary =
        unread > 0 || missed.length > 0
            ? [
                  unread > 0 && `${unread} unread ${unread === 1 ? "message" : "messages"}`,
                  missed.length > 0 &&
                      `${missed.length} missed ${missed.length === 1 ? "call" : "calls"}`,
              ]
                  .filter(Boolean)
                  .join(" and ") + " waiting for you."
            : "You’re all caught up. Start a conversation whenever you’re ready.";

    return (
        <Page>
            {/* Hero */}
            <motion.section
                initial={reduce ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease }}
                className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0658C4_0%,#0971ED_50%,#2BA6FF_100%)] p-6 text-white shadow-[0_30px_60px_-30px_rgba(9,113,237,0.7)] sm:p-8 md:p-10"
            >
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/25 blur-[80px]"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-24 left-1/4 h-60 w-80 rounded-full bg-[#062B5B]/40 blur-[90px]"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_0%,rgba(255,255,255,0.22),transparent)]"
                />

                <div className="relative flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-white/75">{greeting}</p>
                        <h1 className="mt-1 truncate font-[family-name:var(--font-display)] text-[2.25rem] font-semibold leading-tight tracking-[-0.03em] md:text-5xl">
                            {firstName}
                        </h1>
                    </div>

                    <Link
                        href="/dashboard/settings"
                        aria-label="Your profile and settings"
                        className={`rounded-full md:hidden ${focusRing}`}
                    >
                        <Avatar name={user.displayName} src={user.profilePictureUrl} size={44} />
                    </Link>

                    {conversations.length > 0 && (
                        <div className="hidden items-center md:flex" aria-hidden="true">
                            <div className="flex -space-x-3">
                                {conversations.slice(0, 4).map((c) => (
                                    <Avatar
                                        key={c.id}
                                        name={c.participant?.displayName}
                                        src={c.participant?.profilePictureUrl}
                                        size={44}
                                        className="!ring-[#0971ED]"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <p className="relative mt-4 max-w-md text-[15px] leading-7 text-white/85">
                    {summary}
                </p>

                <div className="relative mt-6 flex flex-wrap gap-3">
                    <Tap>
                        <Link
                            href="/dashboard/calls/new"
                            className="flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-[15px] font-semibold text-[#0971ED] shadow-[0_12px_30px_-10px_rgba(6,43,91,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                            <Video size={20} aria-hidden="true" />
                            New call
                        </Link>
                    </Tap>

                    <Tap>
                        <Link
                            href="/dashboard/conversations"
                            className="flex h-12 items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-5 text-[15px] font-semibold text-white backdrop-blur-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                            <MessageCircle size={20} aria-hidden="true" />
                            Messages
                        </Link>
                    </Tap>
                </div>
            </motion.section>

            {/* Stats */}
            <StaggerList className="mt-5 grid grid-cols-3 gap-3 md:gap-4">
                <StatTile
                    href="/dashboard/conversations"
                    icon={MessageCircle}
                    tone="blue"
                    value={unread}
                    label="Unread"
                />
                <StatTile
                    href="/dashboard/calls"
                    icon={PhoneMissed}
                    tone="rose"
                    value={missed.length}
                    label="Missed"
                />
                <StatTile
                    href="/dashboard/conversations"
                    icon={Users}
                    tone="violet"
                    value={conversations.length}
                    label="Chats"
                />
            </StaggerList>

            {/* Quick connect */}
            {conversations.length > 0 && (
                <section className="mt-8" aria-label="Quick connect">
                    <h2 className="mb-3 px-1 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                        Quick connect
                    </h2>

                    <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
                        {conversations.slice(0, 10).map((c, i) => (
                            <motion.div
                                key={c.id}
                                initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 + i * 0.05, type: "spring", stiffness: 300, damping: 22 }}
                                whileTap={{ scale: 0.93 }}
                                className="shrink-0"
                            >
                                <Link
                                    href={`/dashboard/conversations/${c.id}`}
                                    className={`flex w-[68px] flex-col items-center gap-2 rounded-2xl ${focusRing}`}
                                >
                                    <span className="relative">
                                        <Avatar
                                            name={c.participant?.displayName}
                                            src={c.participant?.profilePictureUrl}
                                            size={60}
                                        />
                                        {c.unreadCount > 0 && (
                                            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0971ED] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                                                {c.unreadCount > 9 ? "9+" : c.unreadCount}
                                            </span>
                                        )}
                                    </span>
                                    <span className="w-full truncate text-center text-xs font-medium text-[#0C1A2E]/75">
                                        {c.participant?.displayName?.split(" ")[0] ?? "Chat"}
                                    </span>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* Actions */}
            <StaggerList className="mt-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                <ActionTile
                    href="/dashboard/calls/new"
                    icon={Video}
                    tone="blue"
                    title="New call"
                    text="Voice or video"
                />
                <ActionTile
                    href="/dashboard/discover"
                    icon={UserPlus}
                    tone="teal"
                    title="Find people"
                    text="Grow your circle"
                />
                <ActionTile
                    href="/dashboard/conversations"
                    icon={MessagesSquare}
                    tone="violet"
                    title="Messages"
                    text="Pick up a chat"
                />
                <ActionTile
                    href="/dashboard/video-processor-lab"
                    icon={ScanFace}
                    tone="amber"
                    title="Face studio"
                    text="Prepare your look"
                />
            </StaggerList>

            {/* Activity */}
            <div className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <Surface className="overflow-hidden">
                    <SectionTitle
                        title="Recent conversations"
                        description="Pick up where you left off."
                        href="/dashboard/conversations"
                    />

                    {chatsLoading ? (
                        <ListSkeleton rows={4} />
                    ) : conversations.length ? (
                        <StaggerList className="px-2 pb-2">
                            {conversations.slice(0, 5).map((c) => (
                                <StaggerItem key={c.id}>
                                    <Link
                                        href={`/dashboard/conversations/${c.id}`}
                                        className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-[#0971ED]/[0.06] active:bg-[#0971ED]/10 ${focusRing}`}
                                    >
                                        <Avatar
                                            name={c.participant?.displayName}
                                            src={c.participant?.profilePictureUrl}
                                            size={48}
                                        />

                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center justify-between gap-2">
                                                <strong className="truncate text-[15px] font-semibold">
                                                    {c.participant?.displayName ?? "Conversation"}
                                                </strong>
                                                {c.lastMessage && (
                                                    <time className="shrink-0 text-[11px] text-[#0C1A2E]/45">
                                                        {formatListTime(c.lastMessage.createdAt)}
                                                    </time>
                                                )}
                                            </span>

                                            <span className="mt-0.5 flex items-center justify-between gap-2">
                                                <span
                                                    className={`truncate text-sm ${
                                                        c.unreadCount > 0
                                                            ? "font-medium text-[#0C1A2E]/80"
                                                            : "text-[#0C1A2E]/55"
                                                    }`}
                                                >
                                                    {c.lastMessage?.body ?? "Start a conversation"}
                                                </span>
                                                {c.unreadCount > 0 && (
                                                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#0971ED] px-1.5 text-[11px] font-bold text-white">
                                                        {c.unreadCount}
                                                    </span>
                                                )}
                                            </span>
                                        </span>
                                    </Link>
                                </StaggerItem>
                            ))}
                        </StaggerList>
                    ) : (
                        <EmptyState
                            icon={MessageCircle}
                            title="Your chats will live here"
                            text="Find a person and start your first conversation."
                            action={
                                <Link
                                    href="/dashboard/discover"
                                    className={`inline-flex h-11 items-center gap-2 rounded-xl bg-[#0971ED] px-5 text-sm font-semibold text-white ${focusRing}`}
                                >
                                    <UserPlus size={18} aria-hidden="true" />
                                    Discover people
                                </Link>
                            }
                        />
                    )}
                </Surface>

                <Surface className="overflow-hidden self-start">
                    <SectionTitle
                        title="Recent calls"
                        description="Reconnect with one tap."
                        href="/dashboard/calls"
                    />

                    {callsLoading ? (
                        <ListSkeleton rows={3} />
                    ) : calls.length ? (
                        <StaggerList className="px-2 pb-2">
                            {calls.slice(0, 4).map((entry) => {
                                const miss = isMissed(entry);
                                const Icon = miss
                                    ? PhoneMissed
                                    : entry.call.type === "video"
                                      ? Video
                                      : Phone;

                                return (
                                    <StaggerItem key={entry.call.id}>
                                        <Link
                                            href={`/dashboard/conversations/${entry.call.conversationId}`}
                                            className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-[#0971ED]/[0.06] ${focusRing}`}
                                        >
                                            <span
                                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                                                    miss
                                                        ? "bg-red-50 text-red-500"
                                                        : "bg-[#0971ED]/10 text-[#0971ED]"
                                                }`}
                                            >
                                                <Icon size={20} aria-hidden="true" />
                                            </span>

                                            <span className="min-w-0 flex-1">
                                                <strong className="block truncate text-[15px] font-semibold">
                                                    {nameFor(entry)}
                                                </strong>
                                                <span
                                                    className={`block truncate text-xs ${
                                                        miss ? "text-red-500" : "text-[#0C1A2E]/55"
                                                    }`}
                                                >
                                                    {callStateLabel(entry)} · {formatListTime(entry.call.createdAt)}
                                                </span>
                                            </span>

                                            <Phone
                                                size={18}
                                                className="shrink-0 text-[#0971ED]"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </StaggerItem>
                                );
                            })}
                        </StaggerList>
                    ) : (
                        <EmptyState
                            icon={Phone}
                            title="No calls yet"
                            text="Your recent and missed calls will show up here."
                        />
                    )}
                </Surface>
            </div>
        </Page>
    );
}

/* -------------------------------------------------------------------------- */

function StatTile({
    href,
    icon,
    tone,
    value,
    label,
}: {
    href: string;
    icon: React.ComponentProps<typeof IconTile>["icon"];
    tone: React.ComponentProps<typeof IconTile>["tone"];
    value: number;
    label: string;
}) {
    return (
        <StaggerItem>
            <Tap>
                <Link
                    href={href}
                    className={`block rounded-2xl p-3.5 sm:p-4 ${glass} ${focusRing}`}
                >
                    <IconTile icon={icon} tone={tone} size="sm" />
                    <p className="mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums leading-none">
                        {value}
                    </p>
                    <p className="mt-1 text-xs text-[#0C1A2E]/55">{label}</p>
                </Link>
            </Tap>
        </StaggerItem>
    );
}

function ActionTile({
    href,
    icon,
    tone,
    title,
    text,
}: {
    href: string;
    icon: React.ComponentProps<typeof IconTile>["icon"];
    tone: React.ComponentProps<typeof IconTile>["tone"];
    title: string;
    text: string;
}) {
    return (
        <StaggerItem>
            <Tap>
                <Link
                    href={href}
                    className={`flex items-center gap-3 rounded-2xl p-3.5 sm:p-4 ${glass} ${focusRing}`}
                >
                    <IconTile icon={icon} tone={tone} />
                    <span className="min-w-0">
                        <strong className="block truncate text-[15px] font-semibold">
                            {title}
                        </strong>
                        <span className="block truncate text-xs text-[#0C1A2E]/55">
                            {text}
                        </span>
                    </span>
                </Link>
            </Tap>
        </StaggerItem>
    );
}

function HomeSkeleton() {
    return (
        <Page>
            <Skeleton className="h-56 w-full rounded-[2rem] md:h-64" />
            <div className="mt-5 grid grid-cols-3 gap-3">
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
            </div>
            <Skeleton className="mt-6 h-72 w-full rounded-3xl" />
        </Page>
    );
}