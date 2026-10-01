import type {
    Call,
    CallParticipant,
} from "@/app/types/calls/calls.types";

import type {
    Message,
} from "@/app/types/conversations/conversations.types";

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

export type RealtimePresenceEvent =
    | {
          type: "PRESENCE_ONLINE";
          userId: string;
      }
    | {
          type: "PRESENCE_OFFLINE";
          userId: string;
      };

export type RealtimeWebRTCEvent =
    | {
          type: "OFFER";
          callId: string;
          fromUserId: string;
          sdp: string;
      }
    | {
          type: "ANSWER";
          callId: string;
          fromUserId: string;
          sdp: string;
      }
    | {
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

export type RealtimeServerEvent =
    | RealtimeCallEvent
    | RealtimeConversationEvent
    | RealtimeSystemEvent
    | RealtimePresenceEvent
    | RealtimeWebRTCEvent;

export type RealtimeWebRTCClientEvent =
    | {
          type: "OFFER";
          callId: string;
          sdp: string;
      }
    | {
          type: "ANSWER";
          callId: string;
          sdp: string;
      }
    | {
          type: "ICE_CANDIDATE";
          callId: string;
          candidate: {
              candidate: string;
              sdpMid: string | null;
              sdpMLineIndex: number | null;
              usernameFragment?: string | null;
          };
      };

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
