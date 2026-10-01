import type {
    Call,
    CallParticipant,
} from "@/app/types/calls/calls.types";

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
    | RealtimeSystemEvent
    | RealtimeWebRTCEvent;

export type RealtimeClientEvent =
    | {
          type: "PING";
      }
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