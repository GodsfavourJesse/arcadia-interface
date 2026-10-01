"use client";

import type {
    RealtimeClientEvent,
    RealtimeServerEvent,
    RealtimeWebRTCEvent,
} from "@/app/types/realtime/realtime.types";

type RealtimeListener = (
    event: RealtimeServerEvent,
) => void;

/**
 * Listener specifically for WebRTC signaling/media-state events.
 *
 * Keeping this separate from RealtimeListener gives the WebRTC layer
 * a strongly typed subscription that can only receive:
 *
 * - OFFER
 * - ANSWER
 * - ICE_CANDIDATE
 * - MEDIA_STATE
 */
export type RealtimeWebRTCListener = (
    event: RealtimeWebRTCEvent,
) => void;

export type ConnectionState =
    | "idle"
    | "connecting"
    | "open"
    | "closed";

type ConnectionStateListener = (
    state: ConnectionState,
) => void;

const HEARTBEAT_INTERVAL_MS = 25_000;
const RECONNECT_DELAY_MS = 2_000;
const DEFAULT_WAIT_TIMEOUT_MS = 10_000;

/**
 * WebRTC signaling can arrive before the React component that owns
 * the peer connection has subscribed.
 *
 * Keep signaling events for a short period so an OFFER, ANSWER,
 * ICE candidate, or MEDIA_STATE event is not lost because of a
 * React render/effect timing race.
 */
const WEBRTC_BUFFER_TTL_MS = 30_000;
const WEBRTC_BUFFER_MAX = 100;

type BufferedWebRTCEvent = {
    event: RealtimeWebRTCEvent;
    receivedAt: number;
};

type RealtimeWebRTCSubscription = {
    callId: string;
    listener: RealtimeWebRTCListener;
};

class RealtimeClient {
    private socket: WebSocket | null = null;

    private listeners =
        new Set<RealtimeListener>();

    private webRTCListeners =
        new Set<RealtimeWebRTCSubscription>();

    private bufferedWebRTCEvents: BufferedWebRTCEvent[] =
        [];

    private connectionStateListeners =
        new Set<ConnectionStateListener>();

    private reconnectTimer:
        ReturnType<typeof setTimeout> | null = null;

    private heartbeatTimer:
        ReturnType<typeof setInterval> | null = null;

    private stopped = true;

    private state: ConnectionState = "idle";

    private getUrl(): string {
        const apiUrl =
            process.env.NEXT_PUBLIC_API_URL ??
            "http://localhost:4000";

        const normalized = apiUrl
            .trim()
            .replace(/\/+$/, "");

        const websocketUrl = normalized
            .replace(/^https:\/\//i, "wss://")
            .replace(/^http:\/\//i, "ws://");

        return `${websocketUrl}/ws`;
    }

    get connectionState(): ConnectionState {
        return this.state;
    }

    /**
     * Subscribe to all realtime server events.
     */
    subscribe(listener: RealtimeListener) {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Subscribe specifically to WebRTC events for one call.
     *
     * Events that arrived before the subscription are replayed
     * immediately if they are still inside the signaling buffer TTL.
     */
    subscribeWebRTC(
        callId: string,
        listener: RealtimeWebRTCListener,
    ) {
        this.pruneBufferedWebRTCEvents();

        const subscription: RealtimeWebRTCSubscription =
            {
                callId,
                listener,
            };

        /*
         * Register first, then replay.
         *
         * JavaScript is single-threaded, so an onmessage callback
         * cannot interleave between these synchronous operations.
         */
        this.webRTCListeners.add(
            subscription,
        );

        const pending =
            this.bufferedWebRTCEvents.filter(
                (entry) =>
                    entry.event.callId === callId,
            );

        /*
         * These events have now been claimed by the WebRTC subscriber.
         * Remove them from the buffer so they are not delivered again.
         */
        this.bufferedWebRTCEvents =
            this.bufferedWebRTCEvents.filter(
                (entry) =>
                    entry.event.callId !== callId,
            );

        for (const entry of pending) {
            try {
                listener(entry.event);
            } catch (error) {
                console.error(
                    "[Realtime] Buffered WebRTC listener failed:",
                    error,
                );
            }
        }

        return () => {
            this.webRTCListeners.delete(
                subscription,
            );
        };
    }

    subscribeConnectionState(
        listener: ConnectionStateListener,
    ) {
        this.connectionStateListeners.add(
            listener,
        );

        return () => {
            this.connectionStateListeners.delete(
                listener,
            );
        };
    }

    private setState(
        state: ConnectionState,
    ) {
        if (this.state === state) {
            return;
        }

        this.state = state;

        for (const listener of this.connectionStateListeners) {
            try {
                listener(state);
            } catch (error) {
                console.error(
                    "[Realtime] Connection state listener failed:",
                    error,
                );
            }
        }
    }

    connect() {
        this.stopped = false;

        if (
            this.socket &&
            (
                this.socket.readyState ===
                    WebSocket.OPEN ||
                this.socket.readyState ===
                    WebSocket.CONNECTING
            )
        ) {
            return;
        }

        this.clearReconnectTimer();

        this.setState("connecting");

        const socket = new WebSocket(
            this.getUrl(),
        );

        this.socket = socket;

        socket.onopen = () => {
            if (this.socket !== socket) {
                return;
            }

            this.setState("open");
            this.startHeartbeat();

            console.log(
                "[Realtime] Connected:",
                this.getUrl(),
            );
        };

        socket.onmessage = (message) => {
            try {
                const parsed: unknown =
                    JSON.parse(message.data);

                if (
                    !parsed ||
                    typeof parsed !== "object"
                ) {
                    return;
                }

                const event =
                    parsed as RealtimeServerEvent;

                if (
                    typeof event.type !==
                    "string"
                ) {
                    return;
                }

                /*
                 * WebRTC events get their own delivery path.
                 *
                 * This is important because OFFER/ANSWER/ICE can arrive
                 * before useWebRTC() has mounted its subscription.
                 */
                if (this.isWebRTCEvent(event)) {
                    this.pruneBufferedWebRTCEvents();

                    const matchingListeners =
                        Array.from(
                            this.webRTCListeners,
                        ).filter(
                            (subscription) =>
                                subscription.callId ===
                                event.callId,
                        );

                    if (
                        matchingListeners.length >
                        0
                    ) {
                        for (const subscription of matchingListeners) {
                            try {
                                subscription.listener(
                                    event,
                                );
                            } catch (error) {
                                console.error(
                                    "[Realtime] WebRTC listener failed:",
                                    error,
                                );
                            }
                        }
                    } else {
                        /*
                         * No WebRTC subscriber exists yet.
                         *
                         * Keep the event temporarily so useWebRTC()
                         * can consume it when it mounts.
                         */
                        this.bufferWebRTCEvent(
                            event,
                        );
                    }
                }

                /*
                 * Continue delivering every event to the general
                 * realtime listener collection as well.
                 *
                 * This preserves existing call/presence/conversation
                 * behavior.
                 */
                for (const listener of this.listeners) {
                    try {
                        listener(event);
                    } catch (error) {
                        console.error(
                            "[Realtime] Listener failed:",
                            error,
                        );
                    }
                }
            } catch (error) {
                console.error(
                    "[Realtime] Invalid server event:",
                    error,
                );
            }
        };

        socket.onerror = (error) => {
            console.error(
                "[Realtime] WebSocket error:",
                error,
            );
        };

        socket.onclose = (event) => {
            if (this.socket !== socket) {
                return;
            }

            this.socket = null;

            this.stopHeartbeat();

            this.setState("closed");

            console.log(
                "[Realtime] Closed:",
                {
                    code: event.code,
                    reason: event.reason,
                },
            );

            if (!this.stopped) {
                this.scheduleReconnect();
            }
        };
    }

    async waitUntilOpen(
        timeoutMs = DEFAULT_WAIT_TIMEOUT_MS,
    ): Promise<boolean> {
        if (
            this.state === "open" &&
            this.socket?.readyState ===
                WebSocket.OPEN
        ) {
            return true;
        }

        this.connect();

        if (
            this.state === "open" &&
            this.socket?.readyState ===
                WebSocket.OPEN
        ) {
            return true;
        }

        return new Promise<boolean>(
            (resolve) => {
                let settled = false;

                let unsubscribe:
                    (() => void) | null = null;

                const finish = (
                    value: boolean,
                ) => {
                    if (settled) {
                        return;
                    }

                    settled = true;

                    clearTimeout(timeout);

                    unsubscribe?.();

                    resolve(value);
                };

                const timeout =
                    setTimeout(() => {
                        finish(false);
                    }, timeoutMs);

                unsubscribe =
                    this.subscribeConnectionState(
                        (state) => {
                            if (
                                state === "open"
                            ) {
                                finish(true);
                            }
                        },
                    );

                /*
                 * The socket may have opened between the initial
                 * check and registering the listener.
                 */
                if (
                    this.state === "open" &&
                    this.socket?.readyState ===
                        WebSocket.OPEN
                ) {
                    finish(true);
                }
            },
        );
    }

    disconnect() {
        this.stopped = true;

        this.clearReconnectTimer();
        this.stopHeartbeat();

        const socket = this.socket;

        this.socket = null;

        if (!socket) {
            this.setState("idle");
            return;
        }

        if (
            socket.readyState ===
            WebSocket.OPEN
        ) {
            socket.close(
                1000,
                "Client disconnected",
            );
        } else if (
            socket.readyState ===
            WebSocket.CONNECTING
        ) {
            socket.close();
        }

        this.setState("idle");
    }

    send(
        event: RealtimeClientEvent,
    ): boolean {
        const socket = this.socket;

        if (
            !socket ||
            socket.readyState !==
                WebSocket.OPEN
        ) {
            return false;
        }

        try {
            socket.send(
                JSON.stringify(event),
            );

            return true;
        } catch (error) {
            console.error(
                "[Realtime] Failed to send event:",
                error,
            );

            return false;
        }
    }

    private isWebRTCEvent(
        event: RealtimeServerEvent,
    ): event is RealtimeWebRTCEvent {
        return (
            event.type === "OFFER" ||
            event.type === "ANSWER" ||
            event.type === "ICE_CANDIDATE" ||
            event.type === "MEDIA_STATE"
        );
    }

    private bufferWebRTCEvent(
        event: RealtimeWebRTCEvent,
    ) {
        this.bufferedWebRTCEvents.push({
            event,
            receivedAt: Date.now(),
        });

        if (
            this.bufferedWebRTCEvents.length >
            WEBRTC_BUFFER_MAX
        ) {
            this.bufferedWebRTCEvents =
                this.bufferedWebRTCEvents.slice(
                    -WEBRTC_BUFFER_MAX,
                );
        }
    }

    private pruneBufferedWebRTCEvents() {
        const cutoff =
            Date.now() -
            WEBRTC_BUFFER_TTL_MS;

        this.bufferedWebRTCEvents =
            this.bufferedWebRTCEvents.filter(
                (entry) =>
                    entry.receivedAt >=
                    cutoff,
            );
    }

    private startHeartbeat() {
        this.stopHeartbeat();

        this.heartbeatTimer =
            setInterval(() => {
                this.send({
                    type: "PING",
                });
            }, HEARTBEAT_INTERVAL_MS);
    }

    private stopHeartbeat() {
        if (
            this.heartbeatTimer !== null
        ) {
            clearInterval(
                this.heartbeatTimer,
            );

            this.heartbeatTimer = null;
        }
    }

    private scheduleReconnect() {
        if (
            this.stopped ||
            this.reconnectTimer !== null
        ) {
            return;
        }

        this.reconnectTimer =
            setTimeout(() => {
                this.reconnectTimer = null;

                this.connect();
            }, RECONNECT_DELAY_MS);
    }

    private clearReconnectTimer() {
        if (
            this.reconnectTimer !== null
        ) {
            clearTimeout(
                this.reconnectTimer,
            );

            this.reconnectTimer = null;
        }
    }
}

export const realtimeClient =
    new RealtimeClient();