"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import { useRouter } from "next/navigation";

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
    CallStatus,
} from "./call-status";

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
            ? "h-20 w-20 text-2xl"
            : "h-28 w-28 text-3xl";

    if (
        profile.profilePictureUrl
    ) {
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

function LocalVideo({
    stream,
}: {
    stream: MediaStream | null;
}) {
    const videoRef =
        useRef<HTMLVideoElement | null>(
            null,
        );

    useEffect(() => {
        const video =
            videoRef.current;

        if (!video) {
            return;
        }

        video.srcObject = stream;

        return () => {
            video.srcObject = null;
        };
    }, [stream]);

    if (!stream) {
        return null;
    }

    return (
        <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
        />
    );
}

function RemoteVideo({
    stream,
}: {
    stream: MediaStream | null;
}) {
    const videoRef =
        useRef<HTMLVideoElement | null>(
            null,
        );

    useEffect(() => {
        const video =
            videoRef.current;

        if (!video) {
            return;
        }

        video.srcObject = stream;

        if (stream) {
            void video.play().catch(
                () => undefined,
            );
        }

        return () => {
            video.srcObject = null;
        };
    }, [stream]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
        />
    );
}

function RemoteAudio({
    stream,
}: {
    stream: MediaStream | null;
}) {
    const audioRef =
        useRef<HTMLAudioElement | null>(
            null,
        );

    useEffect(() => {
        const audio =
            audioRef.current;

        if (!audio) {
            return;
        }

        audio.srcObject = stream;

        if (stream) {
            void audio.play().catch(
                () => undefined,
            );
        }

        return () => {
            audio.srcObject = null;
        };
    }, [stream]);

    return (
        <audio
            ref={audioRef}
            autoPlay
        />
    );
}

function EndedCallView({
    profile,
    type,
    onBack,
}: {
    profile: Profile;
    type: string;
    onBack: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
            <div className="flex w-full max-w-md flex-col items-center text-center">
                <Avatar
                    profile={profile}
                    size="large"
                />

                <p className="mt-7 text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                    Miyor
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                    Call ended
                </h1>

                <p className="mt-2 text-sm text-white/50">
                    Your{" "}
                    {type ===
                    CALL_TYPE.VIDEO
                        ? "video"
                        : "voice"}{" "}
                    call with{" "}
                    {
                        profile.displayName
                    }{" "}
                    has ended.
                </p>

                <button
                    type="button"
                    onClick={onBack}
                    className="mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-950 transition hover:bg-white/90"
                    aria-label="Return to previous page"
                >
                    <svg
                        className="h-6 w-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path
                            d="M6 6l12 12M18 6 6 18"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>

                <button
                    type="button"
                    onClick={onBack}
                    className="mt-4 text-sm text-white/50 transition hover:text-white"
                >
                    Back
                </button>
            </div>
        </div>
    );
}

export function CallOverlay() {
    const router = useRouter();

    const {
        activeCall,
        myParticipant,
        otherParticipant,
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
            (state) =>
                state.clearError,
        );

    const reset =
        useCallStore(
            (state) => state.reset,
        );

    const [profile, setProfile] =
        useState<Profile>({
            displayName:
                "Miyor user",
        });

    const [elapsed, setElapsed] =
        useState(0);

    const {
        localStream,
        remoteStream,
        connectionState:
            webRTCConnectionState,
        isConnected:
            isWebRTCConnected,
        isConnecting:
            isWebRTCConnecting,
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

        /*
         * This is the key transition.
         *
         * As soon as the call becomes ACCEPTED,
         * both sides' WebRTC hooks become active.
         */
        enabled:
            Boolean(activeCall) &&
            isAccepted &&
            !isTerminal,

        /*
         * ONLY actual RTCPeerConnection
         * connectivity can call this.
         */
        onConnected: () => {
            void useCallStore
                .getState()
                .markConnected();
        },

        onFailed: () => {
            /*
             * WebRTC failure does not pretend
             * the call is connected.
             */
        },
    });

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

                const member =
                    response.conversation.members.find(
                        (item) =>
                            item.userId ===
                            otherParticipant?.userId,
                    );

                if (
                    !cancelled &&
                    member
                ) {
                    setProfile({
                        displayName:
                            member.user
                                .displayName ||
                            "Miyor user",

                        username:
                            member.user
                                .username,

                        profilePictureUrl:
                            member.user
                                .profilePictureUrl ??
                            null,
                    });
                }
            } catch {
                // Keep fallback profile.
            }
        }

        void loadProfile();

        return () => {
            cancelled = true;
        };
    }, [
        activeCall?.conversationId,
        otherParticipant?.userId,
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

    /*
     * Nothing to render if there is no call.
     */
    if (!activeCall) {
        return null;
    }

    /*
     * TERMINAL STATE:
     *
     * Both caller and callee receive CALL_ENDED.
     * Both remain on this screen until Back/X.
     */
    if (isTerminal) {
        return (
            <EndedCallView
                profile={profile}
                type={activeCall.type}
                onBack={() => {
                    reset();
                    router.back();
                }}
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

    const hasRemoteMedia =
        Boolean(
            remoteStream &&
                remoteStream.getTracks()
                    .length > 0,
        );

    const showRemoteVideo =
        isVideo &&
        hasRemoteMedia;

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-slate-950 text-white">
            <div className="absolute inset-0 overflow-hidden bg-slate-950">
                {showRemoteVideo ? (
                    <RemoteVideo
                        stream={
                            remoteStream
                        }
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_40%),linear-gradient(180deg,#111827,#020617)]">
                        <div className="flex flex-col items-center">
                            <Avatar
                                profile={
                                    profile
                                }
                                size="large"
                            />

                            <p className="mt-6 text-sm text-white/55">
                                {webRTCConnectionState ===
                                "requesting-media"
                                    ? "Requesting microphone and camera..."
                                    : isWebRTCConnecting
                                      ? "Connecting..."
                                      : isWebRTCConnected
                                        ? "Connected"
                                        : "Waiting for media..."}
                            </p>
                        </div>
                    </div>
                )}

                {isVideo &&
                    localStream && (
                        <div className="absolute right-4 top-4 h-40 w-28 overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl sm:right-6 sm:top-6 sm:h-48 sm:w-36">
                            <LocalVideo
                                stream={
                                    localStream
                                }
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

                            <div className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white/70 backdrop-blur">
                                You
                            </div>
                        </div>
                    )}

                {!isVideo && (
                    <RemoteAudio
                        stream={
                            remoteStream
                        }
                    />
                )}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
            </div>

            <div className="relative flex min-h-screen flex-col">
                <header className="flex items-center justify-between px-5 py-5 sm:px-8">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/45">
                            Miyor
                        </p>

                        <p className="mt-1 text-sm text-white/70">
                            {isVideo
                                ? "Video call"
                                : "Voice call"}
                        </p>
                    </div>

                    {isConnected && (
                        <div className="rounded-full bg-black/30 px-3 py-1.5 text-sm tabular-nums backdrop-blur">
                            {formatDuration(
                                elapsed,
                            )}
                        </div>
                    )}
                </header>

                <main className="flex flex-1 flex-col items-center justify-center px-5 pb-10">
                    <div className="flex w-full max-w-md flex-col items-center text-center">
                        {!showRemoteVideo && (
                            <Avatar
                                profile={
                                    profile
                                }
                                size="large"
                            />
                        )}

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

                        <div className="mt-3">
                            <CallStatus
                                state={
                                    activeCall.state
                                }
                                type={
                                    activeCall.type
                                }
                            />
                        </div>

                        {isAccepted &&
                            !isConnected && (
                                <div className="mt-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60 backdrop-blur">
                                    <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />

                                    {webRTCConnectionState ===
                                    "requesting-media"
                                        ? "Requesting microphone and camera..."
                                        : isWebRTCConnecting
                                          ? "Connecting media..."
                                          : "Preparing call..."}
                                </div>
                            )}

                        {isConnected && (
                            <p className="mt-2 text-xs text-white/45">
                                {isVideo
                                    ? "Video connected"
                                    : "Voice connected"}
                            </p>
                        )}

                        {error && (
                            <button
                                type="button"
                                onClick={
                                    clearError
                                }
                                className="mt-5 rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-left text-xs text-red-200"
                            >
                                {error}
                            </button>
                        )}
                    </div>
                </main>

                <footer className="px-5 pb-8 sm:px-8">
                    {isConnected && (
                        <div className="mb-5 flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={
                                    toggleMute
                                }
                                className={`flex h-12 w-12 items-center justify-center rounded-full border transition ${
                                    isMuted
                                        ? "border-red-400/30 bg-red-500/20 text-red-200"
                                        : "border-white/10 bg-white/10 text-white hover:bg-white/15"
                                }`}
                                aria-label={
                                    isMuted
                                        ? "Unmute microphone"
                                        : "Mute microphone"
                                }
                            >
                                {isMuted
                                    ? "🔇"
                                    : "🎙️"}
                            </button>

                            {isVideo && (
                                <button
                                    type="button"
                                    onClick={
                                        toggleCamera
                                    }
                                    className={`flex h-12 w-12 items-center justify-center rounded-full border transition ${
                                        !isCameraEnabled
                                            ? "border-red-400/30 bg-red-500/20 text-red-200"
                                            : "border-white/10 bg-white/10 text-white hover:bg-white/15"
                                    }`}
                                    aria-label={
                                        isCameraEnabled
                                            ? "Turn camera off"
                                            : "Turn camera on"
                                    }
                                >
                                    {isCameraEnabled
                                        ? "📹"
                                        : "🚫"}
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
                </footer>
            </div>
        </div>
    );
}