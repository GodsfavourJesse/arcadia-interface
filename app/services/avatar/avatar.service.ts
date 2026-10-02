"use client";

import {
    getAvatarById,
    getAvailableAvatars,
} from "@/app/lib/avatar/avatar-registry";

import type { AvatarDefinition } from "@/app/types/avatar/avatar.types";

export type AvatarService = {
    getAvatars: () => Promise<readonly AvatarDefinition[]>;
    getAvatarById: (
        avatarId: string,
    ) => Promise<AvatarDefinition | null>;
};

export const avatarService: AvatarService = {
    async getAvatars() {
        return getAvailableAvatars();
    },

    async getAvatarById(avatarId) {
        return getAvatarById(avatarId);
    },
};