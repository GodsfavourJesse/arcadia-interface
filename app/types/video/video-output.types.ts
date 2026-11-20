export type VideoOutputState =
    | "idle"
    | "starting"
    | "ready"
    | "stopped"
    | "error";

export interface VideoOutputSettings {
    width?: number;
    height?: number;
    frameRate?: number;
    mirror?: boolean;
}

export interface VideoOutputDiagnostics {
    state: VideoOutputState;
    width: number;
    height: number;
    frameRate: number;
    trackId: string | null;
    trackReadyState: MediaStreamTrack["readyState"] | null;
    trackEnabled: boolean | null;
    trackMuted: boolean | null;
}

export interface VideoOutput {
    readonly state: VideoOutputState;

    start(): Promise<MediaStreamTrack>;

    stop(): void;

    render(video: HTMLVideoElement): void;

    getCanvas(): HTMLCanvasElement;

    getStream(): MediaStream | null;

    getTrack(): MediaStreamTrack | null;

    getDiagnostics(): VideoOutputDiagnostics;
}