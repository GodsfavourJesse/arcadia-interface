"use client";

import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "../store/auth/auth.store";

type AuthProviderProps = {
    children: ReactNode;
};

export function AuthProvider({
    children,
}: AuthProviderProps) {
    const hydrate = useAuthStore(
        (state) => state.hydrate,
    );

    useEffect(() => {
        void hydrate();
    }, [hydrate]);

    return children;
}