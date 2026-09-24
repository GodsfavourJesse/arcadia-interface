import { ApiError } from "../types/api.types";

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
    readonly status: number;
    readonly code?: string;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = "ApiRequestError";
        this.status = status;
        this.code = code;
    }
}

export async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const headers = new Headers(options.headers);

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        credentials: "include",
        headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const error = data as ApiError | null;

        throw new ApiRequestError(
            error?.message ?? `API request failed: ${response.status}`,
            response.status,
            error?.code,
        );
    }

    return data as T;
}
