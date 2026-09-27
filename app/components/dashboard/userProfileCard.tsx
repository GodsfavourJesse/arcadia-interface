import { User } from "@/app/types/auth/auth.types";

type UserProfileCardProps = {
    user: User;
};

export function UserProfileCard({
    user,
}: UserProfileCardProps) {
    return (
        <section className="rounded-xl border p-6">
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border">
                    {user.profilePictureUrl ? (
                        <img
                            src={user.profilePictureUrl}
                            alt={user.displayName}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <span className="text-lg font-semibold">
                            {user.displayName
                                .charAt(0)
                                .toUpperCase()}
                        </span>
                    )}
                </div>

                <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">
                        {user.displayName}
                    </h2>

                    <p className="truncate text-sm text-muted-foreground">
                        @{user.username}
                    </p>
                </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Miyor Number
                    </p>

                    <p className="mt-1 font-medium">
                        {user.miyorNumber ?? "Not assigned"}
                    </p>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Email
                    </p>

                    <p className="mt-1 truncate font-medium">
                        {user.email}
                    </p>
                </div>
            </div>

            {user.bio && (
                <div className="mt-4 rounded-lg border p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Bio
                    </p>

                    <p className="mt-1 text-sm">
                        {user.bio}
                    </p>
                </div>
            )}
        </section>
    );
}