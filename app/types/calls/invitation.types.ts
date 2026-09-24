export type InvitationRoom = {
    id: string;
    roomCode: string;
    status: string;
    createdAt: string;
    invitationExpiresAt: string;
};

export type InvitationResponse = {
    status: "ok";
    room: InvitationRoom;
};