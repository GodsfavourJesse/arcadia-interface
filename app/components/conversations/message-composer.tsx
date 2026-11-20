"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Message } from "@/app/types/conversations/conversations.types";

type MessageComposerProps = {
    onSend: (message: string, replyToMessageId?: string) => Promise<void>;
    isSending: boolean;
    replyTo?: Message | null;
    editing?: Message | null;
    onCancelContext?: () => void;
    onEdit?: (messageId: string, body: string) => Promise<void>;
};

export function MessageComposer({ onSend, isSending, replyTo, editing, onCancelContext, onEdit }: MessageComposerProps) {
    const [message, setMessage] = useState("");
    useEffect(() => setMessage(editing?.body ?? ""), [editing?.id, editing?.body]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const trimmed = message.trim();
        if (!trimmed || isSending) return;
        try {
            if (editing && onEdit) await onEdit(editing.id, trimmed);
            else await onSend(trimmed, replyTo?.id);
            setMessage("");
            onCancelContext?.();
        } catch {
            // The conversation surface displays the request error.
        }
    }

    return <form onSubmit={handleSubmit} className="border-t border-[var(--miyor-border)] bg-white p-4">
        {(replyTo || editing) && <div className="mb-3 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-xs text-slate-600"><span>{editing ? "Editing message" : <>Replying to <strong>{replyTo?.sender.displayName}</strong>: {replyTo?.body}</>}</span><button type="button" onClick={onCancelContext} className="font-semibold text-[#0971ED]">Cancel</button></div>}
        <div className="flex items-end gap-3"><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message…" rows={1} maxLength={5000} className="min-h-11 flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0971ED] focus:ring-2 focus:ring-blue-100" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSubmit(event as unknown as FormEvent<HTMLFormElement>); } }} />
            <button type="submit" disabled={isSending || !message.trim()} className="rounded-xl bg-[#0971ED] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#075fc8] disabled:cursor-not-allowed disabled:opacity-50">{isSending ? "Sending…" : editing ? "Save" : "Send"}</button></div>
    </form>;
}
