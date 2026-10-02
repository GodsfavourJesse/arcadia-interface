"use client";

import {
    useEffect,
    useState,
} from "react";

import {
    getConversation,
} from "@/app/services/conversation/conversations.service";

import {
    useActiveCall,
} from "@/app/hooks/calls/useActiveCall";

import {
    useCallStore,
} from "@/app/store/calls/call.store";

import {
    CALL_TYPE,
} from "@/app/types/calls/calls.types";

type Profile = {
    displayName: string;
    username?: string;
    profilePictureUrl?: string | null;
};

function Avatar({
    profile,
}: {
    profile: Profile;
}) {
    const initials =
        profile.displayName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) =>
                part[0]?.toUpperCase(),
            )
            .join("") || "M";

    if (profile.profilePictureUrl) {
        return (
            <img
                src={
                    profile.profilePictureUrl
                }
                alt=""
                className="h-28 w-28 rounded-full object-cover ring-4 ring-white/10"
            />
        );
    }

    return (
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-3xl font-semibold text-white ring-4 ring-white/5">
            {initials}
        </div>
    );
}

function XIcon() {
    return (
        <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
        >
            <path
                d="m7 7 10 10M17 7 7 17"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function OutgoingCallModal() {
    const {
        activeCall,
        isOutgoing,
        isActionPending,
    } = useActiveCall();

    const cancel =
        useCallStore(
            (state) => state.cancel,
        );

    const [profile, setProfile] =
        useState<Profile>({
            displayName: "Miyor user",
        });

    useEffect(() => {
        if (!activeCall || !isOutgoing) {
            return;
        }

        const call = activeCall;
        let cancelled = false;

        async function loadProfile() {
            try {
                const response = await getConversation(
                    call.conversationId,
                );

                const member =
                    response.conversation.members.find(
                        (item) =>
                            item.userId !== call.initiatedBy,
                    );

                if (!cancelled && member) {
                    setProfile({
                        displayName:
                            member.user.displayName ||
                            "Miyor user",
                        username:
                            member.user.username,
                        profilePictureUrl:
                            member.user.profilePictureUrl ??
                            null,
                    });
                }
            } catch {
                // Keep fallback.
            }
        }

        void loadProfile();

        return () => {
            cancelled = true;
        };
    }, [
        activeCall?.id,
        activeCall?.conversationId,
        activeCall?.initiatedBy,
        isOutgoing,
    ]);

    if (
        !activeCall ||
        !isOutgoing
    ) {
        return null;
    }

    const typeLabel =
        activeCall.type === CALL_TYPE.VIDEO
            ? "video"
            : "voice";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 text-white">
            <div className="flex w-full max-w-md flex-col items-center px-6 text-center">
                <div className="relative">
                    <span className="absolute -inset-5 animate-ping rounded-full bg-white/5" />
                    <span className="absolute -inset-2 rounded-full border border-white/10" />

                    <Avatar profile={profile} />
                </div>

                <p className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                    {typeLabel} call
                </p>

                <h1 className="mt-2 text-3xl font-semibold">
                    {profile.displayName}
                </h1>

                {profile.username && (
                    <p className="mt-1 text-sm text-white/40">
                        @{profile.username}
                    </p>
                )}

                <p className="mt-4 text-sm text-white/60">
                    Calling…
                </p>

                <button
                    type="button"
                    onClick={() =>
                        void cancel()
                    }
                    disabled={
                        isActionPending
                    }
                    className="mt-12 flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-950/30 transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Cancel call"
                >
                    <XIcon />
                </button>
            </div>
        </div>
    );
}