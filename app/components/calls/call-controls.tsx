"use client";

import {
    CALL_STATE,
    CALL_TYPE,
} from "@/app/types/calls/calls.types";

type Props = {
    state: string;
    type: string;

    isIncoming: boolean;
    isOutgoing: boolean;
    isAccepted: boolean;
    isConnected: boolean;

    isActionPending: boolean;

    onAccept: () => void;
    onDecline: () => void;
    onCancel: () => void;
    onEnd: () => void;
};

function PhoneIcon() {
    return (
        <svg
            className="h-6 w-6"
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

function XIcon() {
    return (
        <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
        >
            <path
                d="m7 7 10 10M17 7 7 17"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function CallControls({
    state,
    type,
    isIncoming,
    isOutgoing,
    isAccepted,
    isConnected,
    isActionPending,
    onAccept,
    onDecline,
    onCancel,
    onEnd,
}: Props) {
    if (isIncoming) {
        return (
            <div className="flex items-center justify-center gap-8">
                <button
                    type="button"
                    onClick={onDecline}
                    disabled={isActionPending}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-950/30 transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Decline call"
                >
                    <XIcon />
                </button>

                <button
                    type="button"
                    onClick={onAccept}
                    disabled={isActionPending}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={
                        type === CALL_TYPE.VIDEO
                            ? "Accept video call"
                            : "Accept voice call"
                    }
                >
                    {isActionPending ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                        <PhoneIcon />
                    )}
                </button>
            </div>
        );
    }

    if (isOutgoing) {
        return (
            <div className="flex justify-center">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isActionPending}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-950/30 transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Cancel call"
                >
                    <XIcon />
                </button>
            </div>
        );
    }

    /*
     * Accepted but WebRTC has not connected yet.
     *
     * There is deliberately NO button here.
     * WebRTC negotiation starts automatically.
     */
    if (
        isAccepted &&
        !isConnected
    ) {
        return (
            <div className="flex items-center justify-center">
                <button
                    type="button"
                    onClick={onEnd}
                    disabled={isActionPending}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/90 text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="End call"
                >
                    <XIcon />
                </button>
            </div>
        );
    }

    if (isConnected) {
        return (
            <div className="flex items-center justify-center">
                <button
                    type="button"
                    onClick={onEnd}
                    disabled={isActionPending}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-400 disabled:opacity-50"
                    aria-label="End call"
                >
                    <XIcon />
                </button>
            </div>
        );
    }

    if (state === CALL_STATE.ENDED) {
        return null;
    }

    return null;
}