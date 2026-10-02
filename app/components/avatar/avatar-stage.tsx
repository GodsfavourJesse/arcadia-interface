"use client";

import {
    useCallback,
    useEffect,
} from "react";

import type {
    AvatarDefinition,
} from "@/app/types/avatar/avatar.types";

import {
    useAvatarSelection,
} from "@/app/hooks/avatar/useAvatarSelection";

import { AvatarBoard } from "./avatar-board";
import { AvatarPreview } from "./avatar-preview";

type AvatarStageProps = {
    cameraStream: MediaStream | null;
    initialAvatarId?: string | null;
    avatarActive?: boolean;
    trackingEnabled?: boolean;
    onAvatarChange?: (
        avatar: AvatarDefinition | null,
    ) => void;
    onAvatarCanvasReady?: (
        canvas: HTMLCanvasElement,
    ) => void;
    className?: string;
};

export function AvatarStage({
    cameraStream,
    initialAvatarId = null,
    avatarActive = false,
    trackingEnabled = true,
    onAvatarChange,
    onAvatarCanvasReady,
    className = "",
}: AvatarStageProps) {
    const {
        avatars,
        selectedAvatar,
        selectedAvatarId,
        selectAvatar,
    } = useAvatarSelection({
        initialAvatarId,
    });

    const handleAvatarChange = useCallback(
        (avatar: AvatarDefinition) => {
            selectAvatar(avatar);
        },
        [selectAvatar],
    );

    useEffect(() => {
        onAvatarChange?.(selectedAvatar);
    }, [
        onAvatarChange,
        selectedAvatar,
    ]);

    return (
        <div
            className={[
                "flex h-full min-h-0 w-full flex-col gap-4",
                className,
            ].join(" ")}
        >
            <div className="min-h-0 flex-1">
                <AvatarPreview
                    cameraStream={cameraStream}
                    avatar={selectedAvatar}
                    active={avatarActive}
                    trackingEnabled={trackingEnabled}
                    onAvatarCanvasReady={
                        onAvatarCanvasReady
                    }
                />
            </div>

            <div className="shrink-0">
                <AvatarBoard
                    avatars={avatars}
                    selectedAvatarId={selectedAvatarId}
                    onAvatarChange={
                        handleAvatarChange
                    }
                />
            </div>
        </div>
    );
}