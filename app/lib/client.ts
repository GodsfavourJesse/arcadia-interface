const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000";

export class ApiRequestError extends Error {
    status: number;
    code?: string;
    errors?: Array<{
        field: string;
        message: string;
    }>;

    constructor(
        message: string,
        options: {
            status: number;
            code?: string;
            errors?: Array<{
                field: string;
                message: string;
            }>;
        },
    ) {
        super(message);

        this.name =
            "ApiRequestError";

        this.status =
            options.status;

        this.code =
            options.code;

        this.errors =
            options.errors;
    }
}

export async function apiRequest<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const headers = new Headers(
        options.headers,
    );

    if (
        options.body !== undefined &&
        options.body !== null
    ) {
        headers.set(
            "Content-Type",
            "application/json",
        );
    }

    const response = await fetch(
        `${API_BASE_URL}${path}`,
        {
            ...options,
            credentials: "include",
            headers,
        },
    );

    const contentType =
        response.headers.get(
            "content-type",
        );

    const data =
        contentType?.includes(
            "application/json",
        )
            ? await response.json()
            : null;

    if (!response.ok) {
        throw new ApiRequestError(
            data?.message ??
                "Something went wrong",
            {
                status:
                    response.status,
                code:
                    data?.code,
                errors:
                    data?.errors,
            },
        );
    }

    return data as T;
}