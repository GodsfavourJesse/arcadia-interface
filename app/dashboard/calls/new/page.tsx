"use client";

import Link from "next/link";
import { Fragment, useCallback, useRef, useState } from "react";

import { createDirectConversation } from "@/app/services/conversation/conversations.service";
import { searchUsers } from "@/app/services/users/users.service";
import { useCallStore } from "@/app/store/calls/call.store";
import { CALL_TYPE, type CallType } from "@/app/types/calls/calls.types";
import { useAvatarSelection } from "@/app/hooks/avatar/useAvatarSelection";
import { AvatarCard } from "@/app/components/avatar/avatar-card";
import type { AvatarDefinition } from "@/app/types/avatar/avatar.types";
import { useActiveCall } from "@/app/hooks/calls/useActiveCall";
import type { DiscoverableUser } from "@/app/types/users/users.types";

type Step = "recipient" | "type" | "avatar";

const STEPS: { id: Step; label: string }[] = [
    { id: "recipient", label: "1. Person" },
    { id: "type", label: "2. Call type" },
    { id: "avatar", label: "3. Avatar" },
];

function PhoneIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
        >
            <path
                d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2C11.1 19.5 4.5 12.9 4.5 5.5a2 2 0 0 1 2-2Z"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function VideoIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
        >
            <rect x="3" y="6" width="12" height="12" rx="2" />
            <path
                d="m15 10 5-3v10l-5-3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function ErrorBanner({ message }: { message: string }) {
    return (
        <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
            {message}
        </div>
    );
}

function UserAvatar({ user }: { user: DiscoverableUser }) {
    if (user.profilePictureUrl) {
        return (
            <img
                src={user.profilePictureUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
        );
    }

    const initials =
        user.displayName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "M";

    return (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-600">
            {initials}
        </div>
    );
}

function SearchResult({
    user,
    selected,
    onSelect,
}: {
    user: DiscoverableUser;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                selected
                    ? "border-slate-950 bg-slate-50"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
        >
            <UserAvatar user={user} />

            <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-950">
                    {user.displayName}
                </p>

                <p className="mt-0.5 truncate text-sm text-slate-500">
                    @{user.username}
                </p>

                {user.miyorNumber && (
                    <p className="mt-1 text-xs font-medium text-slate-400">
                        Miyor #{user.miyorNumber}
                    </p>
                )}
            </div>

            {selected && (
                <span className="text-sm font-semibold text-slate-950">
                    Selected
                </span>
            )}
        </button>
    );
}

export default function MakeCallPage() {
    const startCall = useCallStore((state) => state.startCall);
    const storeError = useCallStore((state) => state.error);
    const isStarting = useCallStore((state) => state.isStarting);

    const { activeCall } = useActiveCall();

    const [uploadedAvatar, setUploadedAvatar] =
        useState<AvatarDefinition | null>(null);

    const uploadInputRef =
        useRef<HTMLInputElement | null>(null);

    const { avatars, selectedAvatar, selectAvatar, isSelected } =
        useAvatarSelection({
            initialAvatarId: "default-vrm",
            extraAvatars: uploadedAvatar ? [uploadedAvatar] : [],
        });

    const [step, setStep] = useState<Step>("recipient");
    const [miyorNumber, setMiyorNumber] = useState("");
    const [results, setResults] = useState<DiscoverableUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<DiscoverableUser | null>(
        null,
    );
    const [callType, setCallType] = useState<CallType | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isCreatingConversation, setIsCreatingConversation] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const busy = isStarting || isCreatingConversation;

    /*
     * Show a single error at a time so the same failure is not
     * rendered twice (local error + store error).
     */
    const displayError = error ?? storeError;

    const handleSearch = useCallback(async () => {
        if (isSearching) {
            return;
        }

        const query = miyorNumber.trim();

        if (!query) {
            setError("Enter a Miyor number.");
            return;
        }

        setError(null);
        setSelectedUser(null);
        setResults([]);
        setIsSearching(true);

        try {
            /*
             * searchUsers() returns UserSearchResponse directly.
             *
             * The response shape is:
             *
             * {
             *     status: "ok",
             *     results: DiscoverableUser[]
             * }
             */
            const response = await searchUsers(query);

            setResults(response.results);

            if (response.results.length === 1) {
                setSelectedUser(response.results[0]);
            }

            if (response.results.length === 0) {
                setError("No Miyor member was found with that number.");
            }
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Unable to find that Miyor member.",
            );
        } finally {
            setIsSearching(false);
        }
    }, [isSearching, miyorNumber]);

    function handleContinueFromRecipient() {
        if (!selectedUser) {
            setError("Select the Miyor member you want to call.");
            return;
        }

        setError(null);
        setStep("type");
    }

    async function createAndStartCall(
        type: CallType,
        avatar: AvatarDefinition | null,
    ) {
        if (!selectedUser) {
            setError("Select a Miyor member first.");
            return;
        }

        /*
         * Video calls require an avatar.
         *
         * Resolve the nullable parameter before entering the async
         * try block so the rest of the function works with a single
         * value instead of re-checking the call type.
         */
        const videoAvatar = type === CALL_TYPE.VIDEO ? avatar : null;

        if (type === CALL_TYPE.VIDEO && !videoAvatar) {
            setError("Select an avatar before starting the video call.");
            return;
        }

        setError(null);
        setIsCreatingConversation(true);

        try {
            /*
             * createDirectConversation() returns
             * CreateConversationResponse directly.
             */
            const conversationResponse = await createDirectConversation(
                selectedUser.id,
            );

            const conversationId = conversationResponse.conversation.id;

            /*
             * The selected avatar is local media configuration.
             * It is not sent to the backend as media, tracking,
             * or call metadata.
             */
            await startCall({
                conversationId,
                calleeId: selectedUser.id,
                type,
                initialVideoSource:
                    type === CALL_TYPE.VIDEO ? "avatar" : "camera",
                avatarId: videoAvatar?.id ?? null,
                avatar: videoAvatar,
            });
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Unable to start the call.",
            );
        } finally {
            setIsCreatingConversation(false);
        }
    }

    function handleSelectType(type: CallType) {
        if (!selectedUser || busy) {
            return;
        }

        setCallType(type);
        setError(null);

        if (type === CALL_TYPE.VIDEO) {
            setStep("avatar");
            return;
        }

        void createAndStartCall(type, null);
    }

    const handleAvatarImageUpload = useCallback(
        (file: File) => {
            if (!file.type.startsWith("image/")) {
                setError("Please choose a PNG, JPEG, or WebP image.");
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                setError("Avatar images must be 10 MB or smaller.");
                return;
            }

            const assetUrl = URL.createObjectURL(file);

            const avatar: AvatarDefinition = {
                id: `uploaded-${crypto.randomUUID()}`,
                name: file.name.replace(/\.[^/.]+$/, "") || "My photo avatar",
                type: "image",
                renderMode: "static",
                thumbnailUrl: assetUrl,
                assetUrl,
                enabled: true,
                capabilities: {
                    headTracking: true,
                    eyeTracking: true,
                    mouthTracking: true,
                    facialExpressions: true,
                },
            };

            setUploadedAvatar((previous) => {
                if (previous?.assetUrl.startsWith("blob:")) {
                    URL.revokeObjectURL(previous.assetUrl);
                }
                return avatar;
            });

            selectAvatar(avatar);
            setError(null);
        },
        [selectAvatar],
    );

    function handleConfirmAvatar() {
        if (!selectedAvatar) {
            setError("Select an avatar to continue.");
            return;
        }

        void createAndStartCall(CALL_TYPE.VIDEO, selectedAvatar);
    }

    function handleBack() {
        setError(null);

        if (step === "avatar") {
            setCallType(null);
            setStep("type");
            return;
        }

        if (step === "type") {
            setCallType(null);
            setStep("recipient");
        }
    }

    if (activeCall) {
        return (
            <main className="mx-auto w-full max-w-3xl px-6 py-10">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <h1 className="text-xl font-semibold text-slate-950">
                        You are already in a call
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Finish your current call before starting another one.
                    </p>

                    <Link
                        href="/dashboard"
                        className="mt-6 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                    >
                        Back to dashboard
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto w-full max-w-3xl px-6 py-8">
                <Link
                    href="/dashboard"
                    className="text-sm font-medium text-slate-500 transition hover:text-slate-950"
                >
                    ← Dashboard
                </Link>

                <header className="mt-8">
                    <p className="text-sm font-medium text-slate-500">Miyor</p>

                    <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                        Make a call
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Connect with a Miyor member using their Miyor number.
                    </p>
                </header>

                <div className="mt-8">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                        {STEPS.map((item, index) => (
                            <Fragment key={item.id}>
                                {index > 0 && <span>•</span>}

                                <span
                                    className={
                                        step === item.id
                                            ? "text-slate-950"
                                            : ""
                                    }
                                >
                                    {item.label}
                                </span>
                            </Fragment>
                        ))}
                    </div>
                </div>

                {displayError && <ErrorBanner message={displayError} />}

                {step === "recipient" && (
                    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-950">
                            Who do you want to call?
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Enter their Miyor number.
                        </p>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <input
                                value={miyorNumber}
                                onChange={(event) =>
                                    setMiyorNumber(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        void handleSearch();
                                    }
                                }}
                                inputMode="numeric"
                                placeholder="e.g. 123456789"
                                className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />

                            <button
                                type="button"
                                onClick={() => void handleSearch()}
                                disabled={isSearching || !miyorNumber.trim()}
                                className="h-12 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSearching ? "Searching..." : "Find member"}
                            </button>
                        </div>

                        {results.length > 0 && (
                            <div className="mt-6 space-y-3">
                                {results.map((user) => (
                                    <SearchResult
                                        key={user.id}
                                        user={user}
                                        selected={selectedUser?.id === user.id}
                                        onSelect={() => setSelectedUser(user)}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={handleContinueFromRecipient}
                                disabled={!selectedUser}
                                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Continue
                            </button>
                        </div>
                    </section>
                )}

                {step === "type" && (
                    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        {selectedUser && (
                            <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                                <UserAvatar user={selectedUser} />

                                <div>
                                    <p className="font-semibold text-slate-950">
                                        {selectedUser.displayName}
                                    </p>

                                    <p className="text-sm text-slate-500">
                                        {selectedUser.miyorNumber
                                            ? `Miyor #${selectedUser.miyorNumber}`
                                            : `@${selectedUser.username}`}
                                    </p>
                                </div>
                            </div>
                        )}

                        <h2 className="mt-8 text-lg font-semibold text-slate-950">
                            How do you want to call?
                        </h2>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => handleSelectType(CALL_TYPE.VOICE)}
                                disabled={busy}
                                className="group rounded-2xl border border-slate-200 p-6 text-left transition hover:border-slate-400 hover:shadow-sm disabled:opacity-50"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                    <PhoneIcon />
                                </div>

                                <h3 className="mt-5 font-semibold text-slate-950">
                                    Voice call
                                </h3>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Start an audio call immediately.
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSelectType(CALL_TYPE.VIDEO)}
                                disabled={busy}
                                className="group rounded-2xl border border-slate-200 p-6 text-left transition hover:border-slate-400 hover:shadow-sm disabled:opacity-50"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                    <VideoIcon />
                                </div>

                                <h3 className="mt-5 font-semibold text-slate-950">
                                    Video call
                                </h3>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Choose your avatar before you call.
                                </p>
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={busy}
                            className="mt-6 text-sm font-medium text-slate-500 hover:text-slate-950"
                        >
                            ← Back
                        </button>
                    </section>
                )}

                {step === "avatar" && (
                    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-950">
                                Choose your avatar
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                This is what the other person will see when the
                                video call connects.
                            </p>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                            {avatars.map((avatar) => (
                                <AvatarCard
                                    key={avatar.id}
                                    avatar={avatar}
                                    selected={isSelected(avatar.id)}
                                    disabled={busy}
                                    onSelect={() => selectAvatar(avatar)}
                                />
                            ))}
                        </div>

                        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-950">
                                        Use your own image
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        Upload a clear, front-facing portrait. Miyor will track the face locally during the call.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => uploadInputRef.current?.click()}
                                    className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Upload image
                                </button>
                            </div>

                            <input
                                ref={uploadInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    event.target.value = "";
                                    if (file) {
                                        handleAvatarImageUpload(file);
                                    }
                                }}
                            />
                        </div>

                        {selectedAvatar && (
                            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-slate-950">
                                    {selectedAvatar.name}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Ready for your video call.
                                </p>
                            </div>
                        )}

                        <div className="mt-6 flex items-center justify-between gap-4">
                            <button
                                type="button"
                                onClick={handleBack}
                                disabled={busy}
                                className="text-sm font-medium text-slate-500 hover:text-slate-950"
                            >
                                ← Back
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmAvatar}
                                disabled={busy || !selectedAvatar}
                                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {busy ? "Starting call..." : "Start video call"}
                            </button>
                        </div>
                    </section>
                )}

                {callType && (
                    <p className="mt-6 text-center text-xs text-slate-400">
                        {callType === CALL_TYPE.VIDEO
                            ? "Your avatar will be prepared before the video session begins."
                            : "Your microphone will be requested when the call connects."}
                    </p>
                )}
            </div>
        </main>
    );
}