"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";


import { useGuestJoin } from "@/app/hooks/calls/useGuestJoin";
import { useInvitation } from "@/app/hooks/calls/useInvitation";
import { useLocalMedia } from "@/app/hooks/calls/useLocalMedia";
import { InvitationError } from "@/app/components/calls/InvitationError";
import { GuestNameStep } from "@/app/components/calls/GuestNameStep";
import { MediaPermissionStep } from "@/app/components/calls/MediaPermissionStep";
import { GuestPreviewStep } from "@/app/components/calls/GuestPreviewStep";

type LobbyStep =
    | "name"
    | "permissions"
    | "ready";

export default function CallLobbyPage() {
    const params = useParams();
    const router = useRouter();

    const token =
        typeof params.token === "string"
            ? params.token
            : "";

    const invitation =
        useInvitation(token);

    const guest =
        useGuestJoin(
            invitation.room?.id ?? null,
        );

    const media =
        useLocalMedia();

    const [step, setStep] =
        useState<LobbyStep>("name");

    if (invitation.loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5">
                <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />

                    <p className="mt-4 text-sm text-slate-400">
                        Checking your invitation...
                    </p>
                </div>
            </main>
        );
    }

    if (invitation.error || !invitation.room) {
        return (
            <InvitationError
                message={
                    invitation.error ??
                    "This invitation is invalid or has expired."
                }
            />
        );
    }

    async function handleContinue() {
        const joined =
            await guest.join();

        if (joined) {
            setStep("permissions");
        }
    }

    async function handleAllowMedia() {
        const stream =
            await media.startMedia();

        if (stream) {
            setStep("ready");
        }
    }

    function handleJoinCall() {
        if (
            !guest.participantId ||
            !guest.guestToken ||
            !media.streamRef.current
        ) {
            return;
        }

        /*
         * Phase 8:
         *
         * WebSocket signaling
         * +
         * WebRTC
         *
         * For now, navigate to the
         * future call screen.
         */
        router.push(
            `/call/${invitation.room!.id}`,
        );
    }

    if (step === "name") {
        return (
            <GuestNameStep
                displayName={
                    guest.displayName
                }
                error={guest.error}
                joining={guest.joining}
                onDisplayNameChange={
                    guest.setDisplayName
                }
                onContinue={
                    handleContinue
                }
            />
        );
    }

    if (step === "permissions") {
        return (
            <MediaPermissionStep
                displayName={
                    guest.displayName
                }
                loading={media.loading}
                error={media.error}
                onAllow={
                    handleAllowMedia
                }
            />
        );
    }

    return (
        <GuestPreviewStep
            displayName={
                guest.displayName
            }
            videoRef={
                media.videoRef
            }
            cameraEnabled={
                media.cameraEnabled
            }
            microphoneEnabled={
                media.microphoneEnabled
            }
            canJoin={
                Boolean(
                    guest.participantId &&
                    guest.guestToken &&
                    media.streamRef.current,
                )
            }
            onToggleCamera={
                media.toggleCamera
            }
            onToggleMicrophone={
                media.toggleMicrophone
            }
            onJoin={
                handleJoinCall
            }
        />
    );
}