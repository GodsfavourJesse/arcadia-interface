"use client";

import {
    useEffect,
    useRef,
} from "react";

import {
    realtimeClient,
} from "@/app/lib/realtime/realtime.client";

import {
    useCallStore,
} from "@/app/store/calls/call.store";

import type {
    RealtimeServerEvent,
} from "@/app/types/realtime/realtime.types";

type UseCallsRealtimeOptions = {
    enabled: boolean;
    onEvent: (
        event: RealtimeServerEvent,
    ) => void;
    onConnectionStateChange?: (
        state:
            | "connecting"
            | "open"
            | "closed"
            | "idle",
    ) => void;
};

export function useCallsRealtime({
    enabled,
    onEvent,
    onConnectionStateChange,
}: UseCallsRealtimeOptions) {
    const onEventRef =
        useRef(onEvent);

    const onConnectionStateChangeRef =
        useRef(
            onConnectionStateChange,
        );

    const hydrateActiveCall =
        useCallStore(
            (state) =>
                state.hydrateActiveCall,
        );

    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        onConnectionStateChangeRef.current =
            onConnectionStateChange;
    }, [onConnectionStateChange]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const unsubscribe =
            realtimeClient.subscribe(
                (event) => {
                    onEventRef.current(event);

                    if (
                        event.type ===
                        "CONNECTED"
                    ) {
                        void hydrateActiveCall();
                    }
                },
            );

        const unsubscribeConnection =
            realtimeClient.subscribeConnectionState(
                (state) => {
                    onConnectionStateChangeRef.current?.(
                        state,
                    );

                    if (
                        state === "open"
                    ) {
                        void hydrateActiveCall();
                    }
                },
            );

        realtimeClient.connect();

        onConnectionStateChangeRef.current?.(
            realtimeClient.connectionState,
        );

        if (
            realtimeClient.connectionState ===
            "open"
        ) {
            void hydrateActiveCall();
        }

        return () => {
            unsubscribe();
            unsubscribeConnection();
        };
    }, [
        enabled,
        hydrateActiveCall,
    ]);
}
