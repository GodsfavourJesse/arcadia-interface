// app/lib/avatar/avatar-renderer.ts

import type {
    AvatarDefinition,
    AvatarTrackingState,
} from "@/app/types/avatar/avatar.types";

/**
 * Rendering contract for all Miyor avatar implementations.
 *
 * The avatar engine depends on this interface rather than on a
 * specific rendering technology.
 *
 * Implementations may include:
 * - VRM / Three.js
 * - 2D rigged avatars
 * - static image avatars
 *
 * Renderers own their internal rendering resources and are responsible
 * for releasing those resources in dispose().
 */
export interface AvatarRenderer {
    /**
     * Load the supplied avatar into this renderer.
     *
     * Implementations should reject when the supplied avatar is
     * incompatible with the renderer.
     */
    load(avatar: AvatarDefinition): Promise<void>;

    /**
     * Apply the latest local tracking state to the avatar.
     *
     * This method is called continuously by the avatar render loop.
     */
    update(tracking: AvatarTrackingState): void;

    /**
     * Optional local camera source used by face-swap renderers.
     * Camera frames remain local to the browser.
     */
    setCameraSource?(video: HTMLVideoElement | null): void;

    /**
     * Update the renderer and camera to match the available canvas size.
     */
    resize(width: number, height: number): void;

    /**
     * Release all renderer-owned resources.
     *
     * Implementations must be safe to call during component teardown.
     */
    dispose(): void;

    /**
     * Returns the canvas owned by this renderer.
     *
     * The canvas is also the surface that may later be captured
     * using HTMLCanvasElement.captureStream().
     */
    getCanvas(): HTMLCanvasElement;
}