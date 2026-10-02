"use client";

import {
    useCallback,
    useMemo,
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
};

export function useAvatarSelection({
    initialAvatarId = null,
}: UseAvatarSelectionOptions = {}) {
    const avatars = useMemo(
        () => getAvailableAvatars(),
        [],
    );

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

    const selectAvatar = useCallback(
        (avatar: AvatarDefinition) => {
            const availableAvatar =
                avatars.find(
                    (item) =>
                        item.id === avatar.id,
                );

            if (!availableAvatar) {
                throw new Error(
                    "The selected avatar is not available.",
                );
            }

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