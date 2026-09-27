"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    createContact,
    deleteContact,
    getContacts,
    updateContact,
} from "@/app/services/contacts.service";

import type {
    ContactListItem,
    ContactStatus,
} from "@/app/types/users/users.types";
import { ApiRequestError } from "@/app/lib/client";

export function useContacts() {
    const [contacts, setContacts] =
        useState<ContactListItem[]>(
            [],
        );

    const [isLoading, setIsLoading] =
        useState(true);

    const [isMutating, setIsMutating] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    const loadContacts =
        useCallback(async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response =
                    await getContacts();

                setContacts(
                    response.contacts,
                );
            } catch (error) {
                if (
                    error instanceof
                    ApiRequestError
                ) {
                    setError(
                        error.message,
                    );
                } else {
                    setError(
                        "Unable to load your contacts.",
                    );
                }
            } finally {
                setIsLoading(false);
            }
        }, []);

    useEffect(() => {
        void loadContacts();
    }, [loadContacts]);

    const sendRequest =
        useCallback(
            async (userId: string) => {
                setIsMutating(true);
                setError(null);

                try {
                    await createContact({
                        userId,
                    });

                    await loadContacts();
                } catch (error) {
                    if (
                        error instanceof
                        ApiRequestError
                    ) {
                        setError(
                            error.message,
                        );
                    } else {
                        setError(
                            "Unable to send contact request.",
                        );
                    }

                    throw error;
                } finally {
                    setIsMutating(false);
                }
            },
            [loadContacts],
        );

    const changeStatus =
        useCallback(
            async (
                contactId: string,
                status:
                    | "accepted"
                    | "declined"
                    | "blocked",
            ) => {
                setIsMutating(true);
                setError(null);

                try {
                    await updateContact(
                        contactId,
                        {
                            status,
                        },
                    );

                    await loadContacts();
                } catch (error) {
                    if (
                        error instanceof
                        ApiRequestError
                    ) {
                        setError(
                            error.message,
                        );
                    } else {
                        setError(
                            "Unable to update this contact.",
                        );
                    }

                    throw error;
                } finally {
                    setIsMutating(false);
                }
            },
            [loadContacts],
        );

    const remove =
        useCallback(
            async (
                contactId: string,
            ) => {
                setIsMutating(true);
                setError(null);

                try {
                    await deleteContact(
                        contactId,
                    );

                    setContacts(
                        (current) =>
                            current.filter(
                                (
                                    contact,
                                ) =>
                                    contact.id !==
                                    contactId,
                            ),
                    );
                } catch (error) {
                    if (
                        error instanceof
                        ApiRequestError
                    ) {
                        setError(
                            error.message,
                        );
                    } else {
                        setError(
                            "Unable to remove this contact.",
                        );
                    }

                    throw error;
                } finally {
                    setIsMutating(false);
                }
            },
            [],
        );

    const contactsByStatus = (
        status: ContactStatus,
    ) =>
        contacts.filter(
            (contact) =>
                contact.status ===
                status,
        );

    return {
        contacts,
        pendingContacts:
            contactsByStatus(
                "pending",
            ),
        acceptedContacts:
            contactsByStatus(
                "accepted",
            ),
        blockedContacts:
            contactsByStatus(
                "blocked",
            ),
        isLoading,
        isMutating,
        error,
        reload: loadContacts,
        sendRequest,
        changeStatus,
        remove,
    };
}