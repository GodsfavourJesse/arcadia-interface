import type {
    AvatarDefinition,
    AvatarTrackingState,
} from "@/app/types/avatar/avatar.types";
import type { AvatarRenderer } from "./avatar-renderer";

export class StaticRenderer implements AvatarRenderer {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;

    private image: HTMLImageElement | null = null;
    private disposed = false;

    private width = 1;
    private height = 1;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error(
                "Unable to create a 2D rendering context for the static avatar.",
            );
        }

        this.context = context;

        this.context.imageSmoothingEnabled = true;

        this.resize(
            Math.max(canvas.clientWidth, 1),
            Math.max(canvas.clientHeight, 1),
        );
    }

    async load(avatar: AvatarDefinition): Promise<void> {
        if (this.disposed) {
            return;
        }

        this.image = await loadImage(avatar.assetUrl);

        if (this.disposed) {
            this.image = null;
            return;
        }

        this.render();
    }

    update(_tracking: AvatarTrackingState): void {
        if (this.disposed) {
            return;
        }

        /*
         * Static avatars intentionally ignore face-tracking data.
         *
         * A static image has no facial rig, bones, morph targets,
         * or other animation parameters to update.
         */
        this.render();
    }

    resize(width: number, height: number): void {
        if (this.disposed) {
            return;
        }

        this.width = Math.max(Math.floor(width), 1);
        this.height = Math.max(Math.floor(height), 1);

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.render();
    }

    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        this.image = null;

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

    private render(): void {
        if (this.disposed) {
            return;
        }

        this.context.clearRect(
            0,
            0,
            this.width,
            this.height,
        );

        const image = this.image;

        if (!image) {
            return;
        }

        drawCover(
            this.context,
            image,
            this.width,
            this.height,
        );
    }
}

function loadImage(
    source: string,
): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => {
            resolve(image);
        };

        image.onerror = () => {
            reject(
                new Error(
                    `Failed to load static avatar image: ${source}`,
                ),
            );
        };

        image.src = source;
    });
}

function drawCover(
    context: CanvasRenderingContext2D,
    image: HTMLImageElement,
    canvasWidth: number,
    canvasHeight: number,
): void {
    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;

    if (
        imageWidth <= 0 ||
        imageHeight <= 0
    ) {
        return;
    }

    const scale = Math.max(
        canvasWidth / imageWidth,
        canvasHeight / imageHeight,
    );

    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;

    const x = (canvasWidth - drawWidth) / 2;
    const y = (canvasHeight - drawHeight) / 2;

    context.drawImage(
        image,
        x,
        y,
        drawWidth,
        drawHeight,
    );
}