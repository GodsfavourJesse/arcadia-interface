export type RealtimeParticipant = {
    participantId: string;
    displayName: string;
    role: "host" | "guest";
};

export type RealtimeEvent =
    |   {
            type: "CONNECTED";
            participant: RealtimeParticipant;
        }
    |   {
            type: "ROOM_PRESENCE";
            participants: Array< 
                RealtimeParticipant & {
                    status: "joined" | "left";
                    connectionId: string;
                    joinedAt: string;
                }
            >;
        }
    |   {
            type: "ROOM_JOINED";
            participant: RealtimeParticipant;
        }
    |   {
            type: "ROOM_LEFT";
            participant: Pick<
                RealtimeParticipant,
                "participantId" | "displayName" | "role"
            >;
        }
    |   {
            type: "OFFER";
            fromParticipantId: string;
            data: RTCSessionDescriptionInit;
        }
    |   {
            type: "ANSWER";
            fromParticipantId: string;
            data: RTCSessionDescriptionInit;
        }
    |   {
            type: "ICE_CANDIDATE";
            fromParticipantId: string;
            data: RTCIceCandidateInit;
        }
    |   {
            type: "AUTH_ERROR";
            message: string;
        }
    |   {
            type: "CALL_ENDED";
        }
    |   {
            type: "ERROR";
            code?: string;
            message: string;
        };