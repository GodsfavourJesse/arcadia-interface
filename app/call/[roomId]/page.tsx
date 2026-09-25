"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    useParams,
    useRouter,
    useSearchParams,
} from "next/navigation";

import { getHostRoom } from "@/app/services/calls/room.service";
import { useLocalMedia } from "@/app/hooks/calls/useLocalMedia";
import { useCallRealtime } from "@/app/hooks/calls/useCallRealtime";
import { useWebRTC } from "@/app/hooks/calls/useWebRTC";
import { apiFetch } from "@/app/services/api.service";

type RoomStatus =
    | "waiting"
    | "active"
    | "ended"
    | "expired";

type HostRoom = {
    id: string;
    roomCode: string;
    status: RoomStatus;
    createdAt: string;
    startedAt: string | null;
    endedAt: string | null;
    invitationExpiresAt: string;
};

type GuestSession = {
    participantId: string;
    guestToken: string;
};

function getConnectionLabel(
    connectionState: RTCPeerConnectionState,
) {
    switch (connectionState) {
        case "new":
            return "Connecting…";

        case "connecting":
            return "Connecting…";

        case "connected":
            return "Connected";

        case "disconnected":
            return "Disconnected";

        case "failed":
            return "Connection failed";

        case "closed":
            return "Call ended";

        default:
            return "Connecting…";
    }
}

export default function CallPage() {
    const params =
        useParams<{ roomId: string }>();

    const searchParams =
        useSearchParams();

    const router = useRouter();

    const roomId = params.roomId;

    const isGuest =
        searchParams.get("guest") === "1";

    const invitationToken =
        searchParams.get("invite");

    const [
        guestSession,
        setGuestSession,
    ] =
        useState<GuestSession | null>(() => {
            if (
                typeof window ===
                "undefined"
            ) {
                return null;
            }

            if (!isGuest || !roomId) {
                return null;
            }

            const stored =
                sessionStorage.getItem(
                    `miyor_guest_${roomId}`,
                );

            if (!stored) {
                return null;
            }

            try {
                const parsed =
                    JSON.parse(
                        stored,
                    ) as Partial<GuestSession>;

                if (
                    typeof parsed.participantId !==
                        "string" ||
                    typeof parsed.guestToken !==
                        "string"
                ) {
                    return null;
                }

                return {
                    participantId:
                        parsed.participantId,
                    guestToken:
                        parsed.guestToken,
                };
            } catch {
                return null;
            }
        });

    const [room, setRoom] =
        useState<HostRoom | null>(null);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState<string | null>(null);

    const [
        copied,
        setCopied,
    ] = useState(false);

    const [
        localStream,
        setLocalStream,
    ] =
        useState<MediaStream | null>(
            null,
        );

    const [
        leaving,
        setLeaving,
    ] = useState(false);

    const {
        videoRef,
        streamRef,
        cameraEnabled,
        microphoneEnabled,
        loading: mediaLoading,
        error: mediaError,
        startMedia,
        toggleCamera,
        toggleMicrophone,
        stopMedia,
    } = useLocalMedia();

    /*
     * Host connects using the normal session cookie.
     *
     * Guest connects using the temporary participant
     * credentials created on the guest join page.
     */
    const realtime =
        useCallRealtime(
            roomId,
            isGuest
                ? {
                      participantId:
                          guestSession
                              ?.participantId,
                      guestToken:
                          guestSession
                              ?.guestToken,
                  }
                : {},
        );

    const realtimeRole =
        realtime.participant?.role ??
        (isGuest
            ? "guest"
            : "host");

    const realtimeParticipantId =
        realtime.participant
            ?.participantId ??
        guestSession?.participantId ??
        null;

    const {
        remoteStream,
        connectionState,
    } = useWebRTC({
        participantId:
            realtimeParticipantId,
        role: realtimeRole,
        localStream,
        sendSignal:
            realtime.sendSignal,
        lastSignal:
            realtime.lastSignal,
        lastRoomJoined:
            realtime.lastRoomJoined,
    });

    /*
     * Attach the remote MediaStream to the
     * remote <video> element.
     */
    useEffect(() => {
        const remoteVideo =
            document.getElementById(
                "miyor-remote-video",
            ) as HTMLVideoElement | null;

        if (!remoteVideo) {
            return;
        }

        remoteVideo.srcObject =
            remoteStream;

        if (remoteStream) {
            void remoteVideo.play().catch(
                () => {
                    // Browser autoplay restrictions
                    // are handled by the muted/local
                    // interaction flow.
                },
            );
        }

        return () => {
            if (
                remoteVideo.srcObject ===
                remoteStream
            ) {
                remoteVideo.srcObject =
                    null;
            }
        };
    }, [remoteStream]);

    /*
     * Load the room.
     *
     * Hosts use getHostRoom().
     *
     * Guests already received their room access
     * from the invitation flow, so they do not call
     * the host-only room endpoint.
     */
    useEffect(() => {
        let cancelled = false;

        async function loadCall() {
            if (!roomId) {
                setError(
                    "Room ID is missing.",
                );

                setLoading(false);

                return;
            }

            /*
             * Guest credentials are required before
             * attempting the realtime connection.
             */
            if (
                isGuest &&
                !guestSession
            ) {
                setError(
                    "Your guest session is missing or expired.",
                );

                setLoading(false);

                return;
            }

            setLoading(true);
            setError(null);

            try {
                if (!isGuest) {
                    const response =
                        await getHostRoom(
                            roomId,
                        );

                    if (cancelled) {
                        return;
                    }

                    setRoom(
                        response.room,
                    );

                    if (
                        response.room.status ===
                        "ended"
                    ) {
                        setError(
                            "This call has ended.",
                        );

                        return;
                    }

                    if (
                        response.room.status ===
                        "expired"
                    ) {
                        setError(
                            "This call has expired.",
                        );

                        return;
                    }

                    if (
                        response.room.status !==
                        "active"
                    ) {
                        setError(
                            "This call has not been started yet.",
                        );

                        return;
                    }
                }

                const started =
                    await startMedia();

                if (cancelled) {
                    return;
                }

                /*
                 * useLocalMedia stores the actual
                 * MediaStream in streamRef.
                 */
                const stream =
                    streamRef.current;

                if (
                    !started ||
                    !stream
                ) {
                    setError(
                        "Unable to access your camera and microphone.",
                    );

                    return;
                }

                setLocalStream(
                    stream,
                );
            } catch (
                error
            ) {
                if (cancelled) {
                    return;
                }

                setError(
                    error instanceof Error
                        ? error.message
                        : "Unable to load the call.",
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadCall();

        return () => {
            cancelled = true;
        };
    }, [
        roomId,
        isGuest,
        guestSession,
        startMedia,
        streamRef,
    ]);

    /*
     * Realtime errors should be visible on the
     * call screen.
     */
    useEffect(() => {
        if (
            realtime.error
        ) {
            setError(
                realtime.error,
            );
        }
    }, [
        realtime.error,
    ]);

    /*
     * The guest does not need a room object.
     * We still provide a small local representation
     * for the UI.
     */
    const displayRoomCode =
        room?.roomCode ??
        (isGuest
            ? "Guest call"
            : "—");

    const invitationUrl =
        useMemo(() => {
            if (
                !invitationToken ||
                typeof window ===
                    "undefined"
            ) {
                return null;
            }

            return `${window.location.origin}/c/${invitationToken}`;
        }, [
            invitationToken,
        ]);

    const connectionLabel =
        getConnectionLabel(
            connectionState,
        );

    const hasRemoteParticipant =
        Boolean(
            remoteStream,
        );

    async function handleCopyInvitation() {
        if (!invitationUrl) {
            setError(
                "The invitation link is unavailable.",
            );

            return;
        }

        try {
            await navigator.clipboard.writeText(
                invitationUrl,
            );

            setCopied(true);

            window.setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch {
            setError(
                "Unable to copy the invitation link.",
            );
        }
    }

    async function handleLeaveCall() {
        if (leaving) {
            return;
        }

        setLeaving(true);

        try {
            realtime.disconnect();
            stopMedia();

            if (isGuest) {
                sessionStorage.removeItem(
                    `miyor_guest_${roomId}`,
                );

                router.replace(
                    "/",
                );

                return;
            }

            await apiFetch(
                `/rooms/${roomId}/end`,
                {
                    method: "POST",
                },
            );

            router.replace(
                "/dashboard",
            );
        } catch (
            error
        ) {
            setLeaving(false);

            setError(
                error instanceof Error
                    ? error.message
                    : "Unable to leave the call.",
            );
        }
    }

    /*
     * Loading state.
     */
    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#09090b] text-white">
                <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />

                    <p className="mt-4 text-sm text-white/50">
                        {isGuest
                            ? "Joining the call…"
                            : "Starting your call…"}
                    </p>
                </div>
            </main>
        );
    }

    /*
     * Guest authentication/session failure.
     */
    if (
        isGuest &&
        !guestSession
    ) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-6 text-white">
                <div className="max-w-md text-center">
                    <h1 className="text-xl font-semibold">
                        Guest session unavailable
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-white/50">
                        {error ??
                            "Your invitation session is no longer available. Please open the invitation link again."}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                "/",
                            )
                        }
                        className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                    >
                        Return home
                    </button>
                </div>
            </main>
        );
    }

    /*
     * Host failed to load its room.
     */
    if (
        !isGuest &&
        !room
    ) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-6 text-white">
                <div className="max-w-md text-center">
                    <h1 className="text-xl font-semibold">
                        Call unavailable
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-white/50">
                        {error ??
                            "We couldn't load this call."}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                "/dashboard/calls",
                            )
                        }
                        className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                    >
                        Back to calls
                    </button>
                </div>
            </main>
        );
    }

    if (
        !isGuest &&
        room &&
        room.status !== "active"
    ) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-6 text-white">
                <div className="max-w-md text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-xl">
                        !
                    </div>

                    <h1 className="mt-5 text-xl font-semibold">
                        Call not available
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-white/50">
                        {error ??
                            "This call is not currently active."}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                "/dashboard/calls",
                            )
                        }
                        className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                    >
                        Back to calls
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#09090b] text-white">
            {/* Top bar */}
            <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-5 sm:px-8">
                <div>
                    <div className="text-lg font-semibold tracking-tight">
                        MIYOR
                    </div>

                    <div className="mt-0.5 text-xs text-white/40">
                        Be thee, Anywhere.
                    </div>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md">
                    <span
                        className={`h-2 w-2 rounded-full ${
                            connectionState ===
                            "connected"
                                ? "bg-emerald-400"
                                : connectionState ===
                                    "failed"
                                  ? "bg-red-400"
                                  : "bg-amber-400"
                        }`}
                    />

                    <span className="text-xs font-medium text-white/70">
                        {connectionLabel}
                    </span>
                </div>
            </header>

            {/* Main call area */}
            <div className="flex min-h-screen flex-col items-center justify-center px-5 pb-32 pt-28">
                <div className="w-full max-w-6xl">
                    {/* Header */}
                    <div className="mb-7 text-center">
                        <p className="text-sm font-medium text-white/40">
                            {displayRoomCode}
                        </p>

                        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                            {hasRemoteParticipant
                                ? "You're on a call"
                                : isGuest
                                  ? "Waiting for the host"
                                  : "Waiting for your guest"}
                        </h1>

                        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/50">
                            {hasRemoteParticipant
                                ? "Your video call is connected."
                                : isGuest
                                  ? "The host will appear here when the call connects."
                                  : "Share the invitation link with your guest and they can join from their browser."}
                        </p>
                    </div>

                    {/* Video grid */}
                    <div
                        className={`mx-auto grid w-full max-w-6xl gap-4 ${
                            hasRemoteParticipant
                                ? "grid-cols-1 lg:grid-cols-2"
                                : "grid-cols-1"
                        }`}
                    >
                        {/* Remote video */}
                        {hasRemoteParticipant && (
                            <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-[#18181b] shadow-2xl">
                                <video
                                    id="miyor-remote-video"
                                    autoPlay
                                    playsInline
                                    className="h-full w-full object-cover"
                                />

                                <div className="absolute bottom-4 left-4 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium backdrop-blur-md">
                                    {isGuest
                                        ? "Host"
                                        : "Guest"}
                                </div>
                            </div>
                        )}

                        {/* Local video */}
                        <div
                            className={`relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-[#18181b] shadow-2xl ${
                                hasRemoteParticipant
                                    ? ""
                                    : "mx-auto w-full max-w-5xl"
                            }`}
                        >
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className={`h-full w-full object-cover ${
                                    cameraEnabled
                                        ? ""
                                        : "hidden"
                                }`}
                            />

                            {!cameraEnabled && (
                                <div className="flex h-full items-center justify-center">
                                    <div className="text-center">
                                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-semibold">
                                            You
                                        </div>

                                        <p className="mt-4 text-sm text-white/40">
                                            Camera is off
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="absolute bottom-4 left-4 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium backdrop-blur-md">
                                You
                            </div>

                            {mediaError && (
                                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-red-400/20 bg-red-950/80 px-4 py-3 text-sm text-red-200 backdrop-blur-md">
                                    {mediaError}
                                </div>
                            )}

                            {mediaLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                                    <div className="rounded-full bg-black/60 px-4 py-2 text-sm text-white/70">
                                        Starting camera…
                                    </div>
                                </div>
                            )}

                            {!realtime.connected &&
                                !realtime.error &&
                                !mediaLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <div className="rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm text-white/60 backdrop-blur-md">
                                            Connecting to call…
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>

                    {/* Realtime error */}
                    {error && (
                        <div className="mx-auto mt-5 max-w-4xl rounded-2xl border border-red-400/20 bg-red-950/60 px-4 py-3 text-sm text-red-200">
                            {error}
                        </div>
                    )}

                    {/* Host invitation panel */}
                    {!isGuest &&
                        !hasRemoteParticipant && (
                            <div className="mx-auto mt-6 flex w-full max-w-5xl flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-white">
                                        Invite your guest
                                    </p>

                                    <p className="mt-1 truncate text-xs text-white/40">
                                        {invitationUrl ??
                                            "Invitation link unavailable"}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        handleCopyInvitation
                                    }
                                    disabled={
                                        !invitationUrl
                                    }
                                    className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {copied
                                        ? "Copied!"
                                        : "Copy invitation"}
                                </button>
                            </div>
                        )}
                </div>
            </div>

            {/* Bottom controls */}
            <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center px-5 pb-7">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/60 p-2 shadow-2xl backdrop-blur-xl">
                    <button
                        type="button"
                        onClick={
                            toggleMicrophone
                        }
                        className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm transition ${
                            microphoneEnabled
                                ? "bg-white/10 text-white hover:bg-white/15"
                                : "bg-red-500 text-white"
                        }`}
                        aria-label={
                            microphoneEnabled
                                ? "Mute microphone"
                                : "Unmute microphone"
                        }
                    >
                        {microphoneEnabled
                            ? "🎤"
                            : "🔇"}
                    </button>

                    <button
                        type="button"
                        onClick={
                            toggleCamera
                        }
                        className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm transition ${
                            cameraEnabled
                                ? "bg-white/10 text-white hover:bg-white/15"
                                : "bg-red-500 text-white"
                        }`}
                        aria-label={
                            cameraEnabled
                                ? "Turn camera off"
                                : "Turn camera on"
                        }
                    >
                        {cameraEnabled
                            ? "📹"
                            : "🚫"}
                    </button>

                    <div className="mx-1 h-7 w-px bg-white/10" />

                    <button
                        type="button"
                        onClick={
                            handleLeaveCall
                        }
                        disabled={leaving}
                        className="flex h-12 items-center justify-center rounded-xl bg-red-500 px-5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {leaving
                            ? "Leaving…"
                            : isGuest
                              ? "Leave call"
                              : "End call"}
                    </button>
                </div>
            </div>
        </main>
    );
}