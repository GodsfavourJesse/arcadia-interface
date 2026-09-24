export type User = {
    id: string;
    name: string;
    email: string;
    emailVerifiedAt: string | null;
    status: string;
    createdAt: string;
    updatedAt?: string;
};

export type AuthResponse = {
    status: "ok";
    user: User;
};
