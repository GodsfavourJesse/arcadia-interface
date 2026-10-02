import { apiRequest } from "../../lib/client";
import type {
    ContactResponse,
    ContactsResponse,
    CreateContactInput,
    UpdateContactInput,
} from "../../types/users/users.types";

export async function getContacts(
    status?: string,
) {
    const params = new URLSearchParams();

    if (status) {
        params.set("status", status);
    }

    const query =
        params.toString();

    return apiRequest<ContactsResponse>(
        `/contacts${query ? `?${query}` : ""}`,
        {
            method: "GET",
        },
    );
}

export async function createContact(
    input: CreateContactInput,
) {
    return apiRequest<ContactResponse>(
        "/contacts",
        {
            method: "POST",
            body: JSON.stringify(input),
        },
    );
}

export async function updateContact(
    contactId: string,
    input: UpdateContactInput,
) {
    return apiRequest<ContactResponse>(
        `/contacts/${contactId}`,
        {
            method: "PATCH",
            body: JSON.stringify(input),
        },
    );
}

export async function deleteContact(
    contactId: string,
) {
    return apiRequest<{
        status: "ok";
    }>(`/contacts/${contactId}`, {
        method: "DELETE",
    });
}