import type {
    Call,
    CallParticipant,
} from "@/app/types/calls/calls.types";

import type {
    Message,
} from "@/app/types/conversations/conversations.types";

/* -------------------------------------------------------------------------- */
/* Call events                                                                */
/* -------------------------------------------------------------------------- */

export type RealtimeCallEvent = {
    type:
        | "CALL_CREATED"
        | "CALL_RINGING"
        | "CALL_ACCEPTED"
        | "CALL_DECLINED"
        | "CALL_CANCELLED"
        | "CALL_MISSED"
        | "CALL_CONNECTED"
        | "CALL_ENDED"
        | "CALL_FAILED";
    call: Call;
    participants: CallParticipant[];
    actorUserId: string | null;
};

/* -------------------------------------------------------------------------- */
/* Conversation events                                                        */
/* -------------------------------------------------------------------------- */

export type RealtimeConversationEvent =
    | {
          type: "SUBSCRIBED";
          conversationId: string;
      }
    | {
          type: "UNSUBSCRIBED";
          conversationId: string;
      }
    | {
          type: "MESSAGE_NEW";
          message: Message;
      }
    | {
          type: "MESSAGE_READ";
          conversationId: string;
          readerId: string;
          messageIds: string[];
          readAt: string;
      };

/* -------------------------------------------------------------------------- */
/* Presence events                                                            */
/* -------------------------------------------------------------------------- */

export type RealtimePresenceEvent =
    | {
          type: "PRESENCE_ONLINE";
          userId: string;
      }
    | {
          type: "PRESENCE_OFFLINE";
          userId: string;
      };

/* -------------------------------------------------------------------------- */
/* System events                                                              */
/* -------------------------------------------------------------------------- */

export type RealtimeSystemEvent =
    | {
          type: "CONNECTED";
          userId: string;
      }
    | {
          type: "PONG";
      }
    | {
          type: "ERROR";
          code: string;
          message: string;
      };

/* -------------------------------------------------------------------------- */
/* WebRTC signaling events                                                    */
/* -------------------------------------------------------------------------- */

export type RealtimeOfferEvent = {
    type: "OFFER";
    callId: string;
    fromUserId: string;
    sdp: string;
};

export type RealtimeAnswerEvent = {
    type: "ANSWER";
    callId: string;
    fromUserId: string;
    sdp: string;
};

export type RealtimeIceCandidateEvent = {
    type: "ICE_CANDIDATE";
    callId: string;
    fromUserId: string;
    candidate: {
        candidate: string;
        sdpMid: string | null;
        sdpMLineIndex: number | null;
        usernameFragment?: string | null;
    };
};

/* -------------------------------------------------------------------------- */
/* Media state                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Sent when the local user's microphone or camera state changes.
 *
 * This is deliberately separate from WebRTC SDP/media negotiation because
 * muting and disabling the camera are runtime media-state changes.
 */
export type RealtimeMediaStateEvent = {
    type: "MEDIA_STATE";
    callId: string;
    fromUserId: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
};

/* -------------------------------------------------------------------------- */
/* Server -> client WebRTC events                                             */
/* -------------------------------------------------------------------------- */

export type RealtimeWebRTCEvent =
    | RealtimeOfferEvent
    | RealtimeAnswerEvent
    | RealtimeIceCandidateEvent
    | RealtimeMediaStateEvent;

/* -------------------------------------------------------------------------- */
/* Complete server event union                                                */
/* -------------------------------------------------------------------------- */

export type RealtimeServerEvent =
    | RealtimeCallEvent
    | RealtimeConversationEvent
    | RealtimeSystemEvent
    | RealtimePresenceEvent
    | RealtimeWebRTCEvent;

/* -------------------------------------------------------------------------- */
/* Client -> server WebRTC events                                             */
/* -------------------------------------------------------------------------- */

export type RealtimeOfferClientEvent = {
    type: "OFFER";
    callId: string;
    sdp: string;
};

export type RealtimeAnswerClientEvent = {
    type: "ANSWER";
    callId: string;
    sdp: string;
};

export type RealtimeIceCandidateClientEvent = {
    type: "ICE_CANDIDATE";
    callId: string;
    candidate: {
        candidate: string;
        sdpMid: string | null;
        sdpMLineIndex: number | null;
        usernameFragment?: string | null;
    };
};

export type RealtimeMediaStateClientEvent = {
    type: "MEDIA_STATE";
    callId: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
};

export type RealtimeWebRTCClientEvent =
    | RealtimeOfferClientEvent
    | RealtimeAnswerClientEvent
    | RealtimeIceCandidateClientEvent
    | RealtimeMediaStateClientEvent;

/* -------------------------------------------------------------------------- */
/* General client events                                                      */
/* -------------------------------------------------------------------------- */

export type RealtimeClientEvent =
    | {
          type: "PING";
      }
    | {
          type: "SUBSCRIBE_CONVERSATION";
          conversationId: string;
      }
    | {
          type: "UNSUBSCRIBE_CONVERSATION";
          conversationId: string;
      }
    | RealtimeWebRTCClientEvent;

/* -------------------------------------------------------------------------- */
/* Type guards                                                                */
/* -------------------------------------------------------------------------- */

export function isRealtimeCallEvent(
    event: RealtimeServerEvent,
): event is RealtimeCallEvent {
    return (
        event.type === "CALL_CREATED" ||
        event.type === "CALL_RINGING" ||
        event.type === "CALL_ACCEPTED" ||
        event.type === "CALL_DECLINED" ||
        event.type === "CALL_CANCELLED" ||
        event.type === "CALL_MISSED" ||
        event.type === "CALL_CONNECTED" ||
        event.type === "CALL_ENDED" ||
        event.type === "CALL_FAILED"
    );
}

export function isRealtimeMediaStateEvent(
    event: RealtimeServerEvent,
): event is RealtimeMediaStateEvent {
    return event.type === "MEDIA_STATE";
}