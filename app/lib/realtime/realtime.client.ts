"use client";

import type {
    RealtimeClientEvent,
    RealtimeServerEvent,
} from "@/app/types/realtime/realtime.types";

type RealtimeListener = (
    event: RealtimeServerEvent,
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

class RealtimeClient {
    private socket: WebSocket | null = null;

    private listeners =
        new Set<RealtimeListener>();

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

    subscribe(listener: RealtimeListener) {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
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
                this.socket.readyState === WebSocket.OPEN ||
                this.socket.readyState === WebSocket.CONNECTING
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

                const timeout =
                    setTimeout(() => {
                        finish(false);
                    }, timeoutMs);

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

                unsubscribe =
                    this.subscribeConnectionState(
                        (state) => {
                            if (
                                state ===
                                "open"
                            ) {
                                finish(true);
                            }
                        },
                    );

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