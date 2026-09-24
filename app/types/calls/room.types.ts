export type RoomStatus =
    | "waiting"
    | "active"
    | "ended"
    | "expired";

export type HostRoom = {
    id: string;
    roomCode: string;
    status: RoomStatus;
    createdAt: string;
    startedAt: string | null;
    endedAt: string | null;
    invitationExpiresAt: string;
};

export type GetHostRoomResponse = {
    status: "ok";
    room: HostRoom;
};

export type StartRoomResponse = {
    status: "ok";
    room: {
        id: string;
        roomCode: string;
        status: RoomStatus;
        startedAt: string | null;
        invitationExpiresAt: string;
    };
};