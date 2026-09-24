import { apiFetch } from "@/app/services/api.service";
import type {
    GetHostRoomResponse,
    StartRoomResponse,
} from "@/app/types/calls/room.types";

export async function getHostRoom(roomId: string) {
    return apiFetch<GetHostRoomResponse>(
        `/rooms/${roomId}`,
    );
}

export async function startRoom(roomId: string) {
    return apiFetch<StartRoomResponse>(
        `/rooms/${roomId}/start`,
        {
            method: "POST",
        },
    );
}