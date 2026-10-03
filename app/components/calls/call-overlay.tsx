"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";

import { getConversation } from "@/app/services/conversation/conversations.service";
import { useActiveCall } from "@/app/hooks/calls/useActiveCall";
import { useWebRTC } from "@/app/hooks/calls/useWebRTC";
import { useCallRingtone } from "@/app/hooks/calls/useCallRingtone";
import { useAvatarMedia } from "@/app/hooks/avatar/useAvatarMedia";
import { useAvatarSelection } from "@/app/hooks/avatar/useAvatarSelection";
import { useCallStore } from "@/app/store/calls/call.store";
import { CALL_STATE, CALL_TYPE } from "@/app/types/calls/calls.types";
import type { AvatarDefinition } from "@/app/types/avatar/avatar.types";

import { CallControls } from "./call-controls";
import { IncomingCallModal } from "./incoming-call-modal";
import { OutgoingCallModal } from "./outgoing-call-modal";
import { AvatarPreview } from "../avatar/avatar-preview";
import { AvatarCard } from "../avatar/avatar-card";

type Profile = {
    displayName: string;
    username?: string;
    profilePictureUrl?: string | null;
};

type LoadedProfile = {
    conversationId: string;
    profile: Profile;
};

const FALLBACK_PROFILE: Profile = { displayName: "Miyor user" };
const SELF_PROFILE: Profile = { displayName: "You" };

function Avatar({
    profile,
    size = "large",
}: {
    profile: Profile;
    size?: "small" | "large";
}) {
    const initials =
        profile.displayName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "M";

    const sizeClass =
        size === "small" ? "h-16 w-16 text-xl" : "h-28 w-28 text-3xl";

    if (profile.profilePictureUrl) {
        return (
            <img
                src={profile.profilePictureUrl}
                alt=""
                className={`${sizeClass} shrink-0 rounded-full object-cover ring-4 ring-white/10`}
            />
        );
    }

    return (
        <div
            className={`flex ${sizeClass} items-center justify-center rounded-full bg-white/10 font-semibold text-white ring-4 ring-white/5`}
        >
            {initials}
        </div>
    );
}

function formatDuration(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60)
        .toString()
        .padStart(2, "0");

    const seconds = Math.floor(totalSeconds % 60)
        .toString()
        .padStart(2, "0");

    return `${minutes}:${seconds}`;
}

function VideoSurface({
    stream,
    muted = false,
    className,
}: {
    stream: MediaStream | null;
    muted?: boolean;
    className: string;
}) {
    const ref = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const video = ref.current;

        if (!video) {
            return;
        }

        video.srcObject = stream;

        if (stream) {
            video.muted = muted;
            video.volume = muted ? 0 : 1;

            void video.play().catch(() => {
                /*
                 * Some browsers may defer playback until
                 * the user has interacted with the page.
                 */
            });
        }

        return () => {
            video.srcObject = null;
        };
    }, [stream, muted]);

    return (
        <video
            ref={ref}
            autoPlay
            playsInline
            muted={muted}
            className={className}
        />
    );
}

function RemoteAudio({
    stream,
    enabled,
}: {
    stream: MediaStream | null;
    enabled: boolean;
}) {
    const ref = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = ref.current;

        if (!audio) {
            return;
        }

        /*
         * Only the remote stream is attached here.
         * The local stream is never attached to this element.
         */
        audio.srcObject = stream;
        audio.autoplay = true;
        audio.muted = !enabled;
        audio.volume = enabled ? 1 : 0;

        if (stream && enabled) {
            void audio.play().catch((error) => {
                console.warn(
                    "[WebRTC] Remote audio playback requires user interaction:",
                    error,
                );
            });
        }

        return () => {
            audio.pause();
            audio.srcObject = null;
        };
    }, [stream, enabled]);

    return <audio ref={ref} autoPlay />;
}

function MediaButton({
    active = false,
    disabled = false,
    label,
    onClick,
    children,
}: {
    active?: boolean;
    disabled?: boolean;
    label: string;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            className={[
                "flex h-14 w-14 items-center justify-center rounded-full",
                "border backdrop-blur-xl transition",
                "active:scale-95",
                "disabled:cursor-not-allowed disabled:opacity-40",
                active
                    ? "border-violet-300/30 bg-violet-500/25 text-violet-50 shadow-lg shadow-violet-950/20"
                    : "border-white/10 bg-white/10 text-white hover:bg-white/15",
            ].join(" ")}
        >
            {children}
        </button>
    );
}

function AvatarIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
        >
            <circle cx="12" cy="8" r="3.2" />
            <path
                d="M5.5 19.2c.8-3.2 3.1-5 6.5-5s5.7 1.8 6.5 5"
                strokeLinecap="round"
            />
            <path
                d="M4 8.5a8 8 0 0 0 2 5.4M20 8.5a8 8 0 0 1-2 5.4"
                strokeLinecap="round"
                opacity=".55"
            />
        </svg>
    );
}

function MicIcon({ muted }: { muted: boolean }) {
    if (muted) {
        return (
            <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
            >
                <path d="M5 5l14 14" strokeLinecap="round" />
                <path
                    d="M9.5 9.5V6a2.5 2.5 0 0 1 5 0v5"
                    strokeLinecap="round"
                />
                <path
                    d="M6.8 11.2a5.2 5.2 0 0 0 8.7 3.8M12 19v-3M9 19h6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }

    return (
        <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
        >
            <rect x="8" y="3" width="8" height="12" rx="4" />
            <path
                d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function CameraIcon({ off }: { off: boolean }) {
    if (off) {
        return (
            <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
            >
                <path d="M3 3l18 18" strokeLinecap="round" />
                <path
                    d="M9.5 6H14a2 2 0 0 1 2 2v2l5-3v10l-3.2-1.9M7 6.8A2 2 0 0 0 5 9v6a2 2 0 0 0 2 2h7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }

    return (
        <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
        >
            <rect x="3" y="6" width="13" height="12" rx="2.5" />
            <path d="m16 10 5-3v10l-5-3z" strokeLinejoin="round" />
        </svg>
    );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
    if (muted) {
        return (
            <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
            >
                <path d="m4 9 4-3h3v12H8l-4-3V9Z" strokeLinejoin="round" />
                <path d="m16 9 5 5M21 9l-5 5" strokeLinecap="round" />
            </svg>
        );
    }

    return (
        <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
        >
            <path d="m4 9 4-3h3v12H8l-4-3V9Z" strokeLinejoin="round" />
            <path
                d="M15 9.5a4 4 0 0 1 0 5M18 7a7.5 7.5 0 0 1 0 10"
                strokeLinecap="round"
            />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
        >
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
        >
            <path d="m5 10 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function MutedBadgeIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
        >
            <path d="M5 5l14 14" strokeLinecap="round" />
            <path d="M9.5 9.5V6a2.5 2.5 0 0 1 5 0v5" strokeLinecap="round" />
        </svg>
    );
}

function AvatarPicker({
    avatars,
    selectedAvatar,
    isAvatarActive,
    disabled,
    onSelect,
    onUseAvatar,
    onUseCamera,
    onClose,
}: {
    avatars: readonly AvatarDefinition[];
    selectedAvatar: AvatarDefinition | null;
    isAvatarActive: boolean;
    disabled: boolean;
    onSelect: (avatar: AvatarDefinition) => void;
    onUseAvatar: () => void;
    onUseCamera: () => void;
    onClose: () => void;
}) {
    return (
        <div
            className="absolute bottom-full left-1/2 z-50 mb-4 w-[min(92vw,520px)] -translate-x-1/2 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-2xl"
            role="dialog"
            aria-label="Choose avatar"
        >
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-white">
                        Choose avatar
                    </h2>

                    <p className="mt-1 text-xs text-white/45">
                        Your camera powers the avatar&apos;s movements.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close avatar picker"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                    <CloseIcon />
                </button>
            </div>

            <div className="grid max-h-[min(52vh,420px)] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                {avatars.map((avatar) => (
                    <AvatarCard
                        key={avatar.id}
                        avatar={avatar}
                        selected={selectedAvatar?.id === avatar.id}
                        disabled={disabled}
                        onSelect={() => onSelect(avatar)}
                    />
                ))}
            </div>

            <div className="mt-4 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-white/80">
                            {isAvatarActive
                                ? (selectedAvatar?.name ?? "Avatar")
                                : "Camera mode"}
                        </p>

                        <p className="mt-0.5 text-[11px] text-white/40">
                            {isAvatarActive
                                ? "Remote participant sees your avatar."
                                : "Remote participant sees your camera."}
                        </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                        <button
                            type="button"
                            disabled={disabled || !selectedAvatar}
                            onClick={onUseAvatar}
                            className={[
                                "inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold transition",
                                "border",
                                disabled || !selectedAvatar
                                    ? "cursor-not-allowed border-white/10 bg-white/5 text-white/30"
                                    : "border-violet-300/20 bg-violet-500/20 text-violet-100 hover:bg-violet-500/30",
                            ].join(" ")}
                        >
                            {isAvatarActive && <CheckIcon />}
                            Use avatar
                        </button>

                        <button
                            type="button"
                            disabled={disabled || !isAvatarActive}
                            onClick={onUseCamera}
                            className={[
                                "inline-flex h-10 items-center rounded-full border px-4 text-xs font-semibold transition",
                                disabled || !isAvatarActive
                                    ? "cursor-not-allowed border-white/10 bg-white/5 text-white/30"
                                    : "border-white/10 bg-white/10 text-white hover:bg-white/15",
                            ].join(" ")}
                        >
                            Use camera
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EndedCallView({
    profile,
    type,
    failed,
}: {
    profile: Profile;
    type: string;
    failed: boolean;
}) {
    return (
        <div className="fixed inset-0 z-[120] flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
            <div className="flex w-full max-w-md flex-col items-center text-center">
                <Avatar profile={profile} size="large" />

                <p className="mt-7 text-xs font-medium uppercase tracking-[0.22em] text-white/40">
                    Miyor
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                    {failed ? "Call couldn’t connect" : "Call ended"}
                </h1>

                <p className="mt-2 text-sm text-white/50">
                    {failed
                        ? "Please check your microphone, camera, or network and try again."
                        : `${type === CALL_TYPE.VIDEO ? "Video" : "Voice"} call with ${profile.displayName}`}
                </p>
            </div>
        </div>
    );
}

export function CallOverlay() {
    const {
        activeCall,
        myParticipant,
        isIncoming,
        isOutgoing,
        isAccepted,
        isConnected,
        isTerminal,
        isActionPending,
        error,
    } = useActiveCall();

    const end = useCallStore((state) => state.end);
    const accept = useCallStore((state) => state.accept);
    const decline = useCallStore((state) => state.decline);
    const cancel = useCallStore((state) => state.cancel);
    const clearError = useCallStore((state) => state.clearError);
    const reset = useCallStore((state) => state.reset);
    const fail = useCallStore((state) => state.fail);

    /*
     * These two values describe the local media choice
     * made when the call was started.
     *
     * localVideoSource:
     *   "camera" | "avatar"
     *
     * localAvatarId:
     *   The avatar selected on /dashboard/calls/new.
     */
    const localVideoSource = useCallStore((state) => state.localVideoSource);
    const localAvatarId = useCallStore((state) => state.localAvatarId);

    const [loadedProfile, setLoadedProfile] = useState<LoadedProfile | null>(
        null,
    );
    const [elapsed, setElapsed] = useState(0);
    const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
    const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
    const [dismissedAvatarError, setDismissedAvatarError] = useState<
        string | null
    >(null);

    const conversationId = activeCall?.conversationId ?? null;
    const myUserId = myParticipant?.userId ?? null;

    /*
     * The loaded profile is keyed to its conversation, so a new
     * call never shows the previous caller's details.
     */
    const profile: Profile =
        loadedProfile && loadedProfile.conversationId === conversationId
            ? loadedProfile.profile
            : FALLBACK_PROFILE;

    const enabled =
        Boolean(activeCall) && !isTerminal && (isAccepted || isConnected);

    const isVideoCall = activeCall?.type === CALL_TYPE.VIDEO;

    const handleConnected = useCallback(() => {
        void useCallStore.getState().markConnected();
    }, []);

    const handleFailed = useCallback(() => {
        void fail();
    }, [fail]);

    const {
        localStream,
        remoteStream,
        isMuted,
        isCameraEnabled,
        remoteAudioEnabled,
        remoteVideoEnabled,
        toggleMute,
        toggleCamera,
        replaceVideoTrack,
        isVideoSenderReady,
    } = useWebRTC({
        callId: activeCall?.id ?? null,
        callType: activeCall?.type ?? null,
        isCaller: myParticipant?.role === "caller",
        enabled,
        onConnected: handleConnected,
        onFailed: handleFailed,
    });

    /*
     * Avatar selection is intentionally independent from
     * avatar activation.
     *
     * If the call was started from /dashboard/calls/new,
     * localAvatarId identifies the avatar selected before
     * the call began.
     */
    const { avatars, selectedAvatar, selectAvatar } = useAvatarSelection({
        initialAvatarId: localAvatarId ?? "default-vrm",
    });

    const {
        avatarVideoTrack,
        isAvatarActive,
        error: avatarError,
        handleAvatarCanvasReady,
        toggleAvatar,
        disableAvatar,
    } = useAvatarMedia({
        cameraStream: localStream,
        enabled: isVideoCall && isAccepted && isConnected && isCameraEnabled,
        videoSenderReady: isVideoSenderReady,
        replaceVideoTrack,
    });

    /*
     * The avatar error is owned by useAvatarMedia, so the store's
     * clearError cannot clear it. Track what the user dismissed
     * locally instead.
     */
    const visibleAvatarError =
        avatarError && avatarError !== dismissedAvatarError
            ? avatarError
            : null;

    const displayedError = visibleAvatarError ?? error;

    const dismissError = useCallback(() => {
        clearError();
        setDismissedAvatarError(avatarError ?? null);
    }, [avatarError, clearError]);

    const handleCameraToggle = useCallback(async () => {
        /*
         * Avatar mode uses the avatar track as the
         * WebRTC video sender track. Camera-off must
         * therefore restore the physical camera first.
         */
        if (isAvatarActive) {
            try {
                await disableAvatar();
            } catch {
                return;
            }
        }

        toggleCamera();
    }, [disableAvatar, isAvatarActive, toggleCamera]);

    const handleSelectAvatar = useCallback(
        (avatar: AvatarDefinition) => {
            selectAvatar(avatar);

            /*
             * Do not disable avatar mode here.
             *
             * AvatarCanvas receives the new definition and
             * AvatarEngine replaces the renderer on the same
             * canvas. The existing captured MediaStreamTrack
             * therefore remains alive and WebRTC does not
             * renegotiate.
             */
        },
        [selectAvatar],
    );

    const handleUseAvatar = useCallback(async () => {
        if (
            !selectedAvatar ||
            !isVideoCall ||
            !isConnected ||
            !isCameraEnabled ||
            !avatarVideoTrack
        ) {
            return;
        }

        try {
            if (!isAvatarActive) {
                await toggleAvatar();
            }

            setIsAvatarPickerOpen(false);
        } catch {
            /*
             * Error state is owned by useAvatarMedia.
             */
        }
    }, [
        avatarVideoTrack,
        isAvatarActive,
        isCameraEnabled,
        isConnected,
        isVideoCall,
        selectedAvatar,
        toggleAvatar,
    ]);

    const handleUseCamera = useCallback(async () => {
        if (!isAvatarActive) {
            setIsAvatarPickerOpen(false);
            return;
        }

        try {
            await disableAvatar();

            setIsAvatarPickerOpen(false);
        } catch {
            /*
             * Keep the picker open if restoration fails.
             */
        }
    }, [disableAvatar, isAvatarActive]);

    const toggleSpeaker = useCallback(() => {
        setIsSpeakerEnabled((current) => !current);
    }, []);

    const isRinging =
        Boolean(activeCall) &&
        isIncoming &&
        activeCall?.state === CALL_STATE.RINGING;

    useCallRingtone(isRinging);

    /*
     * Load the other participant's profile.
     *
     * Wait for our own user id: without it, "the other member"
     * could resolve to ourselves.
     */
    useEffect(() => {
        if (!conversationId || !myUserId) {
            return;
        }

        let cancelled = false;

        async function loadProfile(id: string, userId: string) {
            try {
                const response = await getConversation(id);

                const otherMember = response.conversation.members.find(
                    (member) => member.userId !== userId,
                );

                if (cancelled || !otherMember) {
                    return;
                }

                setLoadedProfile({
                    conversationId: id,
                    profile: {
                        displayName:
                            otherMember.user.displayName || "Miyor user",
                        username: otherMember.user.username,
                        profilePictureUrl:
                            otherMember.user.profilePictureUrl ?? null,
                    },
                });
            } catch {
                /*
                 * Keep fallback profile.
                 */
            }
        }

        void loadProfile(conversationId, myUserId);

        return () => {
            cancelled = true;
        };
    }, [conversationId, myUserId]);

    useEffect(() => {
        if (!isConnected) {
            setElapsed(0);
            return;
        }

        const startedAt = activeCall?.connectedAt
            ? new Date(activeCall.connectedAt).getTime()
            : Date.now();

        const tick = () => {
            setElapsed(
                Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
            );
        };

        tick();

        const timer = window.setInterval(tick, 1000);

        return () => window.clearInterval(timer);
    }, [isConnected, activeCall?.connectedAt]);

    /*
     * A recovered avatar clears the local dismissal, so a later
     * error is shown again.
     */
    useEffect(() => {
        if (!avatarError) {
            setDismissedAvatarError(null);
        }
    }, [avatarError]);

    useEffect(() => {
        if (!displayedError) {
            return;
        }

        const timer = window.setTimeout(dismissError, 5000);

        return () => window.clearTimeout(timer);
    }, [displayedError, dismissError]);

    useEffect(() => {
        if (!isTerminal) {
            return;
        }

        const timer = window.setTimeout(() => {
            reset();
        }, 1400);

        return () => window.clearTimeout(timer);
    }, [isTerminal, reset]);

    /*
     * If the call ceases to be a valid video call while
     * avatar mode is active, restore the physical camera
     * track before the call lifecycle is torn down.
     */
    useEffect(() => {
        if (
            isAvatarActive &&
            (!isVideoCall || !isAccepted || !isConnected || !isCameraEnabled)
        ) {
            void disableAvatar().catch(() => {
                /*
                 * Call teardown owns the final cleanup.
                 */
            });
        }
    }, [
        disableAvatar,
        isAccepted,
        isAvatarActive,
        isCameraEnabled,
        isConnected,
        isVideoCall,
    ]);

    /*
     * Close the picker automatically if avatar mode can
     * no longer be used.
     */
    useEffect(() => {
        if (!isVideoCall || !isConnected || !isCameraEnabled) {
            setIsAvatarPickerOpen(false);
        }
    }, [isCameraEnabled, isConnected, isVideoCall]);

    if (!activeCall) {
        return null;
    }

    if (isTerminal) {
        return (
            <EndedCallView
                profile={profile}
                type={activeCall.type}
                failed={activeCall.state === CALL_STATE.FAILED}
            />
        );
    }

    if (isIncoming) {
        return <IncomingCallModal />;
    }

    if (isOutgoing) {
        return <OutgoingCallModal />;
    }

    const isVideo = activeCall.type === CALL_TYPE.VIDEO;

    const hasRemoteVideo =
        isVideo &&
        remoteVideoEnabled &&
        Boolean(
            remoteStream
                ?.getVideoTracks()
                .some((track) => track.readyState === "live"),
        );

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-slate-950 text-white">
            <div className="absolute inset-0">
                {hasRemoteVideo ? (
                    <VideoSurface
                        stream={remoteStream}
                        muted
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_28%,rgba(99,102,241,0.20),transparent_34%),radial-gradient(circle_at_50%_70%,rgba(14,165,233,0.12),transparent_38%),#020617]">
                        <div className="absolute h-72 w-72 animate-pulse rounded-full bg-white/[0.025] blur-3xl" />

                        <div className="relative flex flex-col items-center">
                            <div className="rounded-full p-2 ring-1 ring-white/10">
                                <Avatar profile={profile} />
                            </div>

                            <div className="mt-7 h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-white/40" />
                            </div>
                        </div>
                    </div>
                )}

                {isVideo && localStream && (
                    <div
                        className={[
                            "absolute right-4 top-4 overflow-hidden rounded-2xl",
                            "border border-white/20 bg-slate-900",
                            "shadow-2xl shadow-black/40",
                            "sm:right-6 sm:top-6",
                            isAvatarActive
                                ? "h-44 w-72 sm:h-56 sm:w-[30rem]"
                                : "h-36 w-28 sm:h-48 sm:w-36",
                        ].join(" ")}
                    >
                        {selectedAvatar &&
                        (isAvatarActive || localVideoSource === "avatar") ? (
                            <AvatarPreview
                                cameraStream={localStream}
                                avatar={selectedAvatar}
                                trackingEnabled={isAvatarActive}
                                active={isAvatarActive}
                                onAvatarCanvasReady={handleAvatarCanvasReady}
                            />
                        ) : isCameraEnabled ? (
                            <VideoSurface
                                stream={localStream}
                                muted
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                                <Avatar profile={SELF_PROFILE} size="small" />
                            </div>
                        )}

                        <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white/75 backdrop-blur">
                            {isAvatarActive
                                ? `You · ${selectedAvatar?.name ?? "Avatar"}`
                                : "You"}
                        </span>

                        {isMuted && (
                            <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/80 text-white shadow-lg">
                                <MutedBadgeIcon />
                            </span>
                        )}
                    </div>
                )}

                <RemoteAudio
                    stream={remoteStream}
                    enabled={isSpeakerEnabled}
                />

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />
            </div>

            <div className="relative flex min-h-screen flex-col">
                <header className="flex items-center justify-between px-5 py-5 sm:px-8">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                                Miyor
                            </span>

                            <span className="h-1 w-1 rounded-full bg-white/30" />

                            <span className="text-xs text-white/45">
                                {isVideo ? "Video" : "Voice"}
                            </span>
                        </div>
                    </div>

                    {isConnected && (
                        <div className="rounded-full border border-white/10 bg-black/30 px-3.5 py-2 text-sm font-medium tabular-nums text-white/85 backdrop-blur-xl">
                            {formatDuration(elapsed)}
                        </div>
                    )}
                </header>

                <main className="relative flex flex-1 items-end px-6 pb-28 sm:px-8 sm:pb-32">
                    <div className="flex w-full items-end justify-between gap-4">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                                    {profile.displayName}
                                </span>

                                {isConnected && (
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
                                )}
                            </div>

                            {profile.username && (
                                <p className="mt-1 text-sm text-white/50">
                                    @{profile.username}
                                </p>
                            )}

                            {isVideo && !remoteVideoEnabled && (
                                <p className="mt-2 inline-flex items-center rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs text-white/65 backdrop-blur-xl">
                                    Camera off
                                </p>
                            )}
                        </div>

                        {!remoteAudioEnabled && (
                            <div className="shrink-0 rounded-full border border-red-300/20 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-100 backdrop-blur-xl">
                                Microphone off
                            </div>
                        )}
                    </div>
                </main>

                <footer className="px-5 pb-8 sm:px-8">
                    {localStream && (
                        <div className="relative mb-5 flex items-center justify-center gap-3">
                            {isAvatarPickerOpen && isVideo && (
                                <AvatarPicker
                                    avatars={avatars}
                                    selectedAvatar={selectedAvatar}
                                    isAvatarActive={isAvatarActive}
                                    disabled={!isConnected || !isCameraEnabled}
                                    onSelect={handleSelectAvatar}
                                    onUseAvatar={handleUseAvatar}
                                    onUseCamera={handleUseCamera}
                                    onClose={() => setIsAvatarPickerOpen(false)}
                                />
                            )}

                            <MediaButton
                                active={!isMuted}
                                label={
                                    isMuted
                                        ? "Unmute microphone"
                                        : "Mute microphone"
                                }
                                onClick={toggleMute}
                            >
                                <MicIcon muted={isMuted} />
                            </MediaButton>

                            {isVideo && (
                                <>
                                    <MediaButton
                                        active={isCameraEnabled}
                                        label={
                                            isCameraEnabled
                                                ? "Turn camera off"
                                                : "Turn camera on"
                                        }
                                        onClick={() => void handleCameraToggle()}
                                    >
                                        <CameraIcon off={!isCameraEnabled} />
                                    </MediaButton>

                                    <MediaButton
                                        active={isAvatarActive}
                                        disabled={
                                            !isCameraEnabled ||
                                            !isConnected ||
                                            !avatarVideoTrack ||
                                            Boolean(visibleAvatarError)
                                        }
                                        label={
                                            isAvatarPickerOpen
                                                ? "Close avatar picker"
                                                : "Choose avatar"
                                        }
                                        onClick={() =>
                                            setIsAvatarPickerOpen(
                                                (current) => !current,
                                            )
                                        }
                                    >
                                        <AvatarIcon />
                                    </MediaButton>
                                </>
                            )}

                            <MediaButton
                                active={isSpeakerEnabled}
                                label={
                                    isSpeakerEnabled
                                        ? "Turn speaker off"
                                        : "Turn speaker on"
                                }
                                onClick={toggleSpeaker}
                            >
                                <SpeakerIcon muted={!isSpeakerEnabled} />
                            </MediaButton>
                        </div>
                    )}

                    <CallControls
                        state={activeCall.state}
                        type={activeCall.type}
                        isIncoming={false}
                        isOutgoing={false}
                        isAccepted={isAccepted}
                        isConnected={isConnected}
                        isActionPending={isActionPending}
                        onAccept={() => void accept()}
                        onDecline={() => void decline()}
                        onCancel={() => void cancel()}
                        onEnd={() => void end()}
                    />

                    {displayedError && (
                        <button
                            type="button"
                            onClick={dismissError}
                            className="mx-auto mt-4 block max-w-md rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-left text-xs text-red-100 backdrop-blur-xl"
                        >
                            {displayedError}
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}