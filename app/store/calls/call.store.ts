import { create } from "zustand";

import {
    acceptCall as acceptCallRequest,
    cancelCall as cancelCallRequest,
    connectCall as connectCallRequest,
    createCall as createCallRequest,
    declineCall as declineCallRequest,
    endCall as endCallRequest,
} from "@/app/services/calls.service";

import { ApiRequestError } from "@/app/lib/client";

import {
    CALL_STATE,
    TERMINAL_CALL_STATES,
} from "@/app/types/calls/calls.types";

import type {
    Call,
    CallParticipant,
    CallRealtimeEvent,
    CallType,
} from "@/app/types/calls/calls.types";

type CallStoreState = {
    activeCall: Call | null;
    participants: CallParticipant[];

    isStarting: boolean;
    isActionPending: boolean;

    error: string | null;

    startCall: (input: {
        conversationId: string;
        calleeId: string;
        type: CallType;
    }) => Promise<void>;

    accept: () => Promise<void>;
    decline: () => Promise<void>;
    cancel: () => Promise<void>;

    markConnected: () => Promise<void>;

    end: () => Promise<void>;

    applyRealtimeEvent: (
        event: CallRealtimeEvent,
    ) => void;

    clearError: () => void;

    reset: () => void;
};

function errorMessage(
    error: unknown,
    fallback: string,
) {
    if (
        error instanceof ApiRequestError ||
        error instanceof Error
    ) {
        return error.message;
    }

    return fallback;
}

async function runAction(
    action: () => Promise<unknown>,
    set: (
        partial:
            | Partial<CallStoreState>
            | ((
                  state: CallStoreState,
              ) => Partial<CallStoreState>),
    ) => void,
    fallback: string,
) {
    set({
        isActionPending: true,
        error: null,
    });

    try {
        await action();
    } catch (error) {
        set({
            error: errorMessage(
                error,
                fallback,
            ),
        });
    } finally {
        set({
            isActionPending: false,
        });
    }
}

export const useCallStore =
    create<CallStoreState>(
        (set, get) => ({
            activeCall: null,

            participants: [],

            isStarting: false,

            isActionPending: false,

            error: null,

            startCall: async (input) => {
                const current =
                    get().activeCall;

                if (
                    current &&
                    !TERMINAL_CALL_STATES.has(
                        current.state,
                    )
                ) {
                    set({
                        error:
                            "You are already in a call.",
                    });

                    return;
                }

                set({
                    isStarting: true,
                    error: null,
                });

                try {
                    const response =
                        await createCallRequest(
                            input,
                        );

                    const returnedCall =
                        response.data;

                    /*
                     * CALL_CREATED/CALL_RINGING may
                     * arrive before the REST response.
                     */
                    const realtimeCall =
                        get().activeCall;

                    if (
                        realtimeCall?.id ===
                            returnedCall.id &&
                        get().participants
                            .length > 0
                    ) {
                        set({
                            activeCall:
                                realtimeCall,
                            isStarting: false,
                        });

                        return;
                    }

                    set({
                        activeCall:
                            returnedCall,
                        participants:
                            get()
                                .participants,
                        isStarting: false,
                    });
                } catch (error) {
                    set({
                        isStarting: false,
                        error: errorMessage(
                            error,
                            "Unable to start the call.",
                        ),
                    });
                }
            },

            accept: async () => {
                const call =
                    get().activeCall;

                if (!call) {
                    return;
                }

                if (
                    call.state !==
                    CALL_STATE.RINGING
                ) {
                    return;
                }

                await runAction(
                    () =>
                        acceptCallRequest(
                            call.id,
                        ),
                    set,
                    "Unable to accept the call.",
                );
            },

            decline: async () => {
                const callId =
                    get().activeCall?.id;

                if (!callId) {
                    return;
                }

                await runAction(
                    () =>
                        declineCallRequest(
                            callId,
                        ),
                    set,
                    "Unable to decline the call.",
                );
            },

            cancel: async () => {
                const callId =
                    get().activeCall?.id;

                if (!callId) {
                    return;
                }

                await runAction(
                    () =>
                        cancelCallRequest(
                            callId,
                        ),
                    set,
                    "Unable to cancel the call.",
                );
            },

            /*
             * IMPORTANT:
             *
             * This method is ONLY called by
             * useWebRTC.onConnected().
             *
             * No button calls this anymore.
             */
            markConnected: async () => {
                const call =
                    get().activeCall;

                if (!call) {
                    return;
                }

                if (
                    call.state ===
                    CALL_STATE.CONNECTED
                ) {
                    return;
                }

                if (
                    call.state !==
                    CALL_STATE.ACCEPTED
                ) {
                    return;
                }

                await runAction(
                    () =>
                        connectCallRequest(
                            call.id,
                        ),
                    set,
                    "Unable to connect the call.",
                );
            },

            end: async () => {
                const callId =
                    get().activeCall?.id;

                if (!callId) {
                    return;
                }

                await runAction(
                    () =>
                        endCallRequest(
                            callId,
                        ),
                    set,
                    "Unable to end the call.",
                );
            },

            applyRealtimeEvent: (event) => {
                if (
                    event.type ===
                        "CONNECTED" ||
                    event.type ===
                        "PONG" ||
                    event.type === "ERROR"
                ) {
                    return;
                }

                const current =
                    get().activeCall;

                /*
                 * Do not replace an active call with
                 * an unrelated call.
                 */
                if (
                    current &&
                    current.id !==
                        event.call.id &&
                    !TERMINAL_CALL_STATES.has(
                        current.state,
                    )
                ) {
                    return;
                }

                set({
                    activeCall:
                        event.call,

                    participants:
                        event.participants,

                    isStarting: false,

                    isActionPending: false,
                });
            },

            clearError: () =>
                set({
                    error: null,
                }),

            reset: () => {
                set({
                    activeCall: null,
                    participants: [],
                    isStarting: false,
                    isActionPending: false,
                    error: null,
                });
            },
        }),
    );