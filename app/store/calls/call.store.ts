import { create } from "zustand";

import {
    acceptCall as acceptCallRequest,
    cancelCall as cancelCallRequest,
    connectCall as connectCallRequest,
    createCall as createCallRequest,
    declineCall as declineCallRequest,
    endCall as endCallRequest,
    failCall as failCallRequest,
    getCall as getCallRequest,
    listCalls as listCallsRequest,
} from "@/app/services/call/calls.service";
import { ApiRequestError } from "@/app/lib/client";
import {
    CALL_STATE,
    TERMINAL_CALL_STATES,
} from "@/app/types/calls/calls.types";
import type {
    Call,
    CallParticipant,
    CallType,
} from "@/app/types/calls/calls.types";
import type { RealtimeServerEvent } from "@/app/types/realtime/realtime.types";
import { isRealtimeCallEvent } from "@/app/types/realtime/realtime.types";

type CallStoreState = {
    activeCall: Call | null;
    participants: CallParticipant[];
    isStarting: boolean;
    isHydrating: boolean;
    isActionPending: boolean;
    error: string | null;
    startCall: (input: {
        conversationId: string;
        calleeId: string;
        type: CallType;
    }) => Promise<void>;
    hydrateActiveCall: () => Promise<void>;
    accept: () => Promise<void>;
    decline: () => Promise<void>;
    cancel: () => Promise<void>;
    markConnected: () => Promise<void>;
    fail: () => Promise<void>;
    end: () => Promise<void>;
    applyRealtimeEvent: (event: RealtimeServerEvent) => void;
    clearError: () => void;
    reset: () => void;
};

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiRequestError || error instanceof Error) {
        return error.message;
    }

    return fallback;
}

export const useCallStore = create<CallStoreState>()((set, get) => ({
    activeCall: null,
    participants: [],
    isStarting: false,
    isHydrating: false,
    isActionPending: false,
    error: null,

    startCall: async ({ conversationId, calleeId, type }) => {
        const current = get().activeCall;
        if (current && !TERMINAL_CALL_STATES.has(current.state)) {
            set({ error: "You are already in a call." });
            return;
        }

        set({ isStarting: true, error: null });
        try {
            const created = await createCallRequest({
                conversationId,
                calleeId,
                type,
            });
            const details = await getCallRequest(created.data.id);
            const realtimeCall = get().activeCall;

            set({
                activeCall:
                    realtimeCall?.id === created.data.id
                        ? realtimeCall
                        : details.data.call,
                participants:
                    realtimeCall?.id === created.data.id &&
                    get().participants.length > 0
                        ? get().participants
                        : details.data.participants,
                isStarting: false,
                error: null,
            });
        } catch (error) {
            set({
                isStarting: false,
                error: getErrorMessage(error, "Unable to start the call."),
            });
        }
    },

    hydrateActiveCall: async () => {
        if (get().isHydrating) return;
        set({ isHydrating: true });

        try {
            const response = await listCallsRequest(20);
            const active = response.data.find(
                (item) => !TERMINAL_CALL_STATES.has(item.call.state),
            );

            if (!active) {
                const current = get().activeCall;
                if (!current || TERMINAL_CALL_STATES.has(current.state)) {
                    set({ activeCall: null, participants: [] });
                }
                return;
            }

            const details = await getCallRequest(active.call.id);
            set({
                activeCall: details.data.call,
                participants: details.data.participants,
                error: null,
            });
        } catch (error) {
            console.warn("[Calls] Active-call reconciliation failed:", error);
        } finally {
            set({ isHydrating: false });
        }
    },

    accept: async () => {
        const call = get().activeCall;
        if (!call || call.state !== CALL_STATE.RINGING) return;

        set({ isActionPending: true, error: null });
        try {
            const response = await acceptCallRequest(call.id);
            set({ activeCall: response.data });
        } catch (error) {
            set({ error: getErrorMessage(error, "Unable to accept the call.") });
        } finally {
            set({ isActionPending: false });
        }
    },

    decline: async () => {
        const call = get().activeCall;
        if (!call) return;

        set({ isActionPending: true, error: null });
        try {
            const response = await declineCallRequest(call.id);
            set({ activeCall: response.data });
        } catch (error) {
            set({ error: getErrorMessage(error, "Unable to decline the call.") });
        } finally {
            set({ isActionPending: false });
        }
    },

    cancel: async () => {
        const call = get().activeCall;
        if (!call) return;

        set({ isActionPending: true, error: null });
        try {
            const response = await cancelCallRequest(call.id);
            set({ activeCall: response.data });
        } catch (error) {
            set({ error: getErrorMessage(error, "Unable to cancel the call.") });
        } finally {
            set({ isActionPending: false });
        }
    },

    markConnected: async () => {
        const call = get().activeCall;
        if (!call || call.state !== CALL_STATE.ACCEPTED) return;

        try {
            const response = await connectCallRequest(call.id);
            if (get().activeCall?.id === call.id) {
                set({ activeCall: response.data });
            }
        } catch (error) {
            set({ error: getErrorMessage(error, "Unable to update call status.") });
        }
    },

    fail: async () => {
        const call = get().activeCall;
        if (!call) return;

        try {
            const response = await failCallRequest(call.id);
            set({ activeCall: response.data });
        } catch (error) {
            set({ error: getErrorMessage(error, "The call could not be connected.") });
        }
    },

    end: async () => {
        const call = get().activeCall;
        if (!call) return;

        set({ isActionPending: true, error: null });
        try {
            const response = await endCallRequest(call.id);
            set({ activeCall: response.data });
        } catch (error) {
            set({ error: getErrorMessage(error, "Unable to end the call.") });
        } finally {
            set({ isActionPending: false });
        }
    },

    applyRealtimeEvent: (event) => {
        if (!isRealtimeCallEvent(event)) return;

        const current = get().activeCall;
        if (
            current &&
            current.id !== event.call.id &&
            !TERMINAL_CALL_STATES.has(current.state)
        ) {
            return;
        }

        set({
            activeCall: event.call,
            participants: event.participants,
            isStarting: false,
            isActionPending: false,
            error: null,
        });
    },

    clearError: () => set({ error: null }),
    reset: () =>
        set({
            activeCall: null,
            participants: [],
            isStarting: false,
            isActionPending: false,
            error: null,
        }),
}));
