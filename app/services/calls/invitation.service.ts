import { apiFetch } from "@/app/services/api.service";
import type { InvitationResponse } from "@/app/types/calls/invitation.types";

export async function getInvitation(
    token: string,
) {
    return apiFetch<InvitationResponse>(
        `/rooms/invitations/${encodeURIComponent(token)}`,
    );
}