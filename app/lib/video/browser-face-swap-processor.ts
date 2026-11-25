"use client";

import {
    createFaceSwap,
    type FaceSwap,
    type ModelSet,
    type Progress,
    type Stats,
} from "@/vendor/browser-inswapper/dist/index.js";

const MODEL_BASE_URL = (process.env.NEXT_PUBLIC_MIYOR_FACE_SWAP_MODEL_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
const SWAPPER_SHA256 = process.env.NEXT_PUBLIC_MIYOR_FACE_SWAP_SWAPPER_SHA256?.trim() ?? "";
const ARCFACE_SHA256 = process.env.NEXT_PUBLIC_MIYOR_FACE_SWAP_ARCFACE_SHA256?.trim() ?? "";
const SWAPPER_FP16_SHA256 = process.env.NEXT_PUBLIC_MIYOR_FACE_SWAP_SWAPPER_FP16_SHA256?.trim() ?? "";
const OUTPUT_MAX_FPS = 24;
const WORKER_ROOT = "/vendor/browser-inswapper";

type SwapStats = Pick<Stats, "fps" | "inferMs" | "backend" | "latencyMs">;

function requireModelConfiguration(): ModelSet {
    if (!MODEL_BASE_URL) {
        throw new Error(
            "On-device face swap needs a licensed model download URL. Set NEXT_PUBLIC_MIYOR_FACE_SWAP_MODEL_BASE_URL in the web app, then restart it.",
        );
    }

    if (!/^https:\/\//i.test(MODEL_BASE_URL) && !/^http:\/\/localhost(?::\d+)?(?:\/|$)/i.test(MODEL_BASE_URL)) {
        throw new Error("Face-swap model files must be served over HTTPS.");
    }

    if (!/^[a-f\d]{64}$/i.test(SWAPPER_SHA256) || !/^[a-f\d]{64}$/i.test(ARCFACE_SHA256)) {
        throw new Error(
            "Configure the SHA-256 fingerprints for the licensed swapper and face-analysis model files.",
        );
    }

    const modelUrl = (filename: string) => `${MODEL_BASE_URL}/${filename}`;
    const models: ModelSet = {
        swapperFp32: {
            url: modelUrl("inswapper_128.onnx"),
            sha256: SWAPPER_SHA256,
        },
        arcface: {
            url: modelUrl("w600k_r50.onnx"),
            sha256: ARCFACE_SHA256,
        },
    };

    if (SWAPPER_FP16_SHA256) {
        if (!/^[a-f\d]{64}$/i.test(SWAPPER_FP16_SHA256)) {
            throw new Error("The optional FP16 swapper SHA-256 must contain 64 hexadecimal characters.");
        }
        models.swapperFp16 = {
            url: modelUrl("inswapper_128_fp16.onnx"),
            sha256: SWAPPER_FP16_SHA256,
        };
    }

    return models;
}

/** Runs the approved browser engine locally and exposes its output as a WebRTC-ready track. */
export class BrowserFaceSwapProcessor {
    readonly stream: MediaStream;
    readonly videoTrack: MediaStreamTrack;
    readonly runtime: { device: string; provider: string };

    private readonly engine: FaceSwap;
    private readonly inputTrack: MediaStreamTrack;
    private stopped = false;
    private closeHandler: (() => void) | null = null;
    private framesRendered = 0;
    private stats: SwapStats = {
        fps: 0,
        inferMs: 0,
        backend: "wasm",
        latencyMs: 0,
    };
    private readonly handleInputEnded = () => {
        if (!this.stopped) this.closeHandler?.();
    };

    private constructor(engine: FaceSwap, inputTrack: MediaStreamTrack, videoTrack: MediaStreamTrack, stats: Stats) {
        this.engine = engine;
        this.inputTrack = inputTrack;
        this.videoTrack = videoTrack;
        this.stream = new MediaStream([videoTrack]);
        this.runtime = { device: "this device", provider: engine.backend };
        this.stats = stats;
        this.inputTrack.addEventListener("ended", this.handleInputEnded);
        this.videoTrack.addEventListener("ended", this.handleInputEnded);
    }

    static async start(
        inputTrack: MediaStreamTrack,
        referencePhoto: File,
        onProgress?: (progress: Progress) => void,
    ): Promise<BrowserFaceSwapProcessor> {
        if (typeof window === "undefined" || typeof document === "undefined") {
            throw new Error("On-device face swap can only start in a supported browser.");
        }
        if (!inputTrack || inputTrack.readyState !== "live") {
            throw new Error("Turn on your camera, then try the face effect again.");
        }
        if (!navigator.mediaDevices || typeof HTMLCanvasElement.prototype.captureStream !== "function") {
            throw new Error("This browser does not support processed video tracks. Try the latest Chrome, Edge, or Safari.");
        }

        let latestStats: Stats = { fps: 0, inferMs: 0, backend: "wasm", latencyMs: 0 };
        const engine = await createFaceSwap({
            models: requireModelConfiguration(),
            backend: "auto",
            tracking: "GPU",
            occlusion: true,
            onStats: (nextStats) => {
                latestStats = nextStats;
            },
            onProgress,
            workers: {
                swap: `${WORKER_ROOT}/worker.js`,
                occlusion: `${WORKER_ROOT}/segment-worker.js`,
            },
        });

        try {
            await engine.setIdentity({ image: referencePhoto });
            const outputTrack = engine.process(inputTrack, { maxFps: OUTPUT_MAX_FPS });
            const processor = new BrowserFaceSwapProcessor(engine, inputTrack, outputTrack, latestStats);
            processor.setStatsReader(() => latestStats);
            return processor;
        } catch (error) {
            engine.dispose();
            throw error;
        }
    }

    private statsReader: (() => Stats) | null = null;

    private setStatsReader(reader: () => Stats) {
        this.statsReader = reader;
    }

    get diagnostics() {
        const latest = this.statsReader?.() ?? this.stats;
        return {
            framesRendered: this.framesRendered + (latest.fps > 0 || latest.latencyMs > 0 ? 1 : 0),
            lastInferenceMs: latest.inferMs,
            processedFps: latest.fps,
            latencyMs: latest.latencyMs,
            backend: latest.backend,
            width: this.videoTrack.getSettings().width ?? 0,
            height: this.videoTrack.getSettings().height ?? 0,
        };
    }

    async updateIdentity(referencePhoto: File): Promise<void> {
        if (this.stopped) throw new Error("The face-swap effect has already stopped.");
        await this.engine.setIdentity({ image: referencePhoto }, { morphMs: 450 });
    }

    setOnClosed(callback: () => void): void {
        this.closeHandler = callback;
    }

    stop(): void {
        if (this.stopped) return;
        this.stopped = true;
        this.inputTrack.removeEventListener("ended", this.handleInputEnded);
        this.videoTrack.removeEventListener("ended", this.handleInputEnded);
        this.engine.dispose();
        this.stream.getTracks().forEach((track) => track.stop());
        this.framesRendered = Math.max(this.framesRendered, 1);
    }
}
