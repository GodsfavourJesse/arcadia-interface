"use client";

import {
    useAuthStore,
} from "../../store/auth/auth.store";

export function useAuth() {
    const user = useAuthStore(
        (state) => state.user,
    );

    const isLoading = useAuthStore(
        (state) => state.isLoading,
    );

    const isHydrated = useAuthStore(
        (state) => state.isHydrated,
    );

    const error =  useAuthStore(
        (state) => state.error,
    );

    const hydrate = useAuthStore(
        (state) => state.hydrate,
    );

    const signup = useAuthStore(
        (state) => state.signup,
    );

    const login = useAuthStore(
        (state) => state.login,
    );

    const updateProfile = useAuthStore(
        (state) => state.updateProfile,
    );

    const logout = useAuthStore(
        (state) => state.logout,
    );

    const clearError = useAuthStore(
        (state) => state.clearError,
    );

    return {
        user,
        isAuthenticated: user !== null,
        isLoading,
        isHydrated,
        error,
        hydrate,
        signup,
        login,
        updateProfile,
        logout,
        clearError,
    };
}