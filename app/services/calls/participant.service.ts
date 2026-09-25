import { apiFetch } from "@/app/services/api.service";
import type { JoinRoomResponse } from "@/app/types/calls/participant.types";

export async function joinRoomAsGuest(
    roomId: string,
    invitationToken: string,
    displayName: string,
) {
    return apiFetch<JoinRoomResponse>(
        `/rooms/${roomId}/join`,
        {
            method: "POST",
            body: JSON.stringify({
                invitationToken,
                displayName,
            }),
        },
    );
}