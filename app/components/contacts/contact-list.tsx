"use client";

import {
    ContactCard,
} from "./contact-card";

import type {
    ContactListItem,
} from "@/app/types/users/users.types";

type ContactListProps = {
    contacts: ContactListItem[];
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

export function ContactList({
    contacts,
    onAccept,
    onDecline,
    onBlock,
    onRemove,
    disabled = false,
}: ContactListProps) {
    if (contacts.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center">
                <p className="font-medium text-slate-900">
                    No contacts here yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                    Search for someone above
                    to connect with them.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {contacts.map(
                (contact) => (
                    <ContactCard
                        key={
                            contact.id
                        }
                        contact={
                            contact
                        }
                        onAccept={
                            onAccept
                        }
                        onDecline={
                            onDecline
                        }
                        onBlock={
                            onBlock
                        }
                        onRemove={
                            onRemove
                        }
                        disabled={
                            disabled
                        }
                    />
                ),
            )}
        </div>
    );
}