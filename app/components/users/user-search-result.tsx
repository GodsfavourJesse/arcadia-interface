"use client";

import {
    useState,
} from "react";

import type {
    DiscoverableUser,
} from "@/app/types/users/users.types";

type UserSearchResultProps = {
    user: DiscoverableUser;
    onAdd: (
        userId: string,
    ) => Promise<void>;
    disabled?: boolean;
};

function formatMiyorNumber(
    value: string | null,
) {
    if (!value) {
        return null;
    }

    if (value.length !== 9) {
        return value;
    }

    return `${value.slice(0, 3)} ${value.slice(
        3,
        6,
    )} ${value.slice(6)}`;
}

export function UserSearchResult({
    user,
    onAdd,
    disabled = false,
}: UserSearchResultProps) {
    const [
        isAdding,
        setIsAdding,
    ] = useState(false);

    const [
        added,
        setAdded,
    ] = useState(false);

    async function handleAdd() {
        if (
            disabled ||
            isAdding ||
            added
        ) {
            return;
        }

        setIsAdding(true);

        try {
            await onAdd(user.id);
            setAdded(true);
        } finally {
            setIsAdding(false);
        }
    }

    const initial =
        user.displayName
            .charAt(0)
            .toUpperCase() || "M";

    return (
        <article className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 items-center gap-3">
                {user.profilePictureUrl ? (
                    <img
                        src={
                            user.profilePictureUrl
                        }
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                        {initial}
                    </div>
                )}

                <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">
                        {user.displayName}
                    </p>

                    <p className="truncate text-sm text-slate-500">
                        @{user.username}
                    </p>

                    {user.miyorNumber && (
                        <p className="mt-0.5 text-xs text-slate-400">
                            Miyor #
                            {" "}
                            {formatMiyorNumber(
                                user.miyorNumber,
                            )}
                        </p>
                    )}
                </div>
            </div>

            <button
                type="button"
                onClick={handleAdd}
                disabled={
                    disabled ||
                    isAdding ||
                    added
                }
                className="shrink-0 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
                {isAdding
                    ? "Sending..."
                    : added
                      ? "Request sent"
                      : "Add"}
            </button>
        </article>
    );
}