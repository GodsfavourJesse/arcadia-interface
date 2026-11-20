"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { listCalls } from "@/app/services/call/calls.service";
import { useConversations } from "@/app/hooks/conversations/useConversations";
import { motion } from "framer-motion";

const items = [
    { label: "Home", short: "Home", href: "/dashboard", icon: "home" },
    { label: "Messages", short: "Chats", href: "/dashboard/conversations", icon: "chat" },
    { label: "Calls", short: "Calls", href: "/dashboard/calls", icon: "phone" },
    { label: "People", short: "People", href: "/dashboard/discover", icon: "people" },
    { label: "Settings", short: "Settings", href: "/dashboard/settings", icon: "settings" },
] as const;

const MISSED_SEEN_KEY = "miyor-seen-missed-calls";

function Badge({ count }: { count: number }) {
    if (count <= 0) return null;
    return <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0971ED] px-1 text-[10px] font-bold leading-none text-white">{count > 99 ? "99+" : count}</span>;
}

function NavIcon({ name }: { name: string }) {
    const shared = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" {...shared}>
        {name === "home" && <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>}
        {name === "chat" && <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9 9 0 0 1-4-.9L4 20l1-4a7.2 7.2 0 0 1-1-4.5A7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/><path d="M8 11h8M8 14h5"/></>}
        {name === "phone" && <path d="M7 3h3l1.4 4-2.1 1.4a12 12 0 0 0 6.3 6.3l1.4-2.1 4 1.4v3a2 2 0 0 1-2.2 2C11 18.4 5.6 13 5 5.2A2 2 0 0 1 7 3Z"/>}
        {name === "people" && <><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.7M17 14.5a5.5 5.5 0 0 1 3.5 5"/></>}
        {name === "settings" && <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.2 1-.9 1.7-1.5-.4a8 8 0 0 1-1.5.9l-.3 1.6h-2l-.4-1.5a8 8 0 0 1-1.7 0l-.5 1.5h-2l-.3-1.6a8 8 0 0 1-1.5-.9l-1.5.4-.9-1.7 1.2-1a8 8 0 0 1-.2-1.7l-1.4-.7.5-1.9 1.6.1a8 8 0 0 1 1-1.4l-.6-1.5 1.6-1.1 1.2 1a8 8 0 0 1 1.7-.3l.6-1.5 1.9.5-.1 1.6a8 8 0 0 1 1.4 1l1.5-.6 1.1 1.6-1 1.2c.2.6.3 1.1.3 1.7l1.5.6-.5 1.9-1.6-.1a8 8 0 0 1-1 1.4Z"/></>}
    </svg>;
}

export function DashboardNavigation() {
    const pathname = usePathname();
    const { conversations, reload } = useConversations();
    const [unseenMissed, setUnseenMissed] = useState(0);
    const unreadMessages = conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0);

    const refreshMissedCalls = useCallback(async () => {
        try {
            const result = await listCalls(100);
            const seen = new Set<string>(JSON.parse(localStorage.getItem(MISSED_SEEN_KEY) || "[]"));
            const missed = result.data.filter((entry) => entry.call.state === "missed" || entry.participant.state === "missed");
            setUnseenMissed(missed.filter((entry) => !seen.has(entry.call.id)).length);
            if (pathname.startsWith("/dashboard/calls")) {
                localStorage.setItem(MISSED_SEEN_KEY, JSON.stringify(missed.map((entry) => entry.call.id)));
                setUnseenMissed(0);
            }
        } catch { /* Auth and network failures are handled by the page shell. */ }
    }, [pathname]);

    useEffect(() => {
        void refreshMissedCalls();
        const timer = window.setInterval(() => { void refreshMissedCalls(); void reload(); }, 30000);
        return () => window.clearInterval(timer);
    }, [refreshMissedCalls, reload]);

    useEffect(() => {
        const count = unreadMessages + unseenMissed;
        const app = navigator as Navigator & { setAppBadge?: (value?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
        if (count > 0) void app.setAppBadge?.(count).catch(() => undefined);
        else void app.clearAppBadge?.().catch(() => undefined);
    }, [unreadMessages, unseenMissed]);

    function badgeCount(href: string) {
        if (href === "/dashboard/conversations") return unreadMessages;
        if (href === "/dashboard/calls") return unseenMissed;
        return 0;
    }

    const linkClass = (href: string) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-blue-50 text-[#0971ED]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`;
    };

    return <>
        <nav aria-label="Main navigation" className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] md:flex">
            {items.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined} className={linkClass(item.href)}>{item.label}<Badge count={badgeCount(item.href)} /></Link>)}
            <Link href="/dashboard/video-processor-lab" className={linkClass("/dashboard/video-processor-lab")}>Face studio</Link>
        </nav>
        <motion.nav initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .24, ease: "easeOut" }} aria-label="Mobile navigation" className={`${pathname.startsWith("/dashboard/conversations/") ? "hidden" : "grid"} fixed inset-x-0 bottom-0 z-50 grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_32px_rgba(15,34,58,.08)] backdrop-blur-xl md:hidden`}>
            {items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[10px] font-semibold ${active ? "text-[#0971ED]" : "text-slate-500"}`}>
                    <span className={`relative flex h-7 w-9 items-center justify-center rounded-xl ${active ? "bg-blue-50" : ""}`}><NavIcon name={item.icon}/>{badgeCount(item.href) > 0 && <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#0971ED] px-1 text-[9px] font-bold text-white">{badgeCount(item.href) > 99 ? "99+" : badgeCount(item.href)}</span>}</span><span>{item.short}</span>
                </Link>;
            })}
        </motion.nav>
    </>;
}
