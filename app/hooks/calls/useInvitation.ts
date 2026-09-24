"use client";

import { useEffect, useState } from "react";

import { getInvitation } from "@/app/services/calls/invitation.service";
import type { InvitationRoom } from "@/app/types/calls/invitation.types";

export function useInvitation(token: string) {
    const [room, setRoom] =
        useState<InvitationRoom | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setError("Invalid invitation.");
            setLoading(false);
            return;
        }

        let cancelled = false;

        async function loadInvitation() {
            setLoading(true);
            setError(null);

            try {
                const response =
                    await getInvitation(token);

                if (cancelled) {
                    return;
                }

                setRoom(response.room);
            } catch (error) {
                if (cancelled) {
                    return;
                }

                setError(
                    error instanceof Error
                        ? error.message
                        : "This invitation is invalid or has expired.",
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadInvitation();

        return () => {
            cancelled = true;
        };
    }, [token]);

    return {
        room,
        loading,
        error,
    };
}