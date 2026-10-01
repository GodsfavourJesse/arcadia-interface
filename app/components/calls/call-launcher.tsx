"use client";

import { useCallStore } from "@/app/store/calls/call.store";
import { CALL_TYPE, TERMINAL_CALL_STATES, type CallType } from "@/app/types/calls/calls.types";

function PhoneIcon() {
    return (
        <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            aria-hidden="true"
        >
            <path
                d="M6.5 4.5h3l1.5 4-2.2 1.3a11.3 11.3 0 0 0 5.4 5.4l1.3-2.2 4 1.5v3a2 2 0 0 1-2.2 2C10.1 19.5 4.5 13.9 4.5 6.7a2 2 0 0 1 2-2.2Z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function VideoIcon() {
    return (
        <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            aria-hidden="true"
        >
            <rect x="3.5" y="6" width="12" height="12" rx="2.5" />
            <path
                d="m15.5 10 5-2.7v9.4l-5-2.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

type Props = {
    conversationId: string;
    calleeId: string;
    type: CallType;
    disabled?: boolean;
    label?: string;
    compact?: boolean;
};

export function CallLauncher({
    conversationId,
    calleeId,
    type,
    disabled = false,
    label,
    compact = false,
}: Props) {
    const startCall = useCallStore((state) => state.startCall);
    const isStarting = useCallStore((state) => state.isStarting);
    const activeCall = useCallStore((state) => state.activeCall);

    const isDisabled =
        disabled ||
        isStarting ||
        Boolean(
            activeCall &&
            !TERMINAL_CALL_STATES.has(
                activeCall.state,
            ),
        );

    const Icon = type === CALL_TYPE.VIDEO ? VideoIcon : PhoneIcon;

    return (
        <button
            type="button"
            disabled={isDisabled}
            onClick={() =>
                void startCall({
                    conversationId,
                    calleeId,
                    type,
                })
            }
            className={
                compact
                    ? "inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    : "inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            }
            aria-label={label}
            title={label}
        >
            <Icon />
            {!compact && <span>{label ?? "Call"}</span>}
        </button>
    );
}
