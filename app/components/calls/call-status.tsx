"use client";

import {
    CALL_STATE,
    CALL_TYPE,
} from "@/app/types/calls/calls.types";

type Props = {
    state: string;
    type: string;
    isIncoming?: boolean;
    isOutgoing?: boolean;
};

export function CallStatus({
    state,
    type,
    isIncoming = false,
    isOutgoing = false,
}: Props) {
    const typeLabel =
        type === CALL_TYPE.VIDEO
            ? "video"
            : "voice";

    if (
        isIncoming &&
        state === CALL_STATE.RINGING
    ) {
        return (
            <p className="text-sm text-white/65">
                Incoming {typeLabel} call
            </p>
        );
    }

    if (
        isOutgoing &&
        state === CALL_STATE.INITIATING
    ) {
        return (
            <p className="text-sm text-white/65">
                Starting call…
            </p>
        );
    }

    if (
        isOutgoing &&
        state === CALL_STATE.RINGING
    ) {
        return (
            <p className="text-sm text-white/65">
                Ringing…
            </p>
        );
    }

    if (
        state === CALL_STATE.ACCEPTED
    ) {
        return (
            <p className="text-sm text-white/65">
                Accepted • connecting…
            </p>
        );
    }

    if (
        state === CALL_STATE.CONNECTED
    ) {
        return (
            <p className="text-sm text-emerald-300">
                Connected
            </p>
        );
    }

    if (
        state === CALL_STATE.DECLINED
    ) {
        return (
            <p className="text-sm text-white/65">
                Call declined
            </p>
        );
    }

    if (
        state === CALL_STATE.CANCELLED
    ) {
        return (
            <p className="text-sm text-white/65">
                Call cancelled
            </p>
        );
    }

    if (
        state === CALL_STATE.MISSED
    ) {
        return (
            <p className="text-sm text-white/65">
                Missed call
            </p>
        );
    }

    if (
        state === CALL_STATE.ENDED
    ) {
        return (
            <p className="text-sm text-white/65">
                Call ended
            </p>
        );
    }

    if (
        state === CALL_STATE.FAILED
    ) {
        return (
            <p className="text-sm text-red-300">
                Call failed
            </p>
        );
    }

    return (
        <p className="text-sm text-white/65">
            {typeLabel} call
        </p>
    );
}