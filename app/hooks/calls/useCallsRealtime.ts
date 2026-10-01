"use client";

import {
    useEffect,
    useRef,
} from "react";

import {
    realtimeClient,
} from "@/app/lib/realtime/realtime.client";

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
                },
            );

        const unsubscribeConnection =
            realtimeClient.subscribeConnectionState(
                (state) => {
                    onConnectionStateChangeRef.current?.(
                        state,
                    );
                },
            );

        realtimeClient.connect();

        onConnectionStateChangeRef.current?.(
            realtimeClient.connectionState,
        );

        return () => {
            unsubscribe();
            unsubscribeConnection();

            /*
             * IMPORTANT:
             *
             * This hook must NOT disconnect the singleton.
             * Other Miyor features may be using /ws.
             */
        };
    }, [enabled]);
}