"use client";

import { useMemo } from "react";

import { useAuth } from "@/app/hooks/auth/useAuth";
import {
    CALL_PARTICIPANT_ROLE,
    CALL_STATE,
    TERMINAL_CALL_STATES,
} from "@/app/types/calls/calls.types";
import { useCallStore } from "@/app/store/calls/call.store";

export function useActiveCall() {
    const { user } = useAuth();

    const activeCall = useCallStore((state) => state.activeCall);
    const participants = useCallStore((state) => state.participants);
    const isStarting = useCallStore((state) => state.isStarting);
    const isActionPending = useCallStore((state) => state.isActionPending);
    const error = useCallStore((state) => state.error);

    return useMemo(() => {
        if (!activeCall || !user) {
            return {
                activeCall: null,
                myParticipant: null,
                otherParticipant: null,
                isIncoming: false,
                isOutgoing: false,
                isAccepted: false,
                isConnected: false,
                isTerminal: false,
                isStarting,
                isActionPending,
                error,
            };
        }

        const myParticipant =
            participants.find((participant) => participant.userId === user.id) ??
            null;

        const otherParticipant =
            participants.find((participant) => participant.userId !== user.id) ??
            null;

        const pendingState =
            activeCall.state === CALL_STATE.INITIATING ||
            activeCall.state === CALL_STATE.RINGING;

        const isIncoming =
            myParticipant?.role === CALL_PARTICIPANT_ROLE.CALLEE &&
            pendingState;

        const isOutgoing =
            myParticipant?.role === CALL_PARTICIPANT_ROLE.CALLER &&
            pendingState;

        return {
            activeCall,
            myParticipant,
            otherParticipant,
            isIncoming,
            isOutgoing,
            isAccepted: activeCall.state === CALL_STATE.ACCEPTED,
            isConnected: activeCall.state === CALL_STATE.CONNECTED,
            isTerminal: TERMINAL_CALL_STATES.has(activeCall.state),
            isStarting,
            isActionPending,
            error,
        };
    }, [
        activeCall,
        participants,
        user,
        isStarting,
        isActionPending,
        error,
    ]);
}
