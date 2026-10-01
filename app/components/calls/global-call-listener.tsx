"use client";

import {
    useCallback,
} from "react";

import {
    useAuth,
} from "@/app/hooks/auth/useAuth";

import {
    useCallsRealtime,
} from "@/app/hooks/calls/useCallsRealtime";


import {
    CallOverlay,
} from "./call-overlay";

import {
    useCallStore,
} from "@/app/store/calls/call.store";

export function GlobalCallListener() {
    const {
        user,
        isHydrated,
    } = useAuth();

    const applyRealtimeEvent =
        useCallStore(
            (state) =>
                state.applyRealtimeEvent,
        );

    useCallsRealtime({
        enabled:
            isHydrated &&
            Boolean(user),
        onEvent: applyRealtimeEvent,
    });

    if (
        !isHydrated ||
        !user
    ) {
        return null;
    }

    return <CallOverlay />;
}