"use client";

import {
    useEffect,
} from "react";

import {
    useParams,
    useRouter,
} from "next/navigation";

import { HostLobby } from "@/app/components/calls/HostLobby";
import { useHostRoom } from "@/app/hooks/calls/useHostRoom";
import { useLocalMedia } from "@/app/hooks/calls/useLocalMedia";

export default function HostLobbyPage() {
    const params = useParams<{
        roomId: string;
    }>();

    const router = useRouter();

    const roomId = params.roomId;

    const {
        room,
        loading: roomLoading,
        starting,
        error: roomError,
        start,
    } = useHostRoom(roomId);

    const {
        videoRef,
        cameraEnabled,
        microphoneEnabled,
        loading: mediaLoading,
        error: mediaError,
        startMedia,
        toggleCamera,
        toggleMicrophone,
        stopMedia,
    } = useLocalMedia();

    useEffect(() => {
        if (!room) {
            return;
        }

        if (room.status === "active") {
            router.replace(
                `/call/${room.id}`,
            );
        }
    }, [room, router]);

    useEffect(() => {
        if (roomLoading) {
            return;
        }

        if (!room) {
            return;
        }

        if (room.status !== "waiting") {
            return;
        }

        void startMedia();
    }, [
        room,
        roomLoading,
        startMedia,
    ]);

    useEffect(() => {
        return () => {
            stopMedia();
        };
    }, [stopMedia]);

    async function handleStartCall() {
        const startedRoom = await start();

        if (!startedRoom) {
            return;
        }

        const invitationToken = new URLSearchParams(
            window.location.search,
        ).get("invite");

        const query = invitationToken
            ? `?invite=${encodeURIComponent(invitationToken)}`
            : "";

        router.replace(
            `/call/${startedRoom.id}${query}`,
        );
    }

    if (roomLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black text-white">
                <p className="text-sm text-white/50">
                    Loading your room…
                </p>
            </main>
        );
    }

    if (!room) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
                <div className="max-w-md text-center">
                    <h1 className="text-xl font-semibold">
                        Room unavailable
                    </h1>

                    <p className="mt-2 text-sm text-white/50">
                        {roomError ??
                            "This room could not be found."}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                "/dashboard/calls",
                            )
                        }
                        className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"
                    >
                        Back to calls
                    </button>
                </div>
            </main>
        );
    }

    if (room.status !== "waiting") {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black text-white">
                <p className="text-sm text-white/50">
                    This room is no longer waiting to
                    start.
                </p>
            </main>
        );
    }

    return (
        <HostLobby
            roomCode={room.roomCode}
            videoRef={videoRef}
            cameraEnabled={cameraEnabled}
            microphoneEnabled={
                microphoneEnabled
            }
            mediaLoading={mediaLoading}
            starting={starting}
            error={
                roomError ??
                mediaError
            }
            onStartCall={handleStartCall}
            onToggleCamera={toggleCamera}
            onToggleMicrophone={
                toggleMicrophone
            }
        />
    );
}