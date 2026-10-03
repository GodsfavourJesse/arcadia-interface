"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import type {
    AvatarDefinition,
} from "@/app/types/avatar/avatar.types";

import {
    getAvailableAvatars,
    getDefaultAvatar,
} from "@/app/lib/avatar/avatar-registry";

type UseAvatarSelectionOptions = {
    initialAvatarId?: string | null;
    extraAvatars?: readonly AvatarDefinition[];
};

export function useAvatarSelection({
    initialAvatarId = null,
    extraAvatars = [],
}: UseAvatarSelectionOptions = {}) {
    const avatars = useMemo(() => {
        const byId = new Map<string, AvatarDefinition>();

        for (const avatar of getAvailableAvatars()) {
            byId.set(avatar.id, avatar);
        }

        for (const avatar of extraAvatars) {
            if (avatar.enabled) {
                byId.set(avatar.id, avatar);
            }
        }

        return Array.from(byId.values());
    }, [extraAvatars]);

    const initialAvatar = useMemo(() => {
        if (initialAvatarId) {
            const selected = avatars.find(
                (avatar) =>
                    avatar.id === initialAvatarId,
            );

            if (selected) {
                return selected;
            }
        }

        return getDefaultAvatar();
    }, [avatars, initialAvatarId]);

    const [
        selectedAvatar,
        setSelectedAvatar,
    ] = useState<AvatarDefinition | null>(
        initialAvatar,
    );

    /*
     * `initialAvatarId` is a controlled input from callers such as
     * CallOverlay. CallOverlay exists before a call starts, so its first
     * render normally has no local avatar and this hook initializes with
     * the default VRM. When a call is then started, the call store updates
     * `localAvatarId`, but the old implementation never synchronized that
     * new value into `selectedAvatar`.
     *
     * That made the call continue rendering `default-vrm` even though the
     * uploaded avatar was correctly stored in the call state.
     *
     * Only react to a change of the external initial-avatar id. This keeps
     * normal user selection intact after initialization.
     */
    const previousInitialAvatarIdRef =
        useRef<string | null | undefined>(
            initialAvatarId,
        );

    useEffect(() => {
        if (
            previousInitialAvatarIdRef.current ===
            initialAvatarId
        ) {
            return;
        }

        previousInitialAvatarIdRef.current =
            initialAvatarId;

        if (initialAvatarId) {
            const nextAvatar = avatars.find(
                (avatar) =>
                    avatar.id === initialAvatarId,
            );

            if (nextAvatar) {
                console.log(
                    "[AvatarSelection] External avatar selection applied",
                    {
                        id: nextAvatar.id,
                        name: nextAvatar.name,
                        type: nextAvatar.type,
                        renderMode: nextAvatar.renderMode,
                    },
                );

                setSelectedAvatar(nextAvatar);
                return;
            }
        }

        const fallback =
            getDefaultAvatar();

        setSelectedAvatar(fallback);
    }, [
        avatars,
        initialAvatarId,
    ]);

    const selectAvatar = useCallback(
        (avatar: AvatarDefinition) => {
            const availableAvatar =
                avatars.find(
                    (item) =>
                        item.id === avatar.id,
                ) ?? avatar;

            if (!availableAvatar.enabled) {
                throw new Error(
                    "The selected avatar is currently unavailable.",
                );
            }

            setSelectedAvatar(
                availableAvatar,
            );
        },
        [avatars],
    );

    const selectAvatarById = useCallback(
        (avatarId: string) => {
            const avatar = avatars.find(
                (item) =>
                    item.id === avatarId,
            );

            if (!avatar) {
                throw new Error(
                    `Avatar "${avatarId}" was not found.`,
                );
            }

            if (!avatar.enabled) {
                throw new Error(
                    "The selected avatar is currently unavailable.",
                );
            }

            setSelectedAvatar(avatar);
        },
        [avatars],
    );

    const clearSelection = useCallback(() => {
        setSelectedAvatar(null);
    }, []);

    const isSelected = useCallback(
        (avatarId: string): boolean =>
            selectedAvatar?.id === avatarId,
        [selectedAvatar],
    );

    return {
        avatars,
        selectedAvatar,
        selectedAvatarId:
            selectedAvatar?.id ?? null,
        hasSelection:
            selectedAvatar !== null,
        selectAvatar,
        selectAvatarById,
        clearSelection,
        isSelected,
    };
}