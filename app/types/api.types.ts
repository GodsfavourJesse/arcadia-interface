export type HealthResponse = {
    status: "ok";
    service: "miyor-api";
};

export type ApiError = {
    status: "error";
    message: string;
    code?: string;
    errors?: Array<{
        field: string;
        message: string;
    code?: string;
    }>;
};
