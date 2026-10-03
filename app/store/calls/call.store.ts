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
    CallVideoSource,
} from "@/app/types/calls/calls.types";

import type {
    RealtimeServerEvent,
} from "@/app/types/realtime/realtime.types";

import type { AvatarDefinition } from "@/app/types/avatar/avatar.types";

import {
    isRealtimeCallEvent,
} from "@/app/types/realtime/realtime.types";

type CallStoreState = {
    activeCall: Call | null;
    participants: CallParticipant[];

    isStarting: boolean;
    isHydrating: boolean;
    isActionPending: boolean;

    error: string | null;
    localVideoSource: CallVideoSource;
    localAvatarId: string | null;
    localAvatar: AvatarDefinition | null;

    startCall: (input: {
        conversationId: string;
        calleeId: string;
        type: CallType;
        initialVideoSource?: CallVideoSource;
        avatarId?: string | null;
        avatar?: AvatarDefinition | null;
    }) => Promise<void>;

    hydrateActiveCall: () => Promise<void>;

    accept: () => Promise<void>;
    decline: () => Promise<void>;
    cancel: () => Promise<void>;
    markConnected: () => Promise<void>;
    fail: () => Promise<void>;
    end: () => Promise<void>;

    applyRealtimeEvent: (
        event: RealtimeServerEvent,
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

async function runAction<T>(
    action: () => Promise<T>,
    set: (
        partial:
            | Partial<CallStoreState>
            | ((
                  state: CallStoreState,
              ) => Partial<CallStoreState>),
    ) => void,
    fallback: string,
    onSuccess?: (result: T) => void,
) {
    set({
        isActionPending: true,
        error: null,
    });

    try {
        const result = await action();
        onSuccess?.(result);
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
            isHydrating: false,
            isActionPending: false,
            error: null,
            localVideoSource: "camera",
            localAvatarId: null,
            localAvatar: null,

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
                    localVideoSource:
                        input.initialVideoSource ?? "camera",
                    localAvatarId:
                        input.avatarId ?? input.avatar?.id ?? null,
                    localAvatar:
                        input.avatar ?? null,
                });

                try {
                    const response =
                        await createCallRequest({
                            conversationId:
                                input.conversationId,
                            calleeId:
                                input.calleeId,
                            type: input.type,
                        });

                    const returnedCall =
                        response.data;

                    const currentRealtimeCall =
                        get().activeCall;

                    if (
                        currentRealtimeCall?.id ===
                            returnedCall.id &&
                        get().participants.length > 0
                    ) {
                        set({
                            activeCall:
                                currentRealtimeCall,
                            isStarting: false,
                        });
                        return;
                    }

                    const hydrated =
                        await getCallRequest(
                            returnedCall.id,
                        );

                    set({
                        activeCall:
                            hydrated.data.call,
                        participants:
                            hydrated.data
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

            hydrateActiveCall: async () => {
                if (get().isHydrating) {
                    return;
                }

                set({
                    isHydrating: true,
                });

                try {
                    const response =
                        await listCallsRequest(20);

                    const active =
                        response.data.find(
                            (item) =>
                                !TERMINAL_CALL_STATES.has(
                                    item.call.state,
                                ),
                        );

                    if (!active) {
                        /*
                         * Read activeCall once so TypeScript can
                         * safely narrow the value.
                         */
                        const current =
                            get().activeCall;

                        if (
                            !current ||
                            TERMINAL_CALL_STATES.has(
                                current.state,
                            )
                        ) {
                            set({
                                activeCall: null,
                                participants: [],
                            });
                        }

                        return;
                    }

                    const details =
                        await getCallRequest(
                            active.call.id,
                        );

                    set({
                        activeCall:
                            details.data.call,
                        participants:
                            details.data
                                .participants,
                        error: null,
                    });
                } catch (error) {
                    /*
                     * A reconnecting realtime socket should not
                     * turn into a visible UI error merely because
                     * the reconciliation request failed.
                     */
                    console.warn(
                        "[Calls] Active-call reconciliation failed:",
                        error,
                    );
                } finally {
                    set({
                        isHydrating: false,
                    });
                }
            },

            accept: async () => {
                const call =
                    get().activeCall;

                if (
                    !call ||
                    call.state !== CALL_STATE.RINGING
                ) {
                    return;
                }

                await runAction(
                    async () => {
                        const response =
                            await acceptCallRequest(
                                call.id,
                            );

                        return response.data;
                    },
                    set,
                    "Unable to accept the call.",
                    (updatedCall) => {
                        set({
                            activeCall:
                                updatedCall,
                            error: null,
                        });
                    },
                );
            },

            decline: async () => {
                const callId =
                    get().activeCall?.id;

                if (!callId) {
                    return;
                }

                await runAction(
                    async () => {
                        const response =
                            await declineCallRequest(
                                callId,
                            );

                        return response.data;
                    },
                    set,
                    "Unable to decline the call.",
                    (updatedCall) => {
                        set({
                            activeCall:
                                updatedCall,
                        });
                    },
                );
            },

            cancel: async () => {
                const callId =
                    get().activeCall?.id;

                if (!callId) {
                    return;
                }

                await runAction(
                    async () => {
                        const response =
                            await cancelCallRequest(
                                callId,
                            );

                        return response.data;
                    },
                    set,
                    "Unable to cancel the call.",
                    (updatedCall) => {
                        set({
                            activeCall:
                                updatedCall,
                        });
                    },
                );
            },

            markConnected: async () => {
                const call =
                    get().activeCall;

                if (
                    !call ||
                    call.state === CALL_STATE.CONNECTED ||
                    call.state !== CALL_STATE.ACCEPTED
                ) {
                    return;
                }

                await runAction(
                    async () => {
                        const response =
                            await connectCallRequest(
                                call.id,
                            );

                        return response.data;
                    },
                    set,
                    "Unable to connect the call.",
                    (updatedCall) => {
                        if (
                            get().activeCall?.id ===
                            updatedCall.id
                        ) {
                            set({
                                activeCall:
                                    updatedCall,
                            });
                        }
                    },
                );
            },

            fail: async () => {
                const callId =
                    get().activeCall?.id;

                if (!callId) {
                    return;
                }

                await runAction(
                    async () => {
                        const response =
                            await failCallRequest(
                                callId,
                            );

                        return response.data;
                    },
                    set,
                    "The call could not be connected.",
                    (updatedCall) => {
                        set({
                            activeCall:
                                updatedCall,
                        });
                    },
                );
            },

            end: async () => {
                const callId =
                    get().activeCall?.id;

                if (!callId) {
                    return;
                }

                await runAction(
                    async () => {
                        const response =
                            await endCallRequest(
                                callId,
                            );

                        return response.data;
                    },
                    set,
                    "Unable to end the call.",
                    (updatedCall) => {
                        set({
                            activeCall:
                                updatedCall,
                        });
                    },
                );
            },

            applyRealtimeEvent: (event) => {
                if (
                    !isRealtimeCallEvent(
                        event,
                    )
                ) {
                    return;
                }

                const current =
                    get().activeCall;

                /*
                 * A second unrelated call must never replace an
                 * active call. Terminal calls are allowed to be
                 * replaced by a newer call.
                 */
                if (
                    current &&
                    current.id !== event.call.id &&
                    !TERMINAL_CALL_STATES.has(
                        current.state,
                    )
                ) {
                    return;
                }

                const preserveLocalMedia =
                    get().isStarting ||
                    current?.id === event.call.id;

                set({
                    activeCall:
                        event.call,
                    participants:
                        event.participants,
                    isStarting: false,
                    isActionPending: false,
                    error: null,
                    ...(preserveLocalMedia
                        ? {}
                        : {
                              localVideoSource:
                                  "camera",
                              localAvatarId: null,
                              localAvatar: null,
                          }),
                });
            },

            clearError: () =>
                set({
                    error: null,
                }),

            reset: () => {
                const currentAvatar = get().localAvatar;

                if (currentAvatar?.assetUrl.startsWith("blob:")) {
                    URL.revokeObjectURL(currentAvatar.assetUrl);
                }

                set({
                    activeCall: null,
                    participants: [],
                    isStarting: false,
                    isHydrating: false,
                    isActionPending: false,
                    error: null,
                    localVideoSource: "camera",
                    localAvatarId: null,
                    localAvatar: null,
                });
            },
        }),
    );