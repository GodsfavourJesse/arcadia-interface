"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    getHostRoom,
    startRoom,
} from "@/app/services/calls/room.service";

import type {
    HostRoom,
} from "@/app/types/calls/room.types";

export function useHostRoom(
    roomId: string,
) {
    const [room, setRoom] =
        useState<HostRoom | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [starting, setStarting] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const loadRoom = useCallback(
        async () => {
            if (!roomId) {
                setError("Room ID is missing.");
                setLoading(false);
                return null;
            }

            setLoading(true);
            setError(null);

            try {
                const response =
                    await getHostRoom(roomId);

                setRoom(response.room);

                return response.room;
            } catch (error) {
                setError(
                    error instanceof Error
                        ? error.message
                        : "Unable to load the room.",
                );

                return null;
            } finally {
                setLoading(false);
            }
        },
        [roomId],
    );

    useEffect(() => {
        void loadRoom();
    }, [loadRoom]);

    const start = useCallback(
        async () => {
            if (!roomId || starting) {
                return null;
            }

            setStarting(true);
            setError(null);

            try {
                const response =
                    await startRoom(roomId);

                setRoom((current) =>
                    current
                        ? {
                              ...current,
                              status:
                                  response.room.status,
                              startedAt:
                                  response.room
                                      .startedAt,
                          }
                        : current,
                );

                return response.room;
            } catch (error) {
                setError(
                    error instanceof Error
                        ? error.message
                        : "Unable to start the call.",
                );

                return null;
            } finally {
                setStarting(false);
            }
        },
        [roomId, starting],
    );

    return {
        room,
        loading,
        starting,
        error,
        loadRoom,
        start,
    };
}