"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { getHostRoom } from "@/app/services/calls/room.service";
import { useLocalMedia } from "@/app/hooks/calls/useLocalMedia";
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

export default function CallPage() {
    const params = useParams<{ roomId: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();

    const roomId = params.roomId;
    const invitationToken = searchParams.get("invite");

    const [room, setRoom] = useState<HostRoom | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const {
        videoRef,
        cameraEnabled,
        microphoneEnabled,
        loading: mediaLoading,
        error: mediaError,
        startMedia,
        toggleCamera,
        toggleMicrophone,
    } = useLocalMedia();

    const invitationUrl = useMemo(() => {
        if (!invitationToken) {
            return null;
        }

        if (typeof window === "undefined") {
            return null;
        }

        return `${window.location.origin}/c/${invitationToken}`;
    }, [invitationToken]);

    useEffect(() => {
        let cancelled = false;

        async function loadRoom() {
            if (!roomId) {
                setError("Room ID is missing.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const response = await getHostRoom(roomId);

                if (cancelled) {
                    return;
                }

                setRoom(response.room);

                if (response.room.status === "ended") {
                    setError("This call has ended.");
                    return;
                }

                if (response.room.status === "expired") {
                    setError("This call has expired.");
                    return;
                }

                if (response.room.status !== "active") {
                    setError(
                        "This call has not been started yet.",
                    );

                    return;
                }

                await startMedia();
            } catch (error) {
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

        void loadRoom();

        return () => {
            cancelled = true;
        };
    }, [roomId, startMedia]);

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

    async function handleEndCall() {
        try {
            await apiFetch(`/rooms/${roomId}/end`, {
                method: "POST",
            });

            router.replace("/dashboard");
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Unable to end the call.",
            );
        }
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#09090b] text-white">
                <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />

                    <p className="mt-4 text-sm text-white/50">
                        Joining your call…
                    </p>
                </div>
            </main>
        );
    }

    if (!room) {
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

    if (room.status !== "active") {
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
            <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 sm:px-8">
                <div>
                    <div className="text-lg font-semibold tracking-tight">
                        MIYOR
                    </div>

                    <div className="mt-0.5 text-xs text-white/40">
                        Be thee, Anywhere.
                    </div>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />

                    <span className="text-xs font-medium text-white/70">
                        Connected
                    </span>
                </div>
            </header>

            {/* Main call area */}
            <div className="flex min-h-screen flex-col items-center justify-center px-5 pb-32 pt-28">
                <div className="w-full max-w-5xl">
                    {/* Waiting state */}
                    <div className="mb-7 text-center">
                        <p className="text-sm font-medium text-white/40">
                            Room {room.roomCode}
                        </p>

                        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                            Waiting for your guest
                        </h1>

                        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/50">
                            Your call is ready. Share the
                            invitation link with your guest
                            and they can join from their
                            browser.
                        </p>
                    </div>

                    {/* Video */}
                    <div className="relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#18181b] shadow-2xl">
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

                        {/* Your label */}
                        <div className="absolute bottom-4 left-4 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium backdrop-blur-md">
                            You
                        </div>

                        {/* Media error */}
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
                    </div>

                    {/* Invite panel */}
                    <div className="mx-auto mt-6 flex w-full max-w-4xl flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
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
                            onClick={handleCopyInvitation}
                            disabled={!invitationUrl}
                            className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {copied
                                ? "Copied!"
                                : "Copy invitation"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom controls */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-5 pb-7">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/60 p-2 shadow-2xl backdrop-blur-xl">
                    <button
                        type="button"
                        onClick={toggleMicrophone}
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
                        onClick={toggleCamera}
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
                        onClick={handleEndCall}
                        className="flex h-12 items-center justify-center rounded-xl bg-red-500 px-5 text-sm font-semibold text-white transition hover:bg-red-400"
                    >
                        End call
                    </button>
                </div>
            </div>
        </main>
    );
}