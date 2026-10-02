"use client";

import { createDirectConversation } from "@/app/services/conversation/conversations.service";
import type {
    ContactListItem,
} from "@/app/types/users/users.types";
import { useRouter } from "next/navigation";

type ContactCardProps = {
    contact: ContactListItem;
    onAccept: (
        contactId: string,
    ) => Promise<void>;
    onDecline: (
        contactId: string,
    ) => Promise<void>;
    onBlock: (
        contactId: string,
    ) => Promise<void>;
    onRemove: (
        contactId: string,
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

export function ContactCard({
    contact,
    onAccept,
    onDecline,
    onBlock,
    onRemove,
    disabled = false,
}: ContactCardProps) {
    const { user } = contact;

    const router = useRouter();

    const initial =
        user.displayName
            .charAt(0)
            .toUpperCase() || "M";

    const isIncoming =
        contact.status === "pending" &&
        contact.direction === "incoming";

    const isOutgoing =
        contact.status === "pending" &&
        contact.direction === "outgoing";

    const isAccepted =
        contact.status === "accepted";

    const isBlocked =
        contact.status === "blocked";

    async function handleMessage() {
        try {
            const response =
                await createDirectConversation(
                    contact.user.id,
                );

            if (!response.conversation?.id) {
                throw new Error(
                    "Conversation ID was not returned.",
                );
            }

            router.push(
                `/dashboard/conversations/${response.conversation.id}`,
            );
        } catch (error) {
            console.error(
                "Unable to start conversation:",
                error,
            );
        }
    }

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
                {user.profilePictureUrl ? (
                    <img
                        src={user.profilePictureUrl}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                        {initial}
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">
                                {user.displayName}
                            </p>

                            <p className="truncate text-sm text-slate-500">
                                @{user.username}
                            </p>
                        </div>

                        <StatusBadge
                            status={contact.status}
                            direction={
                                contact.direction
                            }
                        />
                    </div>

                    {user.miyorNumber && (
                        <p className="mt-2 text-xs text-slate-400">
                            Miyor #{" "}
                            {formatMiyorNumber(
                                user.miyorNumber,
                            )}
                        </p>
                    )}
                </div>
            </div>

            {/* Incoming contact request */}
            {isIncoming && (
                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                            onAccept(
                                contact.id,
                            )
                        }
                        className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                        Accept
                    </button>

                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                            onDecline(
                                contact.id,
                            )
                        }
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Decline
                    </button>

                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                            onBlock(
                                contact.id,
                            )
                        }
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                        Block
                    </button>
                </div>
            )}

            {/* Outgoing contact request */}
            {isOutgoing && (
                <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">
                        Contact request sent.
                    </p>

                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                            onRemove(
                                contact.id,
                            )
                        }
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Accepted contact */}
            {isAccepted && (
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={handleMessage}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                        Message
                    </button>

                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                            onRemove(
                                contact.id,
                            )
                        }
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Remove
                    </button>
                </div>
            )}

            {/* Blocked contact */}
            {isBlocked && (
                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                            onRemove(
                                contact.id,
                            )
                        }
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Remove
                    </button>
                </div>
            )}
        </article>
    );
}

function StatusBadge({
    status,
    direction,
}: {
    status: ContactListItem["status"];
    direction: ContactListItem["direction"];
}) {
    let label: string = status;

    if (
        status === "pending" &&
        direction === "incoming"
    ) {
        label = "Incoming";
    }

    if (
        status === "pending" &&
        direction === "outgoing"
    ) {
        label = "Pending";
    }

    return (
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
            {label}
        </span>
    );
}