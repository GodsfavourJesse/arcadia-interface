import type {
    VideoOutput,
    VideoOutputDiagnostics,
    VideoOutputSettings,
    VideoOutputState,
} from "../../types/video/video-output.types";

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const DEFAULT_FRAME_RATE = 30;

export class CanvasVideoOutput implements VideoOutput {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;

    private stream: MediaStream | null = null;
    private track: MediaStreamTrack | null = null;

    private outputState: VideoOutputState = "idle";

    private width: number;
    private height: number;
    private frameRate: number;
    private mirror: boolean;

    constructor(settings: VideoOutputSettings = {}) {
        this.width = settings.width ?? DEFAULT_WIDTH;
        this.height = settings.height ?? DEFAULT_HEIGHT;
        this.frameRate = settings.frameRate ?? DEFAULT_FRAME_RATE;
        this.mirror = settings.mirror ?? false;

        this.canvas = document.createElement("canvas");

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        const context = this.canvas.getContext("2d", {
            alpha: false,
            desynchronized: true,
        });

        if (!context) {
            throw new Error("Unable to create 2D canvas context.");
        }

        this.context = context;
    }

    get state(): VideoOutputState {
        return this.outputState;
    }

    async start(): Promise<MediaStreamTrack> {
        if (this.track && this.track.readyState === "live") {
            return this.track;
        }

        this.outputState = "starting";

        try {
            this.canvas.width = this.width;
            this.canvas.height = this.height;

            this.stream = this.canvas.captureStream(this.frameRate);

            const [track] = this.stream.getVideoTracks();

            if (!track) {
                throw new Error(
                    "Canvas captureStream did not produce a video track.",
                );
            }

            this.track = track;

            this.outputState = "ready";

            return track;
        } catch (error) {
            this.outputState = "error";

            throw error;
        }
    }

    stop(): void {
        if (this.track) {
            this.track.stop();
            this.track = null;
        }

        if (this.stream) {
            for (const track of this.stream.getTracks()) {
                track.stop();
            }

            this.stream = null;
        }

        this.outputState = "stopped";
    }

    render(video: HTMLVideoElement): void {
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            return;
        }

        if (video.videoWidth <= 0 || video.videoHeight <= 0) {
            return;
        }

        const sourceWidth = video.videoWidth;
        const sourceHeight = video.videoHeight;

        const sourceAspect = sourceWidth / sourceHeight;
        const outputAspect = this.width / this.height;

        let drawWidth: number;
        let drawHeight: number;
        let offsetX: number;
        let offsetY: number;

        if (sourceAspect > outputAspect) {
            drawHeight = this.height;
            drawWidth = drawHeight * sourceAspect;

            offsetX = (this.width - drawWidth) / 2;
            offsetY = 0;
        } else {
            drawWidth = this.width;
            drawHeight = drawWidth / sourceAspect;

            offsetX = 0;
            offsetY = (this.height - drawHeight) / 2;
        }

        this.context.save();

        this.context.clearRect(0, 0, this.width, this.height);

        if (this.mirror) {
            this.context.translate(this.width, 0);
            this.context.scale(-1, 1);
        }

        this.context.drawImage(
            video,
            offsetX,
            offsetY,
            drawWidth,
            drawHeight,
        );

        this.context.restore();
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    getStream(): MediaStream | null {
        return this.stream;
    }

    getTrack(): MediaStreamTrack | null {
        return this.track;
    }

    getDiagnostics(): VideoOutputDiagnostics {
        return {
            state: this.outputState,
            width: this.width,
            height: this.height,
            frameRate: this.frameRate,
            trackId: this.track?.id ?? null,
            trackReadyState: this.track?.readyState ?? null,
            trackEnabled: this.track?.enabled ?? null,
            trackMuted: this.track?.muted ?? null,
        };
    }
}