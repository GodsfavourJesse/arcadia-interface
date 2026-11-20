"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listCalls } from "@/app/services/call/calls.service";
import type { CallWithOwnParticipant } from "@/app/types/calls/calls.types";
import { useAuth } from "@/app/hooks/auth/useAuth";
import { useRouter } from "next/navigation";
import { useConversations } from "@/app/hooks/conversations/useConversations";

export default function CallHistoryPage() {
    const [calls, setCalls] = useState<CallWithOwnParticipant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, isHydrated } = useAuth();
    const router = useRouter();
    const { conversations } = useConversations();

    useEffect(() => {
        if (isHydrated && !user) router.replace("/login");
    }, [isHydrated, user, router]);

    useEffect(() => {
        let active = true;
        void listCalls(100).then((response) => { if (active) setCalls(response.data); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Call history could not be loaded."); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const missed = calls.filter((entry) => entry.call.state === "missed" || entry.participant.state === "missed");
    const recent = calls.filter((entry) => !missed.some((item) => item.call.id === entry.call.id));
    const row = (entry: CallWithOwnParticipant) => <div key={entry.call.id} className="flex items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-0 sm:px-6"><span className={`flex h-11 w-11 items-center justify-center rounded-full ${entry.call.state === "missed" || entry.participant.state === "missed" ? "bg-red-50 text-red-500" : "bg-blue-50 text-[#0971ED]"}`}>{entry.call.type === "video" ? "▣" : "⌕"}</span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{conversations.find((conversation) => conversation.id === entry.call.conversationId)?.participant?.displayName ?? (entry.call.type === "video" ? "Video call" : "Voice call")}</p><p className="mt-1 text-xs text-slate-500">{entry.call.type === "video" ? "Video" : "Voice"} · {entry.call.state === "missed" || entry.participant.state === "missed" ? "Missed" : entry.call.state.charAt(0).toUpperCase() + entry.call.state.slice(1)} · {new Date(entry.call.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p></div><Link href={`/dashboard/conversations/${entry.call.conversationId}`} className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-[#0971ED] hover:bg-blue-50">Call back</Link></div>;

    return <main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-8 sm:py-10"><header className="mb-7"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0971ED]">YOUR ACTIVITY</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Calls</h1><p className="mt-2 text-sm text-slate-500">Recent and missed conversations, together in one place.</p></header>
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Missed calls <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">{missed.length}</span></h2></div>{loading ? <p className="p-6 text-sm text-slate-500">Loading calls…</p> : missed.length ? missed.map(row) : <p className="px-5 py-7 text-sm text-slate-500">You’re all caught up. Missed calls will appear here.</p>}</section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Recent calls</h2></div>{loading ? <p className="p-6 text-sm text-slate-500">Loading calls…</p> : recent.length ? recent.map(row) : <p className="px-5 py-7 text-sm text-slate-500">Your recent calls will appear here.</p>}</section>
    </main>;
}
