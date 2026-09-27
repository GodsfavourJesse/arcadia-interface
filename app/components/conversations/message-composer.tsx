"use client";

import {
    FormEvent,
    useState,
} from "react";

type MessageComposerProps = {
    onSend: (
        message: string,
    ) => Promise<void>;

    isSending: boolean;
};

export function MessageComposer({
    onSend,
    isSending,
}: MessageComposerProps) {
    const [
        message,
        setMessage,
    ] = useState("");

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const trimmed =
            message.trim();

        if (!trimmed || isSending) {
            return;
        }

        await onSend(trimmed);

        setMessage("");
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="border-t border-slate-200 bg-white p-4"
        >
            <div className="flex items-end gap-3">
                <textarea
                    value={message}
                    onChange={(event) =>
                        setMessage(
                            event.target.value,
                        )
                    }
                    placeholder="Write a message..."
                    rows={1}
                    maxLength={5000}
                    className="min-h-11 flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    onKeyDown={(event) => {
                        if (
                            event.key === "Enter" &&
                            !event.shiftKey
                        ) {
                            event.preventDefault();

                            void handleSubmit(
                                event as unknown as FormEvent<HTMLFormElement>,
                            );
                        }
                    }}
                />

                <button
                    type="submit"
                    disabled={
                        isSending ||
                        !message.trim()
                    }
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSending
                        ? "Sending..."
                        : "Send"}
                </button>
            </div>
        </form>
    );
}