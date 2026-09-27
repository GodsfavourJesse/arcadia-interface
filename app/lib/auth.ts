import {
    apiRequest,
} from "./client";

import type {
    LoginResponse,
    LogoutResponse,
    MeResponse,
    SignupResponse,
    UpdateProfileInput,
    UpdateProfileResponse,
    VerificationResponse,
} from "../types/auth/auth.types";

export type SignupInput = {
    displayName: string;
    username: string;
    email: string;
    password: string;
};

export type LoginInput = {
    email: string;
    password: string;
};

export async function signup(
    input: SignupInput,
) {
    return apiRequest<SignupResponse>(
        "/auth/signup",
        {
            method: "POST",
            body: JSON.stringify(input),
        },
    );
}

export async function login(
    input: LoginInput,
) {
    return apiRequest<LoginResponse>(
        "/auth/login",
        {
            method: "POST",
            body: JSON.stringify(input),
        },
    );
}

export async function logout() {
    return apiRequest<LogoutResponse>(
        "/auth/logout",
        {
            method: "POST",
        },
    );
}

export async function getCurrentUser() {
    return apiRequest<MeResponse>(
        "/auth/me",
        {
            method: "GET",
        },
    );
}

export async function verifyEmail(
    token: string,
) {
    const params = new URLSearchParams({
        token,
    });

    return apiRequest<VerificationResponse>(
        `/auth/verify-email?${params.toString()}`,
        {
            method: "GET",
        },
    );
}

export async function updateProfile(
    input: UpdateProfileInput,
) {
    return apiRequest<UpdateProfileResponse>(
        "/users/me",
        {
            method: "PATCH",
            body: JSON.stringify(input),
        },
    );
}