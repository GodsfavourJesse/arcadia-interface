"use client";

import { useAuth } from "@/app/hooks/auth/useAuth";
import { profileUpdateSchema } from "@/app/schemas/auth.schemas";
import { useEffect, useState } from "react";

export function ProfileSettingsForm() {
    const {
        user,
        updateProfile,
        isLoading,
    } = useAuth();

    const [displayName, setDisplayName] =
        useState("");

    const [bio, setBio] = useState("");

    const [profilePictureUrl, setProfilePictureUrl] =
        useState("");

    const [message, setMessage] =
        useState<string | null>(null);

    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        setDisplayName(user.displayName);
        setBio(user.bio ?? "");
        setProfilePictureUrl(
            user.profilePictureUrl ?? "",
        );
    }, [user]);

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
            setError(result.error.issues[0]?.message ?? "Invalid profile information.");
            return;
        }

        try {
            await updateProfile(result.data);

            setMessage("Your profile has been updated.");
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "Unable to update your profile.",
            );
        }
    }

    if (!user) {
        return null;
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-6"
        >
            <div className="space-y-2">
                <label
                    htmlFor="displayName"
                    className="text-sm font-medium"
                >
                    Display name
                </label>

                <input
                    id="displayName"
                    value={displayName}
                    onChange={(event) =>
                        setDisplayName(event.target.value)
                    }
                    maxLength={100}
                    className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
                />
            </div>

            <div className="space-y-2">
                <label
                    htmlFor="username"
                    className="text-sm font-medium"
                >
                    Username
                </label>

                <input
                    id="username"
                    value={user.username}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border px-4 py-3 opacity-60"
                />

                <p className="text-xs text-muted-foreground">
                    Your username is part of your Miyor identity.
                </p>
            </div>

            <div className="space-y-2">
                <label
                    htmlFor="miyorNumber"
                    className="text-sm font-medium"
                >
                    Miyor Number
                </label>

                <input
                    id="miyorNumber"
                    value={user.miyorNumber ?? ""}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border px-4 py-3 opacity-60"
                />

                <p className="text-xs text-muted-foreground">
                    Your Miyor Number is assigned when your email
                    is verified.
                </p>
            </div>

            <div className="space-y-2">
                <label
                    htmlFor="email"
                    className="text-sm font-medium"
                >
                    Email
                </label>

                <input
                    id="email"
                    value={user.email}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border px-4 py-3 opacity-60"
                />
            </div>

            <div className="space-y-2">
                <label
                    htmlFor="bio"
                    className="text-sm font-medium"
                >
                    Bio
                </label>

                <textarea
                    id="bio"
                    value={bio}
                    onChange={(event) =>
                        setBio(event.target.value)
                    }
                    maxLength={500}
                    rows={4}
                    placeholder="Tell people a little about yourself."
                    className="w-full resize-none rounded-lg border px-4 py-3 outline-none focus:ring-2"
                />

                <p className="text-right text-xs text-muted-foreground">
                    {bio.length}/500
                </p>
            </div>

            <div className="space-y-2">
                <label
                    htmlFor="profilePictureUrl"
                    className="text-sm font-medium"
                >
                    Profile picture URL
                </label>

                <input
                    id="profilePictureUrl"
                    type="url"
                    value={profilePictureUrl}
                    onChange={(event) =>
                        setProfilePictureUrl(
                            event.target.value,
                        )
                    }
                    placeholder="https://..."
                    maxLength={500}
                    className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
                />
            </div>

            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                    {error}
                </div>
            )}

            {message && (
                <div
                    role="status"
                    className="rounded-lg border px-4 py-3 text-sm"
                >
                    {message}
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg px-4 py-3 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isLoading
                    ? "Saving..."
                    : "Save changes"}
            </button>
        </form>
    );
}