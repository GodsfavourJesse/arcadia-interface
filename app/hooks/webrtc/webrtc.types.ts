export type WebRTCConnectionState =
    | "idle"
    | "requesting-media"
    | "connecting"
    | "connected"
    | "disconnected"
    | "failed"
    | "closed";

export type IceServerResponse = {
    urls:
        | string
        | string[];
    username?: string | null;
    credential?: string | null;
};