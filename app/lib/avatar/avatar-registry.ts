import {
    AVATAR_RENDER_MODE,
    AVATAR_TYPE,
    type AvatarDefinition,
} from "@/app/types/avatar/avatar.types";

/**
 * Local avatar catalog.
 *
 * This is the source of truth for avatars available to the first
 * client-side avatar implementation.
 *
 * The registry is intentionally independent of:
 * - WebRTC
 * - calling
 * - authentication
 * - backend APIs
 * - avatar rendering
 */
export const AVATAR_REGISTRY: readonly AvatarDefinition[] = [
    {
        id: "default-vrm",
        name: "Miyor Default",
        type: AVATAR_TYPE.VRM,
        renderMode: AVATAR_RENDER_MODE.VRM,
        thumbnailUrl: "/avatars/default-avatar.webp",
        assetUrl: "/avatars/default-avatar.vrm",
        enabled: true,
        capabilities: {
            headTracking: true,
            eyeTracking: true,
            mouthTracking: true,
            facialExpressions: true,
        },
    },
    {
        id: "static-test-avatar",
        name: "Miyor Static",
        type: AVATAR_TYPE.IMAGE,
        renderMode: AVATAR_RENDER_MODE.STATIC,
        thumbnailUrl: "/avatars/static-test-avatar.svg",
        assetUrl: "/avatars/static-test-avatar.svg",
        enabled: true,
    },
] as const;

/**
 * Returns all currently available avatars.
 *
 * Only enabled avatars are returned because this function represents
 * the selectable catalog presented to the user.
 */
export function getAvailableAvatars(): readonly AvatarDefinition[] {
    return AVATAR_REGISTRY.filter((avatar) => avatar.enabled);
}

/**
 * Finds an avatar by its stable registry ID.
 *
 * Returns null when the avatar does not exist or is not available
 * in the local registry.
 */
export function getAvatarById(
    avatarId: string,
): AvatarDefinition | null {
    return (
        AVATAR_REGISTRY.find(
            (avatar) => avatar.id === avatarId,
        ) ?? null
    );
}

/**
 * Returns the default avatar for the application.
 *
 * The first enabled avatar is currently considered the default.
 * This keeps default selection centralized in the registry rather
 * than duplicated throughout UI components.
 */
export function getDefaultAvatar(): AvatarDefinition | null {
    return getAvailableAvatars()[0] ?? null;
}