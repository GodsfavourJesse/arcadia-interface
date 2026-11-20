"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/auth/useAuth";
import { useConversations } from "@/app/hooks/conversations/useConversations";

export default function DashboardPage() {
    const router = useRouter();
    const { user, isHydrated, isLoading, logout } = useAuth();
    const { conversations, isLoading: chatsLoading } = useConversations();

    useEffect(() => { if (isHydrated && !user) router.replace("/login"); }, [isHydrated, user, router]);
    if (!isHydrated || isLoading) return <main className="grid min-h-[60vh] place-items-center text-sm text-slate-500">Opening your workspace…</main>;
    if (!user) return null;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    return <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#075bc5] via-[#0971ED] to-[#2BC6FF] p-6 text-white shadow-xl shadow-blue-900/10 sm:p-10">
            <div className="pointer-events-none absolute -right-14 -top-24 h-80 w-80 rounded-full border border-white/15"/><div className="pointer-events-none absolute -right-4 -top-14 h-60 w-60 rounded-full border border-white/15"/>
            <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end"><div className="max-w-2xl"><p className="text-sm font-medium text-white/75">Your communication workspace</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">{greeting}, {user.displayName.split(" ")[0]}.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/80 sm:text-base">Make room for the conversations that matter. Send a message or bring everyone face-to-face.</p></div><div className="flex flex-wrap gap-3"><Link href="/dashboard/conversations" className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0971ED] shadow-sm transition hover:bg-blue-50">Open messages</Link><Link href="/dashboard/calls/new" className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">Start a call</Link></div></div>
        </section>
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.85fr)]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><h2 className="font-semibold text-slate-900">Recent conversations</h2><p className="mt-1 text-xs text-slate-500">Pick up where you left off.</p></div><Link href="/dashboard/conversations" className="text-xs font-semibold text-[#0971ED] hover:underline">View all</Link></header>
                {chatsLoading ? <p className="p-6 text-sm text-slate-500">Loading conversations…</p> : conversations.length ? <div>{conversations.slice(0, 5).map((conversation) => <Link key={conversation.id} href={`/dashboard/conversations/${conversation.id}`} className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 transition last:border-0 hover:bg-slate-50 sm:px-6"><span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 font-semibold text-[#0971ED]">{conversation.participant?.profilePictureUrl ? <img src={conversation.participant.profilePictureUrl} alt="" className="h-full w-full object-cover"/> : conversation.participant?.displayName?.[0]?.toUpperCase() ?? "M"}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{conversation.participant?.displayName ?? "Conversation"}</strong><small className="mt-1 block truncate text-xs text-slate-500">{conversation.lastMessage?.body ?? "Start a conversation"}</small></span>{conversation.unreadCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0971ED] px-1 text-[10px] font-bold text-white">{conversation.unreadCount}</span>}</Link>)}</div> : <div className="px-6 py-12 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl text-[#0971ED]">◌</span><p className="mt-4 font-medium text-slate-800">Your chats will live here</p><p className="mt-1 text-sm text-slate-500">Find a person and start your first conversation.</p><Link href="/dashboard/discover" className="mt-4 inline-flex text-sm font-semibold text-[#0971ED]">Discover people →</Link></div>}
            </section>
            <aside className="space-y-5">
                <Link href="/dashboard/calls" className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#0971ED]">⌕</span><h2 className="mt-4 font-semibold text-slate-900">Call history</h2><p className="mt-1 text-sm leading-6 text-slate-500">Review recent and missed calls, then reconnect with one tap.</p><span className="mt-4 inline-flex text-sm font-semibold text-[#0971ED]">View calls <span className="ml-1 transition group-hover:translate-x-1">→</span></span></Link>
                <Link href="/dashboard/video-processor-lab" className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-sky-600">✦</span><h2 className="mt-4 font-semibold text-slate-900">Face studio</h2><p className="mt-1 text-sm leading-6 text-slate-500">Prepare your expressive look before you join a video conversation.</p><span className="mt-4 inline-flex text-sm font-semibold text-[#0971ED]">Open studio <span className="ml-1 transition group-hover:translate-x-1">→</span></span></Link>
                <button type="button" onClick={async () => { await logout(); router.replace("/login"); }} className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 text-left text-sm font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">Sign out of Miyor</button>
            </aside>
        </div>
    </main>;
}
