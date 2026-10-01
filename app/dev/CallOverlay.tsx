"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useActiveCall,
} from "@/app/hooks/calls/useActiveCall";

import {
    useCallStore,
} from "@/app/store/calls/calls.store";

import {
    CALL_STATE,
} from "@/app/types/calls/calls.types";

function formatDuration(
    totalSeconds: number,
) {
    const minutes = Math.floor(
        totalSeconds / 60,
    )
        .toString()
        .padStart(2, "0");

    const seconds = Math.floor(
        totalSeconds % 60,
    )
        .toString()
        .padStart(2, "0");

    return `${minutes}:${seconds}`;
}

/*
 * TODO: participant records only carry `userId`, not a display
 * name or avatar — there's no users-lookup service wired in yet
 * on the frontend. Once you have one (e.g. something like
 * `getUserById(userId)` alongside your discover/contacts
 * services), replace this with a real lookup, ideally cached so
 * the overlay doesn't refetch on every render.
 */
function useOtherPartyLabel(
    userId: string | undefined,
) {
    return userId
        ? "Miyor user"
        : "Unknown";
}

export function CallOverlay() {
    const {
        activeCall,
        otherParticipant,
        isIncoming,
        isOutgoing,
        isConnected,
        isTerminal,
    } = useActiveCall();

    const accept = useCallStore(
        (state) => state.accept,
    );

    const decline = useCallStore(
        (state) => state.decline,
    );

    const cancel = useCallStore(
        (state) => state.cancel,
    );

    const end = useCallStore(
        (state) => state.end,
    );

    const markConnected =
        useCallStore(
            (state) =>
                state.markConnected,
        );

    const otherName =
        useOtherPartyLabel(
            otherParticipant?.userId,
        );

    const [elapsedSeconds, setElapsedSeconds] =
        useState(0);

    const connectedAtRef =
        useRef<number | null>(null);

    /*
     * Signaling-only stand-in for now: once both sides have
     * accepted, immediately mark the call connected. Real media
     * negotiation (WebRTC offer/answer/ICE exchange) plugs in
     * right here in the next phase — this is a deliberate,
     * clearly-marked placeholder, not the final behavior.
     */
    useEffect(() => {
        if (
            activeCall?.state ===
            CALL_STATE.ACCEPTED
        ) {
            void markConnected();
        }
    }, [
        activeCall?.state,
        markConnected,
    ]);

    useEffect(() => {
        if (!isConnected) {
            connectedAtRef.current =
                null;

            setElapsedSeconds(0);

            return;
        }

        if (
            connectedAtRef.current ===
            null
        ) {
            connectedAtRef.current =
                Date.now();
        }

        const intervalId =
            setInterval(() => {
                if (
                    connectedAtRef.current !==
                    null
                ) {
                    setElapsedSeconds(
                        Math.floor(
                            (Date.now() -
                                connectedAtRef.current) /
                                1000,
                        ),
                    );
                }
            }, 1000);

        return () =>
            clearInterval(intervalId);
    }, [isConnected]);

    if (!activeCall) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-2xl font-semibold text-slate-600">
                    {otherName
                        .charAt(0)
                        .toUpperCase()}
                </div>

                <h2 className="mt-5 text-lg font-semibold text-slate-900">
                    {otherName}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    {isIncoming &&
                        `Incoming ${activeCall.type} call...`}

                    {isOutgoing &&
                        activeCall.state ===
                            CALL_STATE.INITIATING &&
                        "Calling..."}

                    {isOutgoing &&
                        activeCall.state ===
                            CALL_STATE.RINGING &&
                        "Ringing..."}

                    {isConnected &&
                        formatDuration(
                            elapsedSeconds,
                        )}

                    {activeCall.state ===
                        CALL_STATE.DECLINED &&
                        "Call declined"}

                    {activeCall.state ===
                        CALL_STATE.CANCELLED &&
                        "Call cancelled"}

                    {activeCall.state ===
                        CALL_STATE.MISSED &&
                        "Missed call"}

                    {activeCall.state ===
                        CALL_STATE.ENDED &&
                        "Call ended"}

                    {activeCall.state ===
                        CALL_STATE.FAILED &&
                        "Call failed"}
                </p>

                <div className="mt-8 flex items-center justify-center gap-4">
                    {isIncoming && (
                        <>
                            <button
                                type="button"
                                onClick={() =>
                                    void decline()
                                }
                                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-xl text-white shadow-lg transition hover:bg-red-600"
                                aria-label="Decline"
                            >
                                ✕
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    void accept()
                                }
                                className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-xl text-white shadow-lg transition hover:bg-green-600"
                                aria-label="Accept"
                            >
                                ✓
                            </button>
                        </>
                    )}

                    {isOutgoing && (
                        <button
                            type="button"
                            onClick={() =>
                                void cancel()
                            }
                            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-xl text-white shadow-lg transition hover:bg-red-600"
                            aria-label="Cancel"
                        >
                            ✕
                        </button>
                    )}

                    {isConnected && (
                        <button
                            type="button"
                            onClick={() =>
                                void end()
                            }
                            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-xl text-white shadow-lg transition hover:bg-red-600"
                            aria-label="End call"
                        >
                            ✕
                        </button>
                    )}

                    {isTerminal && (
                        <p className="text-xs text-slate-400">
                            Closing...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}