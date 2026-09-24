export type RealtimeParticipant = {
    participantId: string;
    displayName: string;
    role: "host" | "guest";
};

export type RealtimeEvent =
    |   {
          type: "ROOM_JOINED";
          participant: RealtimeParticipant;
        }
    |   {
          type: "ROOM_LEFT";
          participant: Pick<
              RealtimeParticipant,
              "participantId" | "displayName"
          >;
        }
    |   {
          type: "ROOM_PRESENCE";
          participants: RealtimeParticipant[];
        };