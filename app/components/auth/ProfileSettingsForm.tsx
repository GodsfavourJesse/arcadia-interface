"use client";

import { useAuth } from "@/app/hooks/auth/useAuth";
import { profileUpdateSchema } from "@/app/schemas/auth.schemas";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    AuthField,
    AuthTextArea,
    FormAlert,
    SubmitButton,
} from "@/app/components/auth/auth-fields";

export function ProfileSettingsForm() {
    const {
        user,
        updateProfile,
        isLoading,
    } = useAuth();

    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [profilePictureUrl, setProfilePictureUrl] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        if (!user) return;

        setDisplayName(user.displayName);
        setBio(user.bio ?? "");
        setProfilePictureUrl(user.profilePictureUrl ?? "");
    }, [user]);

    useEffect(() => {
        setImageFailed(false);
    }, [profilePictureUrl]);

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setMessage(null);
        setError(null);

        const result = profileUpdateSchema.safeParse({
            displayName,
            bio: bio.trim() === "" ? null : bio,
            profilePictureUrl:
                profilePictureUrl.trim() === ""
                    ? null
                    : profilePictureUrl,
        });

        if (!result.success) {
            setError(
                result.error.issues[0]?.message ??
                    "Invalid profile information.",
            );
            return;
        }

        try {
            await updateProfile(result.data);

            setMessage("Your profile has been updated.");
            toast.success("Profile updated", {
                description: "Your changes have been saved.",
            });
        } catch (submitError) {
            const text =
                submitError instanceof Error
                    ? submitError.message
                    : "Unable to update your profile.";

            setError(text);
            toast.error("Couldn’t save your profile", { description: text });
        }
    }

    function resetChanges() {
        if (!user) return;

        setDisplayName(user.displayName);
        setBio(user.bio ?? "");
        setProfilePictureUrl(user.profilePictureUrl ?? "");
        setError(null);
        setMessage(null);
    }

    if (!user) {
        return null;
    }

    const dirty =
        displayName !== user.displayName ||
        bio !== (user.bio ?? "") ||
        profilePictureUrl !== (user.profilePictureUrl ?? "");

    const initials =
        (displayName || user.displayName)
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "M";

    const showImage = profilePictureUrl.trim() !== "" && !imageFailed;

    return (
        <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-6"
        >
            {/* Public profile */}
            <Card
                title="Public profile"
                description="This is how other people see you on Miyor."
            >
                <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#2BA6FF] to-[#0971ED] shadow-[0_8px_20px_-6px_rgba(9,113,237,0.5)] ring-4 ring-white">
                        {showImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={profilePictureUrl}
                                alt=""
                                onError={() => setImageFailed(true)}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-white">
                                {initials}
                            </span>
                        )}
                    </div>

                    <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-[#0C1A2E]">
                            {displayName || user.displayName}
                        </p>
                        <p className="truncate text-sm text-[#0C1A2E]/55">
                            @{user.username}
                        </p>
                    </div>
                </div>

                <AuthField
                    id="displayName"
                    label="Display name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    maxLength={100}
                    autoComplete="name"
                />

                <AuthTextArea
                    id="bio"
                    label="Bio"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    maxLength={500}
                    rows={4}
                    counter={`${bio.length}/500`}
                    placeholder="Tell people a little about yourself."
                />

                <AuthField
                    id="profilePictureUrl"
                    label="Profile picture URL"
                    type="url"
                    value={profilePictureUrl}
                    onChange={(event) => setProfilePictureUrl(event.target.value)}
                    placeholder="https://..."
                    maxLength={500}
                    error={
                        imageFailed && profilePictureUrl.trim() !== ""
                            ? "We couldn’t load an image from this link."
                            : undefined
                    }
                    hint="Paste a link to an image and we’ll preview it above."
                />
            </Card>

            {/* Account */}
            <Card
                title="Account"
                description="These details are managed by Miyor and can’t be edited here."
            >
                <AuthField
                    id="username"
                    label="Username"
                    value={user.username}
                    disabled
                    leading="@"
                    trailing={<LockIcon />}
                    hint="Your username is part of your Miyor identity."
                />

                <AuthField
                    id="miyorNumber"
                    label="Miyor Number"
                    value={user.miyorNumber ?? ""}
                    disabled
                    wideTrailing
                    trailing={
                        user.miyorNumber ? (
                            <CopyButton value={user.miyorNumber} />
                        ) : (
                            <LockIcon />
                        )
                    }
                    hint="Your Miyor Number is assigned when your email is verified."
                />

                <AuthField
                    id="email"
                    label="Email"
                    value={user.email}
                    disabled
                    trailing={<LockIcon />}
                />
            </Card>

            <AnimatePresence initial={false}>
                {error && <FormAlert key="error">{error}</FormAlert>}
                {message && !error && (
                    <FormAlert key="success" variant="success">
                        {message}
                    </FormAlert>
                )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p
                    className="flex items-center gap-2 text-sm text-[#0C1A2E]/55"
                    aria-live="polite"
                >
                    {dirty && (
                        <>
                            <span className="h-2 w-2 rounded-full bg-amber-400" />
                            You have unsaved changes
                        </>
                    )}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {dirty && (
                        <button
                            type="button"
                            onClick={resetChanges}
                            className="h-12 rounded-xl px-5 text-[15px] font-semibold text-[#0C1A2E]/70 transition hover:bg-[#0C1A2E]/5 hover:text-[#0C1A2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0971ED]"
                        >
                            Discard
                        </button>
                    )}

                    <div className="sm:w-44">
                        <SubmitButton
                            loading={isLoading}
                            loadingText="Saving..."
                            disabled={!dirty}
                        >
                            Save changes
                        </SubmitButton>
                    </div>
                </div>
            </div>
        </form>
    );
}

function Card({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-[#0C1A2E]/10 bg-white p-5 shadow-[0_1px_2px_rgba(12,26,46,0.04)] sm:p-7">
            <h2 className="text-lg font-semibold tracking-tight text-[#0C1A2E]">
                {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#0C1A2E]/55">
                {description}
            </p>

            <div className="mt-6 space-y-5">{children}</div>
        </section>
    );
}

function CopyButton({ value }: { value: string }) {
    return (
        <button
            type="button"
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(value);
                    toast.success("Miyor Number copied");
                } catch {
                    toast.error("Couldn’t copy to your clipboard");
                }
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#0971ED] transition hover:bg-[#0971ED]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0971ED]"
        >
            Copy
        </button>
    );
}

function LockIcon() {
    return (
        <span className="flex h-9 w-9 items-center justify-center text-[#0C1A2E]/35">
            <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 018 0v3" />
            </svg>
        </span>
    );
}