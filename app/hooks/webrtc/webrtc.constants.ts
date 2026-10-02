export const DEFAULT_ICE_SERVERS: RTCConfiguration =
    {
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                ],
            },
        ],
    };

export const DEFAULT_ICE_SERVER_LIST: RTCIceServer[] =
    DEFAULT_ICE_SERVERS.iceServers ?? [];

export const AVATAR_CAPTURE_FPS = 30;