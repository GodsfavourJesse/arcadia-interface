"use client";

import Link from "next/link";
import { ReactNode, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useConversations } from "@/app/hooks/conversations/useConversations";
import { motion } from "framer-motion";

export default function ConversationsLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { conversations, isLoading } = useConversations();
    const [query, setQuery] = useState("");
    const selectedId = pathname.split("/")[3];
    const filtered = useMemo(() => conversations.filter((item) => (item.participant?.displayName ?? "").toLowerCase().includes(query.toLowerCase()) || (item.participant?.username ?? "").toLowerCase().includes(query.toLowerCase())), [conversations, query]);
    const hasSelection = Boolean(selectedId);

    return <main className="mx-auto grid h-[calc(100dvh-68px)] w-full max-w-[1440px] grid-cols-1 overflow-hidden bg-white md:grid-cols-[350px_minmax(0,1fr)] lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className={`${hasSelection ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-slate-200 bg-white`}>
            <header className="border-b border-slate-100 px-5 pb-4 pt-5">
                <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#0971ED]">MIYOR</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Chats</h1></div><Link href="/dashboard/discover" aria-label="Start a new conversation" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-xl font-medium text-[#0971ED] transition hover:bg-blue-100">＋</Link></div>
                <label className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5"><span className="text-slate-400">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" className="w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0" /></label>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
                {isLoading && <p className="p-5 text-sm text-slate-400">Loading your conversations…</p>}
                {!isLoading && filtered.length === 0 && <div className="px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-[#0971ED]">◌</div><h2 className="mt-4 font-semibold text-slate-900">{query ? "No matches" : "Your conversations start here"}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Find someone you know and begin a private conversation.</p><Link href="/dashboard/discover" className="mt-5 inline-flex rounded-xl bg-[#0971ED] px-4 py-2.5 text-sm font-semibold text-white">Find people</Link></div>}
                {filtered.map((conversation) => {
                    const person = conversation.participant;
                    const active = selectedId === conversation.id;
                    return <motion.div layout key={conversation.id} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}><Link href={`/dashboard/conversations/${conversation.id}`} className={`flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 transition ${active ? "bg-blue-50/80" : "hover:bg-slate-50"}`}>
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 font-semibold text-[#0971ED]">{person?.profilePictureUrl ? <img src={person.profilePictureUrl} alt="" className="h-full w-full object-cover"/> : (person?.displayName?.[0] ?? "?").toUpperCase()}</div>
                        <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold text-slate-900">{person?.displayName ?? "Miyor contact"}</p><time className="shrink-0 text-[10px] text-slate-400">{conversation.lastMessage ? new Date(conversation.lastMessage.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}</time></div><div className="mt-1 flex items-center justify-between gap-2"><p className="truncate text-xs text-slate-500">{conversation.lastMessage?.body || "Start a conversation"}</p>{conversation.unreadCount > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#0971ED] px-1 text-[10px] font-bold text-white">{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</span>}</div></div>
                    </Link></motion.div>;
                })}
            </div>
        </aside>
        <section className={`${hasSelection ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col bg-slate-50`}>{children}</section>
    </main>;
}
