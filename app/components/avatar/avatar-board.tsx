"use client";

import type {
    AvatarDefinition,
} from "@/app/types/avatar/avatar.types";

import { AvatarCard } from "./avatar-card";

type AvatarBoardProps = {
    avatars: readonly AvatarDefinition[];
    selectedAvatarId?: string | null;
    onAvatarChange: (
        avatar: AvatarDefinition,
    ) => void;
    className?: string;
};

export function AvatarBoard({
    avatars,
    selectedAvatarId = null,
    onAvatarChange,
    className = "",
}: AvatarBoardProps) {
    return (
        <section
            aria-label="Avatar selection"
            className={[
                "w-full",
                className,
            ].join(" ")}
        >
            <div className="mb-4">
                <h2 className="text-base font-semibold text-white">
                    Choose your avatar
                </h2>

                <p className="mt-1 text-sm text-white/50">
                    Select an avatar to use during your video call.
                </p>
            </div>

            {avatars.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center">
                    <p className="text-sm text-white/60">
                        No avatars are currently available.
                    </p>
                </div>
            ) : (
                <div
                    className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                    role="listbox"
                    aria-label="Available avatars"
                >
                    {avatars.map((avatar) => (
                        <AvatarCard
                            key={avatar.id}
                            avatar={avatar}
                            selected={
                                selectedAvatarId ===
                                avatar.id
                            }
                            onSelect={onAvatarChange}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}