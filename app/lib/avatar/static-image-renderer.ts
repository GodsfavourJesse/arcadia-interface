import type {
    AvatarDefinition,
    AvatarTrackingState,
} from "@/app/types/avatar/avatar.types";

import type { AvatarRenderer } from "./avatar-renderer";

/**
 * Static image renderer used for the first version of uploaded-photo calls.
 *
 * The important boundary is that WebRTC receives the canvas capture, not
 * the user's local blob URL. The image is decoded and painted into the
 * canvas locally, and canvas.captureStream() turns those pixels into the
 * outgoing video track.
 *
 * No face tracking or animation is intentionally performed here.
 */
export class StaticImageRenderer implements AvatarRenderer {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;

    private image: HTMLImageElement | null = null;
    private disposed = false;
    private width = 1;
    private height = 1;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        const context = canvas.getContext("2d", {
            alpha: false,
            desynchronized: true,
        });

        if (!context) {
            throw new Error(
                "Unable to create a 2D context for the uploaded image avatar.",
            );
        }

        this.context = context;
        this.context.imageSmoothingEnabled = true;
        this.context.imageSmoothingQuality = "high";

        this.resize(
            Math.max(canvas.clientWidth, 1),
            Math.max(canvas.clientHeight, 1),
        );
    }

    async load(avatar: AvatarDefinition): Promise<void> {
        if (this.disposed) {
            return;
        }

        const image = await loadImage(avatar.assetUrl);

        if (this.disposed) {
            return;
        }

        this.image = image;
        this.paint();

        console.info("[Miyor Avatar] Uploaded image painted to capture canvas", {
            avatarId: avatar.id,
            imageWidth: image.naturalWidth,
            imageHeight: image.naturalHeight,
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height,
        });
    }

    /**
     * Deliberately does nothing for now.
     *
     * The next avatar phase can use this method to apply face tracking
     * without changing the WebRTC/canvas media pipeline.
     */
    update(_tracking: AvatarTrackingState): void {
        // Static image phase: keep the already-painted image unchanged.
    }

    resize(width: number, height: number): void {
        if (this.disposed) {
            return;
        }

        this.width = Math.max(Math.floor(width), 1);
        this.height = Math.max(Math.floor(height), 1);

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.context.imageSmoothingEnabled = true;
        this.context.imageSmoothingQuality = "high";

        this.paint();
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        this.image = null;

        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height,
        );
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    private paint(): void {
        if (this.disposed || !this.image) {
            return;
        }

        const image = this.image;

        this.context.save();
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.clearRect(0, 0, this.width, this.height);

        /*
         * object-cover equivalent:
         * fill the complete outgoing video frame without distortion.
         */
        const scale = Math.max(
            this.width / image.naturalWidth,
            this.height / image.naturalHeight,
        );

        const drawWidth = image.naturalWidth * scale;
        const drawHeight = image.naturalHeight * scale;
        const x = (this.width - drawWidth) / 2;
        const y = (this.height - drawHeight) / 2;

        this.context.drawImage(
            image,
            x,
            y,
            drawWidth,
            drawHeight,
        );

        this.context.restore();
    }
}

function loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.decoding = "async";
        image.onload = () => resolve(image);
        image.onerror = () =>
            reject(
                new Error(
                    `Unable to load uploaded avatar image: ${source}`,
                ),
            );

        image.src = source;
    });
}
