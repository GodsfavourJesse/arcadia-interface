import { apiRequest } from "@/app/lib/client";

import type {
    CallActionResponse,
    CallType,
    CreateCallResponse,
    GetCallEventsResponse,
    GetCallResponse,
    IceConfigResponse,
    ListCallsResponse,
} from "@/app/types/calls/calls.types";

export function createCall(input: {
    conversationId: string;
    calleeId: string;
    type: CallType;
}) {
    return apiRequest<CreateCallResponse>("/calls", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export function listCalls(limit = 50) {
    return apiRequest<ListCallsResponse>(
        `/calls?limit=${Math.min(
            Math.max(limit, 1),
            100,
        )}`,
        {
            method: "GET",
        },
    );
}

export function getCall(callId: string) {
    return apiRequest<GetCallResponse>(
        `/calls/${callId}`,
        {
            method: "GET",
        },
    );
}

export function getCallEvents(callId: string) {
    return apiRequest<GetCallEventsResponse>(
        `/calls/${callId}/events`,
        {
            method: "GET",
        },
    );
}

export function acceptCall(callId: string) {
    return apiRequest<CallActionResponse>(
        `/calls/${callId}/accept`,
        {
            method: "POST",
        },
    );
}

export function declineCall(callId: string) {
    return apiRequest<CallActionResponse>(
        `/calls/${callId}/decline`,
        {
            method: "POST",
        },
    );
}

export function cancelCall(callId: string) {
    return apiRequest<CallActionResponse>(
        `/calls/${callId}/cancel`,
        {
            method: "POST",
        },
    );
}

export function connectCall(callId: string) {
    return apiRequest<CallActionResponse>(
        `/calls/${callId}/connect`,
        {
            method: "POST",
        },
    );
}

export function endCall(callId: string) {
    return apiRequest<CallActionResponse>(
        `/calls/${callId}/end`,
        {
            method: "POST",
        },
    );
}

export function getIceConfig() {
    return apiRequest<IceConfigResponse>(
        "/calls/ice-config",
        {
            method: "GET",
        },
    );
}

export function failCall(callId: string) {
    return apiRequest<CallActionResponse>(
        `/calls/${callId}/fail`,
        {
            method: "POST",
        },
    );
}