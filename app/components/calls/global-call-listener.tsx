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

import type {
    RealtimeServerEvent,
} from "@/app/types/realtime/realtime.types";

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

    const handleEvent =
        useCallback(
            (
                event: RealtimeServerEvent,
            ) => {
                applyRealtimeEvent(
                    event as Parameters<
                        typeof applyRealtimeEvent
                    >[0],
                );
            },
            [applyRealtimeEvent],
        );

    useCallsRealtime({
        enabled:
            isHydrated &&
            Boolean(user),
        onEvent: handleEvent,
    });

    if (
        !isHydrated ||
        !user
    ) {
        return null;
    }

    return <CallOverlay />;
}