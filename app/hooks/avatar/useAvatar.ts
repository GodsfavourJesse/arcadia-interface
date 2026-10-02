"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import type {
    AvatarDefinition,
    AvatarTrackingState,
} from "@/app/types/avatar/avatar.types";

import { useAvatarMedia } from "./useAvatarMedia";
import { useAvatarSelection } from "./useAvatarSelection";
import { useFaceTracking } from "./useFaceTracking";

type ReplaceVideoTrack = (
    track: MediaStreamTrack | null,
) => Promise<void>;

type UseAvatarOptions = {
    cameraStream: MediaStream | null;
    videoSenderReady: boolean;
    replaceVideoTrack: ReplaceVideoTrack;
    initialAvatarId?: string | null;
    trackingEnabled?: boolean;
};

type UseAvatarReturn = {
    selectedAvatar: AvatarDefinition | null;
    selectedAvatarId: string | null;
    selectAvatar: (
        avatar: AvatarDefinition,
    ) => void;

    tracking: AvatarTrackingState;
    isTracking: boolean;

    isAvatarActive: boolean;
    enableAvatar: () => Promise<void>;
    disableAvatar: () => Promise<void>;
    toggleAvatar: () => Promise<void>;

    avatarStream: MediaStream | null;
    avatarVideoTrack: MediaStreamTrack | null;

    /**
     * Must be passed to AvatarStage/AvatarPreview
     * so the persistent avatar canvas can be captured.
     */
    handleAvatarCanvasReady: (
        canvas: HTMLCanvasElement,
    ) => void;

    error: Error | null;
};

export function useAvatar({
    cameraStream,
    videoSenderReady,
    replaceVideoTrack,
    initialAvatarId = null,
    trackingEnabled = true,
}: UseAvatarOptions): UseAvatarReturn {
    /*
     * --------------------------------------------------
     * Avatar selection
     * --------------------------------------------------
     */

    const {
        selectedAvatar,
        selectedAvatarId,
        selectAvatar,
    } = useAvatarSelection({
        initialAvatarId,
    });

    /*
     * --------------------------------------------------
     * Avatar media
     *
     * This hook owns:
     *
     * - canvas capture
     * - avatar MediaStream
     * - avatar video track
     * - camera/avatar track switching
     * - WebRTC sender replacement
     * --------------------------------------------------
     */

    const {
        avatarStream,
        avatarVideoTrack,
        isAvatarActive,
        error: mediaError,
        handleAvatarCanvasReady,
        enableAvatar,
        disableAvatar,
        toggleAvatar,
    } = useAvatarMedia({
        cameraStream,
        enabled: selectedAvatar !== null,
        videoSenderReady,
        replaceVideoTrack,
    });

    /*
     * --------------------------------------------------
     * Camera video element for face tracking
     *
     * Face tracking remains completely local.
     *
     * The camera stream is used only as the tracking
     * source. The WebRTC sender is not involved here.
     * --------------------------------------------------
     */

    const cameraVideoElement = useMemo(() => {
        if (
            typeof document ===
            "undefined"
        ) {
            return null;
        }

        const video =
            document.createElement(
                "video",
            );

        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;

        return video;
    }, []);

    /*
     * Keep the camera stream attached to the
     * tracking video element.
     */

    useEffect(() => {
        if (!cameraVideoElement) {
            return;
        }

        cameraVideoElement.srcObject =
            cameraStream;

        if (cameraStream) {
            void cameraVideoElement
                .play()
                .catch(() => {});
        }

        return () => {
            cameraVideoElement.pause();
            cameraVideoElement.srcObject =
                null;
        };
    }, [
        cameraVideoElement,
        cameraStream,
    ]);

    /*
     * --------------------------------------------------
     * Face tracking
     * --------------------------------------------------
     */

    const {
        tracking,
    } = useFaceTracking({
        video: cameraVideoElement,
        enabled:
            trackingEnabled &&
            cameraStream !== null &&
            selectedAvatar !== null,
    });

    const isTracking =
        trackingEnabled &&
        cameraStream !== null &&
        selectedAvatar !== null;

    /*
     * --------------------------------------------------
     * Normalize media errors
     * --------------------------------------------------
     */

    const error =
        mediaError !== null
            ? new Error(mediaError)
            : null;

    /*
     * --------------------------------------------------
     * Public API
     * --------------------------------------------------
     */

    return {
        selectedAvatar,
        selectedAvatarId,
        selectAvatar,

        tracking,
        isTracking,

        isAvatarActive,
        enableAvatar,
        disableAvatar,
        toggleAvatar,

        avatarStream,
        avatarVideoTrack,

        handleAvatarCanvasReady,

        error,
    };
}