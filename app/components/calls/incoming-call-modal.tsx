"use client";

import {
    useEffect,
    useState,
} from "react";

import {
    getConversation,
} from "@/app/services/conversations.service";

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
                className="h-24 w-24 rounded-full object-cover ring-4 ring-white/10"
            />
        );
    }

    return (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-2xl font-semibold text-white ring-4 ring-white/5">
            {initials}
        </div>
    );
}

function PhoneIcon() {
    return (
        <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            aria-hidden="true"
        >
            <path
                d="M6.5 4.5h3l1.5 4-2.2 1.3a11.3 11.3 0 0 0 5.4 5.4l1.3-2.2 4 1.5v3a2 2 0 0 1-2.2 2C10.1 19.5 4.5 13.9 4.5 6.7a2 2 0 0 1 2-2.2Z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
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

export function IncomingCallModal() {
    const {
        activeCall,
        isIncoming,
        isActionPending,
    } = useActiveCall();

    const accept =
        useCallStore(
            (state) => state.accept,
        );

    const decline =
        useCallStore(
            (state) => state.decline,
        );

    const [profile, setProfile] =
        useState<Profile>({
            displayName: "Miyor user",
        });

    useEffect(() => {
        if (!activeCall || !isIncoming) {
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

                /*
                * The incoming caller is the participant
                * whose userId is the call initiator.
                */
                const caller =
                    response.conversation.members.find(
                        (item) =>
                            item.userId === call.initiatedBy,
                    );

                const selected = caller ?? member;

                if (!cancelled && selected) {
                    setProfile({
                        displayName:
                            selected.user.displayName ||
                            "Miyor user",
                        username:
                            selected.user.username,
                        profilePictureUrl:
                            selected.user.profilePictureUrl ??
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
        activeCall?.id,
        activeCall?.conversationId,
        activeCall?.initiatedBy,
        isIncoming,
    ]);

    if (
        !activeCall ||
        !isIncoming
    ) {
        return null;
    }

    const typeLabel =
        activeCall.type === CALL_TYPE.VIDEO
            ? "video"
            : "voice";

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/75 p-5 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-8 text-center text-white shadow-2xl">
                <div className="relative mx-auto w-fit">
                    <span className="absolute -inset-3 animate-ping rounded-full bg-white/5" />
                    <Avatar profile={profile} />
                </div>

                <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                    Incoming {typeLabel} call
                </p>

                <h2 className="mt-2 text-2xl font-semibold">
                    {profile.displayName}
                </h2>

                {profile.username && (
                    <p className="mt-1 text-sm text-white/40">
                        @{profile.username}
                    </p>
                )}

                <div className="mt-8 flex items-center justify-center gap-8">
                    <button
                        type="button"
                        onClick={() =>
                            void decline()
                        }
                        disabled={
                            isActionPending
                        }
                        className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-400 disabled:opacity-50"
                        aria-label="Decline call"
                    >
                        <XIcon />
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            void accept()
                        }
                        disabled={
                            isActionPending
                        }
                        className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-400 disabled:opacity-50"
                        aria-label="Accept call"
                    >
                        {isActionPending ? (
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                            <PhoneIcon />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}