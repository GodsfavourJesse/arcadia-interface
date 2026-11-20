export default function ConversationsPage() {
    return <div className="hidden h-full flex-col items-center justify-center px-8 text-center md:flex">
        <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-blue-100 to-cyan-100 text-4xl text-[#0971ED]">◌</div>
        <h2 className="mt-6 text-xl font-semibold text-slate-900">A little closer, wherever you are.</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Choose a conversation to pick up where you left off, or find someone new to connect with.</p>
        <p className="mt-12 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-400">Your personal conversations stay in sync across devices</p>
    </div>;
}
