"use client";

import Image from "next/image";
import type { AvatarDefinition } from "@/app/types/avatar/avatar.types";

type AvatarCardProps = {
    avatar: AvatarDefinition;
    selected?: boolean;
    disabled?: boolean;
    onSelect: (avatar: AvatarDefinition) => void;
};

export function AvatarCard({
    avatar,
    selected = false,
    disabled = false,
    onSelect,
}: AvatarCardProps) {
    const isDisabled =
        disabled || !avatar.enabled;

    return (
        <button
            type="button"
            disabled={isDisabled}
            aria-pressed={selected}
            aria-label={`Select ${avatar.name} avatar`}
            onClick={() => onSelect(avatar)}
            className={[
                "group relative aspect-square w-full overflow-hidden rounded-2xl",
                "border bg-white/[0.03] text-left",
                "transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                selected
                    ? "border-white/80 ring-2 ring-white/20"
                    : "border-white/10 hover:border-white/25 hover:bg-white/[0.06]",
                isDisabled
                    ? "cursor-not-allowed opacity-45"
                    : "cursor-pointer",
            ].join(" ")}
        >
            <Image
                src={avatar.thumbnailUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 30vw, 160px"
                className={[
                    "object-cover transition-transform duration-300",
                    !isDisabled
                        ? "group-hover:scale-105"
                        : "",
                ].join(" ")}
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="truncate text-sm font-medium text-white">
                    {avatar.name}
                </p>

                <p className="mt-0.5 text-[11px] capitalize text-white/55">
                    {avatar.renderMode}
                </p>
            </div>

            {selected && (
                <div
                    className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/30 bg-white text-black shadow-lg"
                    aria-hidden="true"
                >
                    <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-3.5 w-3.5"
                    >
                        <path
                            d="m5 10 3 3 7-7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            )}

            {!avatar.enabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                    <span className="rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/70 backdrop-blur">
                        Unavailable
                    </span>
                </div>
            )}
        </button>
    );
}