"use client";

import { useAuth } from "@/app/hooks/auth/useAuth";
import { useEffect } from "react";
import { useCallsRealtime } from "@/app/hooks/calls/useCallsRealtime";
import { useCallStore } from "@/app/store/calls/call.store";
import { CallOverlay } from "./call-overlay";
import { toast } from "sonner";
import type { RealtimeServerEvent } from "@/app/types/realtime/realtime.types";

export function GlobalCallListener() {
    const { user, isHydrated } = useAuth();
    const applyRealtimeEvent = useCallStore((state) => state.applyRealtimeEvent);

    useEffect(() => {
        function handlePush(event: MessageEvent<{ type?: string; payload?: { kind?: string; callId?: string } }>) {
            if (event.data?.type !== "MIYOR_PUSH" || event.data.payload?.kind !== "incoming-call") return;
            if (event.data.payload.callId) toast("Incoming call", { id: `ring-${event.data.payload.callId}`, description: "Open the call window to answer." });
            void useCallStore.getState().hydrateActiveCall();
        }
        navigator.serviceWorker?.addEventListener("message", handlePush);
        return () => navigator.serviceWorker?.removeEventListener("message", handlePush);
    }, []);

    useCallsRealtime({
        enabled: isHydrated && Boolean(user),
        onEvent: (event: RealtimeServerEvent) => {
            applyRealtimeEvent(event);
            if (event.type === "CALL_RINGING") toast("Incoming call", { id: `ring-${event.call.id}`, description: event.call.type === "video" ? "Video call is ringing" : "Voice call is ringing" });
            if (event.type === "CALL_MISSED") toast.info("You missed a call", { id: `missed-${event.call.id}` });
        },
    });

    if (!isHydrated || !user) return null;

    return <CallOverlay />;
}
