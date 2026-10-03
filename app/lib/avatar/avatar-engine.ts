import type {
    AvatarDefinition,
    AvatarTrackingState,
} from "@/app/types/avatar/avatar.types";
import type { AvatarRenderer } from "./avatar-renderer";

/**
 * Factory responsible for creating the renderer appropriate for an avatar.
 *
 * AvatarEngine does not know how individual renderer implementations
 * work. The factory keeps that implementation detail outside the engine.
 */
export type AvatarRendererFactory = (
    avatar: AvatarDefinition,
    canvas: HTMLCanvasElement,
) => AvatarRenderer;

/**
 * Coordinates the lifecycle of the currently active avatar renderer.
 *
 * Responsibilities:
 * - create the appropriate renderer
 * - load avatars
 * - safely switch between avatars
 * - forward tracking updates
 * - handle resizing
 * - dispose renderer resources
 *
 * AvatarEngine has no knowledge of:
 * - React
 * - MediaPipe
 * - WebRTC
 * - calling
 * - networking
 */
export class AvatarEngine {
    private renderer: AvatarRenderer | null = null;

    private readonly createRenderer: AvatarRendererFactory;

    private operationId = 0;

    constructor(createRenderer: AvatarRendererFactory) {
        this.createRenderer = createRenderer;
    }

    /**
     * Loads and activates an avatar.
     *
     * The existing renderer remains active until the new renderer has
     * successfully loaded. This prevents the avatar canvas from going
     * blank when switching avatars.
     *
     * If loading fails, the existing renderer remains untouched.
     */
    async setAvatar(
        avatar: AvatarDefinition,
        canvas: HTMLCanvasElement,
    ): Promise<void> {
        const currentOperationId = ++this.operationId;
        const previousRenderer = this.renderer;

        const nextRenderer = this.createRenderer(
            avatar,
            canvas,
        );

        console.log("[AvatarEngine] Loading avatar renderer", {
            avatarId: avatar.id,
            avatarName: avatar.name,
            avatarType: avatar.type,
            renderMode: avatar.renderMode,
            renderer: nextRenderer.constructor.name,
            assetUrl: avatar.assetUrl,
        });

        try {
            await nextRenderer.load(avatar);
        } catch (error) {
            nextRenderer.dispose();
            throw error;
        }

        /**
         * A newer setAvatar() call may have started while this avatar
         * was loading. In that case this renderer is stale and must
         * never replace the newer renderer.
         */
        if (currentOperationId !== this.operationId) {
            nextRenderer.dispose();
            return;
        }

        this.renderer = nextRenderer;

        /**
         * Only dispose the previous renderer after the replacement
         * has loaded successfully and has become active.
         */
        if (previousRenderer && previousRenderer !== nextRenderer) {
            previousRenderer.dispose();
        }
    }

    /**
     * Applies the latest tracking state to the active renderer.
     */
    update(tracking: AvatarTrackingState): void {
        this.renderer?.update(tracking);
    }

    /**
     * Resizes the active renderer.
     */
    resize(width: number, height: number): void {
        this.renderer?.resize(width, height);
    }

    /**
     * Returns the canvas owned by the active renderer.
     */
    getCanvas(): HTMLCanvasElement | null {
        return this.renderer?.getCanvas() ?? null;
    }

    /**
     * Disposes the active renderer and invalidates any avatar load
     * currently in progress.
     */
    dispose(): void {
        this.operationId += 1;

        const renderer = this.renderer;

        this.renderer = null;

        renderer?.dispose();
    }
}