export type VideoSourceState =
    | "idle"
    | "starting"
    | "ready"
    | "stopped"
    | "error";

export type VideoFrameCallback = (
    frame: VideoFrame,
    timestamp: number,
) => void | Promise<void>;

export type VideoSourceSettings = {
    width: number;
    height: number;
    frameRate: number;
    facingMode?: string;
};

export type VideoSourceDiagnostics = {
    streamId: string;
    trackId: string;
    readyState: MediaStreamTrackState;
    enabled: boolean;
    muted: boolean;
    settings: MediaTrackSettings;
};
