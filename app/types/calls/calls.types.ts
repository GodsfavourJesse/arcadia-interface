export const CALL_TYPE = {
    VOICE: "voice",
    VIDEO: "video",
} as const;

export type CallType =
    (typeof CALL_TYPE)[keyof typeof CALL_TYPE];

export const CALL_VIDEO_SOURCE = {
    CAMERA: "camera",
    AVATAR: "avatar",
} as const;

export type CallVideoSource =
    (typeof CALL_VIDEO_SOURCE)[keyof typeof CALL_VIDEO_SOURCE];

export const CALL_STATE = {
    INITIATING: "initiating",
    RINGING: "ringing",
    ACCEPTED: "accepted",
    CONNECTED: "connected",
    DECLINED: "declined",
    MISSED: "missed",
    CANCELLED: "cancelled",
    ENDED: "ended",
    FAILED: "failed",
} as const;

export type CallState =
    (typeof CALL_STATE)[keyof typeof CALL_STATE];

export const CALL_PARTICIPANT_ROLE = {
    CALLER: "caller",
    CALLEE: "callee",
} as const;

export type CallParticipantRole =
    (typeof CALL_PARTICIPANT_ROLE)[keyof typeof CALL_PARTICIPANT_ROLE];

export const CALL_PARTICIPANT_STATE = {
    INVITED: "invited",
    RINGING: "ringing",
    ACCEPTED: "accepted",
    CONNECTED: "connected",
    DECLINED: "declined",
    MISSED: "missed",
    CANCELLED: "cancelled",
    ENDED: "ended",
    FAILED: "failed",
} as const;

export type CallParticipantState =
    (typeof CALL_PARTICIPANT_STATE)[keyof typeof CALL_PARTICIPANT_STATE];

export const TERMINAL_CALL_STATES: ReadonlySet<CallState> = new Set([
    CALL_STATE.DECLINED,
    CALL_STATE.MISSED,
    CALL_STATE.CANCELLED,
    CALL_STATE.ENDED,
    CALL_STATE.FAILED,
]);

export type Call = {
    id: string;
    conversationId: string;
    type: CallType;
    state: CallState;
    initiatedBy: string;
    startedAt: string | null;
    connectedAt: string | null;
    endedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type CallParticipant = {
    id: string;
    callId: string;
    userId: string;
    role: CallParticipantRole;
    state: CallParticipantState;
    joinedAt: string | null;
    leftAt: string | null;
    createdAt: string;
};

export type CallEvent = {
    id: string;
    callId: string;
    actorUserId: string | null;
    type: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
};

export type CallWithParticipants = {
    call: Call;
    participants: CallParticipant[];
};

export type CallWithOwnParticipant = {
    call: Call;
    participant: CallParticipant;
};

type SuccessEnvelope<T> = {
    status: "success";
    data: T;
};

export type CreateCallResponse = SuccessEnvelope<Call>;
export type ListCallsResponse = SuccessEnvelope<CallWithOwnParticipant[]>;
export type GetCallResponse = SuccessEnvelope<CallWithParticipants>;
export type GetCallEventsResponse = SuccessEnvelope<CallEvent[]>;
export type CallActionResponse = SuccessEnvelope<Call>;

export type IceServerConfig = {
    urls: string;
    username?: string;
    credential?: string;
};

export type IceConfigResponse = SuccessEnvelope<{
    iceServers: IceServerConfig[];
}>;

