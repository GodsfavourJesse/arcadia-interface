export type JoinRoomResponse = {
    status: "ok";
    participant: {
        id: string;
        roomId: string;
        displayName: string;
        joinedAt: string;
    };
    guestToken: string;
};