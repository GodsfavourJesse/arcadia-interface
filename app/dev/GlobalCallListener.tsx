"use client";

import { useCallback } from "react";

import {
    useAuth,
} from "@/app/hooks/auth/useAuth";

import {
    useCallsRealtime,
} from "@/app/hooks/calls/useCallsRealtime";

import {
    useCallStore,
} from "@/app/store/calls/calls.store";

import type {
    CallRealtimeEvent,
} from "@/app/types/calls/calls.types";

import { CallOverlay } from "./call-overlay";

/*
 * Mount this ONCE, near the root of the app (e.g. inside your
 * root layout, alongside <AuthProvider>) — not per-page. Calls
 * can come in while the user is anywhere in the app, so this
 * can't live inside the conversation page.
 *
 *     <AuthProvider>
 *         <GlobalCallListener />
 *         {children}
 *     </AuthProvider>
 *
 * It renders nothing itself besides the overlay — all it does
 * is keep one calls socket alive for the whole session and feed
 * events into the call store.
 */
export function GlobalCallListener() {
    const { user, isHydrated } =
        useAuth();

    const applyRealtimeEvent =
        useCallStore(
            (state) =>
                state.applyRealtimeEvent,
        );

    const handleEvent = useCallback(
        (
            event: CallRealtimeEvent,
        ) => {
            applyRealtimeEvent(event);
        },
        [applyRealtimeEvent],
    );

    useCallsRealtime({
        enabled:
            isHydrated &&
            Boolean(user),
        onEvent: handleEvent,
    });

    if (!isHydrated || !user) {
        return null;
    }

    return <CallOverlay />;
}