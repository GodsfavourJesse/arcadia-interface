export type UserStatus =
    | "pending_verification"
    | "active"
    | "suspended";

export type User = {
    id: string;
    displayName: string;
    username: string;
    miyorNumber: string | null;
    email: string;
    profilePictureUrl: string | null;
    bio: string | null;
    emailVerifiedAt: string | null;
    status: UserStatus;
    createdAt: string;
};

export type ApiSuccess<T> = {
    status: "ok";
    data: T;
};

export type SignupResponse = {
    status: "ok";
    message: string;
    email: string;
};

export type LoginResponse = {
    status: "ok";
    user: User;
};

export type MeResponse = {
    status: "ok";
    user: User;
};

export type LogoutResponse = {
    status: "ok";
};

export type VerificationResponse = {
    message: "EMAIL_VERIFIED";
    user: {
        id: string;
        email: string;
        miyorNumber: string;
    };
};

export type ApiError = {
    status?: "error";
    code?: string;
    message: string;
    errors?: Array<{
        field: string;
        message: string;
    }>;
};

export type UpdateProfileInput = {
    displayName?: string;
    bio?: string | null;
    profilePictureUrl?: string | null;
};

export type UpdateProfileResponse = {
    status: "ok";
    user: User;
};