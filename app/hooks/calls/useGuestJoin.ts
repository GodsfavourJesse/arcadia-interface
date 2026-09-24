"use client";

import { useState } from "react";

import { joinRoomAsGuest } from "@/app/services/calls/participant.service";

export function useGuestJoin(
    roomId: string | null,
) {
    const [displayName, setDisplayName] =
        useState("");

    const [participantId, setParticipantId] =
        useState<string | null>(null);

    const [guestToken, setGuestToken] =
        useState<string | null>(null);

    const [joining, setJoining] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    async function join() {
        if (!roomId || joining) {
            return false;
        }

        const name =
            displayName.trim();

        if (!name) {
            setError("Name is required.");
            return false;
        }

        setJoining(true);
        setError(null);

        try {
            const response =
                await joinRoomAsGuest(
                    roomId,
                    name,
                );

            setParticipantId(
                response.participant.id,
            );

            setGuestToken(
                response.guestToken,
            );

            return true;
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Unable to join this call.",
            );

            return false;
        } finally {
            setJoining(false);
        }
    }

    return {
        displayName,
        setDisplayName,
        participantId,
        guestToken,
        joining,
        error,
        join,
    };
}