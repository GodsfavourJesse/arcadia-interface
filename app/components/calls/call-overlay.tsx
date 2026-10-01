"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    getConversation,
} from "@/app/services/conversations.service";

import {
    useActiveCall,
} from "@/app/hooks/calls/useActiveCall";

import {
    useWebRTC,
} from "@/app/hooks/calls/useWebRTC";

import {
    useCallRingtone,
} from "@/app/hooks/calls/useCallRingtone";

import {
    useCallStore,
} from "@/app/store/calls/call.store";

import {
    CALL_STATE,
    CALL_TYPE,
} from "@/app/types/calls/calls.types";

import {
    CallControls,
} from "./call-controls";

import {
    IncomingCallModal,
} from "./incoming-call-modal";

import {
    OutgoingCallModal,
} from "./outgoing-call-modal";

type Profile = {
    displayName: string;
    username?: string;
    profilePictureUrl?: string | null;
};

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
            .map(
                (part) =>
                    part[0]?.toUpperCase(),
            )
            .join("") || "M";

    const sizeClass =
        size === "small"
            ? "h-16 w-16 text-xl"
            : "h-28 w-28 text-3xl";

    if (profile.profilePictureUrl) {
        return (
            <img
                src={
                    profile.profilePictureUrl
                }
                alt=""
                className={`${sizeClass} rounded-full object-cover ring-4 ring-white/10`}
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

function formatDuration(
    totalSeconds: number,
) {
    const minutes = Math.floor(
        totalSeconds / 60,
    )
        .toString()
        .padStart(2, "0");

    const seconds = Math.floor(
        totalSeconds % 60,
    )
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
    const ref =
        useRef<HTMLVideoElement | null>(
            null,
        );

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
                 * The receiver's Accept action is a user gesture,
                 * but some browsers may still defer media playback.
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
}: {
    stream: MediaStream | null;
}) {
    const ref =
        useRef<HTMLAudioElement | null>(
            null,
        );

    useEffect(() => {
        const audio = ref.current;

        if (!audio) {
            return;
        }

        audio.srcObject = stream;
        audio.muted = false;
        audio.volume = 1;

        if (stream) {
            void audio.play().catch(() => {
                /*
                 * Browser autoplay rules may require the
                 * receiver's Accept gesture.
                 */
            });
        }

        return () => {
            audio.srcObject = null;
        };
    }, [stream]);

    return (
        <audio
            ref={ref}
            autoPlay
            playsInline
        />
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
                <Avatar
                    profile={profile}
                    size="large"
                />

                <p className="mt-7 text-xs font-medium uppercase tracking-[0.22em] text-white/40">
                    Miyor
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                    {failed
                        ? "Call couldn’t connect"
                        : "Call ended"}
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

    const end =
        useCallStore(
            (state) => state.end,
        );

    const accept =
        useCallStore(
            (state) => state.accept,
        );

    const decline =
        useCallStore(
            (state) => state.decline,
        );

    const cancel =
        useCallStore(
            (state) => state.cancel,
        );

    const clearError =
        useCallStore(
            (state) => state.clearError,
        );

    const reset =
        useCallStore(
            (state) => state.reset,
        );

    const fail =
        useCallStore(
            (state) => state.fail,
        );

    const [profile, setProfile] =
        useState<Profile>({
            displayName:
                "Miyor user",
        });

    const [elapsed, setElapsed] =
        useState(0);

    const enabled =
        Boolean(activeCall) &&
        !isTerminal &&
        (isAccepted || isConnected);

    const {
        localStream,
        remoteStream,
        isMuted,
        isCameraEnabled,
        toggleMute,
        toggleCamera,
    } = useWebRTC({
        callId:
            activeCall?.id ?? null,
        callType:
            activeCall?.type ?? null,
        isCaller:
            myParticipant?.role ===
            "caller",
        enabled,
        onConnected: () => {
            void useCallStore
                .getState()
                .markConnected();
        },
        onFailed: () => {
            void fail();
        },
    });

    const isRinging =
        Boolean(activeCall) &&
        isIncoming &&
        activeCall?.state ===
            CALL_STATE.RINGING;

    useCallRingtone(isRinging);

    useEffect(() => {
        if (!activeCall) {
            return;
        }

        const call =
            activeCall;

        let cancelled = false;

        async function loadProfile() {
            try {
                const response =
                    await getConversation(
                        call.conversationId,
                    );

                const otherMember =
                    response.conversation.members.find(
                        (member) =>
                            member.userId !==
                            myParticipant?.userId,
                    );

                if (
                    !cancelled &&
                    otherMember
                ) {
                    setProfile({
                        displayName:
                            otherMember.user
                                .displayName ||
                            "Miyor user",
                        username:
                            otherMember.user
                                .username,
                        profilePictureUrl:
                            otherMember.user
                                .profilePictureUrl ??
                            null,
                    });
                }
            } catch {
                // Keep the fallback profile.
            }
        }

        void loadProfile();

        return () => {
            cancelled = true;
        };
    }, [
        activeCall?.conversationId,
        activeCall?.id,
        myParticipant?.userId,
    ]);

    useEffect(() => {
        if (!isConnected) {
            setElapsed(0);
            return;
        }

        const startedAt =
            activeCall?.connectedAt
                ? new Date(
                      activeCall.connectedAt,
                  ).getTime()
                : Date.now();

        const tick = () => {
            setElapsed(
                Math.max(
                    0,
                    Math.floor(
                        (Date.now() -
                            startedAt) /
                            1000,
                    ),
                ),
            );
        };

        tick();

        const timer =
            window.setInterval(
                tick,
                1000,
            );

        return () =>
            window.clearInterval(
                timer,
            );
    }, [
        isConnected,
        activeCall?.connectedAt,
    ]);

    useEffect(() => {
        if (!error) {
            return;
        }

        const timer =
            window.setTimeout(
                clearError,
                5000,
            );

        return () =>
            window.clearTimeout(
                timer,
            );
    }, [
        error,
        clearError,
    ]);

    useEffect(() => {
        if (!isTerminal) {
            return;
        }

        const timer =
            window.setTimeout(
                () => {
                    reset();
                },
                1400,
            );

        return () =>
            window.clearTimeout(
                timer,
            );
    }, [isTerminal, reset]);

    if (!activeCall) {
        return null;
    }

    if (isTerminal) {
        return (
            <EndedCallView
                profile={profile}
                type={activeCall.type}
                failed={
                    activeCall.state ===
                    CALL_STATE.FAILED
                }
            />
        );
    }

    if (isIncoming) {
        return (
            <IncomingCallModal />
        );
    }

    if (isOutgoing) {
        return (
            <OutgoingCallModal />
        );
    }

    const isVideo =
        activeCall.type ===
        CALL_TYPE.VIDEO;

    const hasRemoteVideo =
        isVideo &&
        Boolean(
            remoteStream?.getVideoTracks()
                .length,
        );

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-slate-950 text-white">
            <div className="absolute inset-0">
                {hasRemoteVideo ? (
                    <VideoSurface
                        stream={
                            remoteStream
                        }
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_28%,rgba(99,102,241,0.20),transparent_34%),radial-gradient(circle_at_50%_70%,rgba(14,165,233,0.12),transparent_38%),#020617]">
                        <div className="absolute h-72 w-72 animate-pulse rounded-full bg-white/[0.025] blur-3xl" />

                        <div className="relative flex flex-col items-center">
                            <div className="rounded-full p-2 ring-1 ring-white/10">
                                <Avatar
                                    profile={
                                        profile
                                    }
                                />
                            </div>

                            <div className="mt-7 h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-white/40" />
                            </div>
                        </div>
                    </div>
                )}

                {isVideo &&
                    localStream && (
                        <div className="absolute right-4 top-4 h-36 w-28 overflow-hidden rounded-2xl border border-white/20 bg-slate-900 shadow-2xl shadow-black/40 sm:right-6 sm:top-6 sm:h-48 sm:w-36">
                            <VideoSurface
                                stream={
                                    localStream
                                }
                                muted
                                className="h-full w-full object-cover"
                            />

                            {!isCameraEnabled && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                                    <Avatar
                                        profile={{
                                            displayName:
                                                "You",
                                        }}
                                        size="small"
                                    />
                                </div>
                            )}

                            <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white/75 backdrop-blur">
                                You
                            </span>
                        </div>
                    )}

                {!isVideo && (
                    <RemoteAudio
                        stream={
                            remoteStream
                        }
                    />
                )}

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
                                {isVideo
                                    ? "Video"
                                    : "Voice"}
                            </span>
                        </div>
                    </div>

                    {isConnected && (
                        <div className="rounded-full border border-white/10 bg-black/30 px-3.5 py-2 text-sm font-medium tabular-nums text-white/85 backdrop-blur-xl">
                            {formatDuration(
                                elapsed,
                            )}
                        </div>
                    )}
                </header>

                <main className="flex flex-1 items-center justify-center px-6 pb-24">
                    {!hasRemoteVideo && (
                        <div className="flex flex-col items-center text-center">
                            <h1 className="mt-7 text-2xl font-semibold tracking-tight sm:text-3xl">
                                {
                                    profile.displayName
                                }
                            </h1>

                            {profile.username && (
                                <p className="mt-1 text-sm text-white/45">
                                    @
                                    {
                                        profile.username
                                    }
                                </p>
                            )}
                        </div>
                    )}
                </main>

                <footer className="px-5 pb-8 sm:px-8">
                    {localStream && (
                        <div className="mb-5 flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={
                                    toggleMute
                                }
                                className={`flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-xl transition ${
                                    isMuted
                                        ? "border-red-300/30 bg-red-500/25 text-red-100"
                                        : "border-white/10 bg-white/10 text-white hover:bg-white/15"
                                }`}
                                aria-label={
                                    isMuted
                                        ? "Unmute microphone"
                                        : "Mute microphone"
                                }
                            >
                                <span
                                    aria-hidden="true"
                                    className="text-lg"
                                >
                                    {isMuted
                                        ? "🔇"
                                        : "🎙️"}
                                </span>
                            </button>

                            {isVideo && (
                                <button
                                    type="button"
                                    onClick={
                                        toggleCamera
                                    }
                                    className={`flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-xl transition ${
                                        !isCameraEnabled
                                            ? "border-red-300/30 bg-red-500/25 text-red-100"
                                            : "border-white/10 bg-white/10 text-white hover:bg-white/15"
                                    }`}
                                    aria-label={
                                        isCameraEnabled
                                            ? "Turn camera off"
                                            : "Turn camera on"
                                    }
                                >
                                    <span
                                        aria-hidden="true"
                                        className="text-lg"
                                    >
                                        {isCameraEnabled
                                            ? "📹"
                                            : "🚫"}
                                    </span>
                                </button>
                            )}
                        </div>
                    )}

                    <CallControls
                        state={
                            activeCall.state
                        }
                        type={
                            activeCall.type
                        }
                        isIncoming={false}
                        isOutgoing={false}
                        isAccepted={
                            isAccepted
                        }
                        isConnected={
                            isConnected
                        }
                        isActionPending={
                            isActionPending
                        }
                        onAccept={() =>
                            void accept()
                        }
                        onDecline={() =>
                            void decline()
                        }
                        onCancel={() =>
                            void cancel()
                        }
                        onEnd={() =>
                            void end()
                        }
                    />

                    {error && (
                        <button
                            type="button"
                            onClick={
                                clearError
                            }
                            className="mx-auto mt-4 block max-w-md rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-left text-xs text-red-100 backdrop-blur-xl"
                        >
                            {error}
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}
