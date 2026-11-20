const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const MAX_FRAME_EDGE = 720;
const OUTPUT_FPS = 24;

type ReadyMessage = {
    type: "ready";
    runtime?: { device?: string; provider?: string };
};

type ControlMessage = {
    type?: string;
    message?: string;
    inferenceMs?: number;
    runtime?: { device?: string; provider?: string };
};

export class LiveFaceSwapProcessor {
    readonly stream: MediaStream;
    readonly videoTrack: MediaStreamTrack;
    readonly canvas: HTMLCanvasElement;

    private readonly source: HTMLVideoElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly inputCanvas: HTMLCanvasElement;
    private readonly inputContext: CanvasRenderingContext2D;
    private readonly socket: WebSocket;
    private frameCallback: number | null = null;
    private timer: number | null = null;
    private inFlight = false;
    private stopped = false;
    private initialized = false;
    private readyReject: ((reason: Error) => void) | null = null;
    private closeHandler: (() => void) | null = null;
    private frameCount = 0;
    private lastInferenceMs = 0;
    private sourceWidth = 0;
    private sourceHeight = 0;
    private fpsWindowStartedAt = 0;
    private fpsWindowFrameCount = 0;
    private measuredFps = 0;
    runtime: ReadyMessage["runtime"] = undefined;

    private constructor(source: HTMLVideoElement, callId: string) {
        this.source = source;
        this.canvas = document.createElement("canvas");
        this.inputCanvas = document.createElement("canvas");
        this.resize();

        const outputContext = this.canvas.getContext("2d", { alpha: false, desynchronized: true });
        const inputContext = this.inputCanvas.getContext("2d", { alpha: false, desynchronized: true });
        if (!outputContext || !inputContext) throw new Error("This browser cannot initialize the face-swap video surface.");
        this.context = outputContext;
        this.inputContext = inputContext;
        if (this.source.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            this.context.drawImage(this.source, 0, 0, this.canvas.width, this.canvas.height);
        }

        const apiUrl = new URL(API_BASE_URL);
        apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
        apiUrl.pathname = `${apiUrl.pathname.replace(/\/$/, "")}/face-engine/live`;
        apiUrl.searchParams.set("callId", callId);
        this.socket = new WebSocket(apiUrl);
        this.socket.binaryType = "blob";

        const output = this.canvas.captureStream(OUTPUT_FPS);
        const track = output.getVideoTracks()[0];
        if (!track) throw new Error("MIYOR could not create a processed call video track.");
        this.stream = output;
        this.videoTrack = track;
    }

    static async start(source: HTMLVideoElement, callId: string, referenceImage: string): Promise<LiveFaceSwapProcessor> {
        const processor = new LiveFaceSwapProcessor(source, callId);
        processor.bindFrameHandler();
        try {
            const ready = await processor.connect(referenceImage);
            processor.runtime = ready.runtime;
            processor.initialized = true;
            processor.scheduleFrame();
            return processor;
        } catch (error) {
            processor.stop();
            throw error;
        }
    }

    get diagnostics() {
        return {
            framesRendered: this.frameCount,
            lastInferenceMs: this.lastInferenceMs,
            processedFps: this.measuredFps,
            width: this.canvas.width,
            height: this.canvas.height,
        };
    }

    stop(): void {
        if (this.stopped) return;
        this.stopped = true;
        this.initialized = false;
        if (this.frameCallback !== null && "cancelVideoFrameCallback" in this.source) {
            (this.source as HTMLVideoElement & { cancelVideoFrameCallback(id: number): void })
                .cancelVideoFrameCallback(this.frameCallback);
        }
        if (this.timer !== null) window.clearTimeout(this.timer);
        this.frameCallback = null;
        this.timer = null;
        this.socket.close(1000, "Face effect stopped.");
        this.stream.getTracks().forEach((track) => track.stop());
        this.readyReject?.(new Error("The live face-swap connection closed."));
    }

    private async connect(referenceImage: string): Promise<ReadyMessage> {
        await new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(() => reject(new Error("The face-swap service did not connect in time.")), 15_000);
            this.socket.addEventListener("open", () => {
                window.clearTimeout(timeout);
                this.socket.send(JSON.stringify({ type: "start", referenceImage }));
                resolve();
            }, { once: true });
            this.socket.addEventListener("error", () => {
                window.clearTimeout(timeout);
                reject(new Error("MIYOR could not connect to the private face-swap service."));
            }, { once: true });
            this.socket.addEventListener("close", (event) => {
                window.clearTimeout(timeout);
                if (!this.initialized) {
                    const error = new Error(event.reason || "The face-swap service closed the connection.");
                    this.readyReject?.(error);
                    reject(error);
                }
                else this.closeHandler?.();
            });
        });

        const ready = await new Promise<ReadyMessage>((resolve, reject) => {
            this.readyReject = reject;
            const timeout = window.setTimeout(() => reject(new Error("The licensed face-swap model did not become ready.")), 45_000);
            const onMessage = (event: MessageEvent) => {
                if (typeof event.data !== "string") return;
                let message: ControlMessage;
                try { message = JSON.parse(event.data) as ControlMessage; }
                catch { return; }
                if (message.type === "ready") {
                    window.clearTimeout(timeout);
                    this.socket.removeEventListener("message", onMessage);
                    resolve(message as ReadyMessage);
                } else if (message.type === "error") {
                    window.clearTimeout(timeout);
                    this.socket.removeEventListener("message", onMessage);
                    reject(new Error(message.message || "The face-swap model could not start."));
                }
            };
            this.socket.addEventListener("message", onMessage);
            this.readyReject = (error) => {
                window.clearTimeout(timeout);
                this.socket.removeEventListener("message", onMessage);
                reject(error);
            };
        });
        this.readyReject = null;
        return ready;
    }

    private resize(): void {
        const sourceWidth = this.source.videoWidth || 640;
        const sourceHeight = this.source.videoHeight || 360;
        this.sourceWidth = sourceWidth;
        this.sourceHeight = sourceHeight;
        const scale = Math.min(1, MAX_FRAME_EDGE / Math.max(sourceWidth, sourceHeight));
        const width = Math.max(2, Math.round(sourceWidth * scale / 2) * 2);
        const height = Math.max(2, Math.round(sourceHeight * scale / 2) * 2);
        this.canvas.width = width;
        this.canvas.height = height;
        this.inputCanvas.width = width;
        this.inputCanvas.height = height;
    }

    private scheduleFrame(): void {
        if (this.stopped || !this.initialized) return;
        if ("requestVideoFrameCallback" in this.source) {
            this.frameCallback = (this.source as HTMLVideoElement & {
                requestVideoFrameCallback(callback: (now: number, metadata: unknown) => void): number;
            }).requestVideoFrameCallback(() => {
                void this.processFrame();
                this.scheduleFrame();
            });
        } else {
            this.timer = window.setTimeout(() => {
                void this.processFrame();
                this.scheduleFrame();
            }, 1000 / OUTPUT_FPS);
        }
    }

    private async processFrame(): Promise<void> {
        if (this.stopped || !this.initialized || this.inFlight || this.socket.readyState !== WebSocket.OPEN) return;
        if (this.source.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        if (this.source.videoWidth !== this.sourceWidth || this.source.videoHeight !== this.sourceHeight) this.resize();
        this.inFlight = true;
        try {
            this.inputContext.drawImage(this.source, 0, 0, this.inputCanvas.width, this.inputCanvas.height);
            const frame = await new Promise<Blob>((resolve, reject) => {
                this.inputCanvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not encode a camera frame.")), "image/jpeg", 0.78);
            });
            if (frame.size > 1_500_000) throw new Error("The camera frame exceeds the live processing limit.");
            if (this.socket.readyState === WebSocket.OPEN) this.socket.send(frame);
            else this.inFlight = false;
        } catch {
            this.inFlight = false;
        }
    }

    handleMessage(event: MessageEvent): void {
        if (typeof event.data === "string") {
            try {
                const message = JSON.parse(event.data) as ControlMessage;
                if (message.type === "frame") this.lastInferenceMs = message.inferenceMs ?? this.lastInferenceMs;
            } catch { /* Ignore control messages not needed by the renderer. */ }
            return;
        }
        void createImageBitmap(event.data as Blob).then((bitmap) => {
            if (!this.stopped) {
                this.context.drawImage(bitmap, 0, 0, this.canvas.width, this.canvas.height);
                this.frameCount += 1;
                const now = performance.now();
                if (!this.fpsWindowStartedAt) this.fpsWindowStartedAt = now;
                this.fpsWindowFrameCount += 1;
                const elapsed = now - this.fpsWindowStartedAt;
                if (elapsed >= 1000) {
                    this.measuredFps = this.fpsWindowFrameCount * 1000 / elapsed;
                    this.fpsWindowStartedAt = now;
                    this.fpsWindowFrameCount = 0;
                }
            }
            bitmap.close();
        }).finally(() => {
            this.inFlight = false;
        });
    }

    setOnClosed(callback: () => void): void {
        this.closeHandler = callback;
    }

    bindFrameHandler(): void {
        this.socket.addEventListener("message", (event) => this.handleMessage(event));
    }
}
