"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import { apiFetch } from "@/app/services/api.service";
import type { AuthResponse, User } from "@/app/types/auth.types";

type AuthContextValue = {
    user: User | null;
    loading: boolean;
    refreshUser: () => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext =
    createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async (): Promise<void> => {
        try {
            const response = await apiFetch<AuthResponse>("/me");

            setUser(response.user);
        } catch {
            setUser(null);
        }
    }, []);

    const logout = useCallback(async (): Promise<void> => {
        try {
            await apiFetch<{ status: "ok" }>(
                "/auth/logout",
                {
                    method: "POST",
                },
            );
        } finally {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        refreshUser().finally(() => {
            setLoading(false);
        });
    }, [refreshUser]);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                refreshUser,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider",
        );
    }

    return context;
}