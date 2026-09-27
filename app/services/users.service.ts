import { apiRequest } from "../lib/client";
import type {
    UserSearchResponse,
} from "../types/users/users.types";

export async function searchUsers(
    query: string,
) {
    const params = new URLSearchParams({
        q: query,
    });

    return apiRequest<UserSearchResponse>(
        `/users/search?${params.toString()}`,
        {
            method: "GET",
        },
    );
}