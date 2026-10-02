"use client";

import { create } from "zustand";

type AvatarStore = {
    selectedAvatarId: string | null;
    avatarEnabled: boolean;

    setSelectedAvatarId: (avatarId: string | null) => void;
    setAvatarEnabled: (enabled: boolean) => void;

    reset: () => void;
};

const INITIAL_STATE = {
    selectedAvatarId: null,
    avatarEnabled: false,
} satisfies Pick<
    AvatarStore,
    "selectedAvatarId" | "avatarEnabled"
>;

export const useAvatarStore = create<AvatarStore>((set) => ({
    ...INITIAL_STATE,

    setSelectedAvatarId: (avatarId) => {
        set({
            selectedAvatarId: avatarId,
        });
    },

    setAvatarEnabled: (enabled) => {
        set({
            avatarEnabled: enabled,
        });
    },

    reset: () => {
        set(INITIAL_STATE);
    },
}));