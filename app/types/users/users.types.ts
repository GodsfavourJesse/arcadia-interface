export type DiscoverableUser = {
    id: string;
    displayName: string;
    username: string;
    miyorNumber: string | null;
    profilePictureUrl: string | null;
    bio: string | null;
};

export type UserSearchResponse = {
    status: "ok";
    results: DiscoverableUser[];
};

export type ContactStatus =
    | "pending"
    | "accepted"
    | "declined"
    | "blocked";

export type ContactDirection =
    | "incoming"
    | "outgoing"
    | null;

export type ContactUser = {
    id: string;
    displayName: string;
    username: string;
    miyorNumber: string | null;
    profilePictureUrl: string | null;
    bio: string | null;
};

export type ContactListItem = {
    id: string;
    requesterId: string;
    addresseeId: string;
    status: ContactStatus;
    direction: ContactDirection;
    createdAt: string;
    updatedAt: string;
    user: ContactUser;
};

export type ContactsResponse = {
    status: "ok";
    contacts: ContactListItem[];
};

export type ContactResponse = {
    status: "ok";
    contact: {
        id: string;
        requesterId: string;
        addresseeId: string;
        userLowId?: string;
        userHighId?: string;
        status: ContactStatus;
        createdAt: string;
        updatedAt: string;
    };
};

export type CreateContactInput = {
    userId: string;
};

export type UpdateContactInput = {
    status:
        | "accepted"
        | "declined"
        | "blocked";
};