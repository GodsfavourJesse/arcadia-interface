import {
    create,
} from "zustand";

import {
    getCurrentUser,
    login as loginRequest,
    logout as logoutRequest,
    signup as signupRequest,
    updateProfile as updateProfileRequest,
} from "../../lib/auth";

import type {
    LoginInput,
    SignupInput,
} from "../../lib/auth";

import type {
    UpdateProfileInput,
    User,
} from "../../types/auth/auth.types";
import { ApiRequestError } from "@/app/lib/client";

type AuthState = {
    user: User | null;

    isLoading: boolean;

    isHydrated: boolean;

    error: string | null;

    hydrate: () => Promise<void>;

    signup: (
        input: SignupInput,
    ) => Promise<{
        email: string;
    }>;

    login: (
        input: LoginInput,
    ) => Promise<User>;

    updateProfile: (
        input: UpdateProfileInput,
    ) => Promise<User>;

    logout: () => Promise<void>;

    clearError: () => void;
};

export const useAuthStore =
    create<AuthState>(
        (set) => ({
            user: null,

            isLoading: false,

            isHydrated: false,

            error: null,

            hydrate: async () => {
                set({
                    isLoading: true,
                    error: null,
                });

                try {
                    const response = await getCurrentUser();

                    set({
                        user: response.user,
                        isHydrated: true,
                        isLoading: false,
                        error: null,
                    });
                } catch (error) {
                    if (
                        error instanceof ApiRequestError &&
                        error.status === 401
                    ) {
                        set({
                            user: null,
                            isHydrated: true,
                            isLoading: false,
                            error: null,
                        });

                        return;
                    }

                    set({
                        user: null,
                        isHydrated: true,
                        isLoading: false,
                        error:
                            error instanceof Error
                                ? error.message
                                : "Unable to restore your session.",
                    });
                }
            },

            signup: async (
                input,
            ) => {
                set({
                    isLoading: true,
                    error: null,
                });

                try {
                    const response =
                        await signupRequest(
                            input,
                        );

                    set({
                        isLoading: false,
                    });

                    return {
                        email:
                            response.email,
                    };
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "Unable to create account";

                    set({
                        isLoading: false,
                        error: message,
                    });

                    throw error;
                }
            },

            login: async (
                input,
            ) => {
                set({
                    isLoading: true,
                    error: null,
                });

                try {
                    const response =
                        await loginRequest(
                            input,
                        );

                    set({
                        user:
                            response.user,
                        isLoading: false,
                        isHydrated: true,
                    });

                    return response.user;
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "Unable to sign in";

                    set({
                        isLoading: false,
                        error: message,
                    });

                    throw error;
                }
            },

            updateProfile: async (input) => {
                set({
                    isLoading: true,
                    error: null,
                });

                try {
                    const response =
                        await updateProfileRequest(input);

                    set({
                        user: response.user,
                        isLoading: false,
                        isHydrated: true,
                        error: null,
                    });

                    return response.user;
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "Unable to update your profile.";

                    set({
                        isLoading: false,
                        error: message,
                    });

                    throw error;
                }
            },

            logout: async () => {
                set({
                    isLoading: true,
                    error: null,
                });

                try {
                    await logoutRequest();

                    set({
                        user: null,
                        isLoading: false,
                        isHydrated: true,
                    });
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "Unable to sign out";

                    set({
                        isLoading: false,
                        error: message,
                    });

                    throw error;
                }
            },

            clearError: () => {
                set({
                    error: null,
                });
            },
        }),
    );