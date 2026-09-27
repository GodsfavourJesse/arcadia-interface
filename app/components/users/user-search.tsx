"use client";

import {
    UserSearchResult,
} from "./user-search-result";

import {
    useUserSearch,
} from "@/app/hooks/users/useUserSearch";

type UserSearchProps = {
    onAdd: (
        userId: string,
    ) => Promise<void>;
    disabled?: boolean;
};

export function UserSearch({
    onAdd,
    disabled = false,
}: UserSearchProps) {
    const {
        query,
        setQuery,
        results,
        isSearching,
        error,
    } = useUserSearch();

    return (
        <section>
            <div className="relative">
                <svg
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                >
                    <circle
                        cx="11"
                        cy="11"
                        r="7"
                    />
                    <path d="m20 20-4-4" />
                </svg>

                <input
                    type="search"
                    value={query}
                    onChange={(event) =>
                        setQuery(
                            event.target.value,
                        )
                    }
                    placeholder="Search by name, username or Miyor number"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />

                {isSearching && (
                    <span className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
                )}
            </div>

            {error && (
                <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </p>
            )}

            {query.trim() &&
                !isSearching &&
                !error &&
                results.length === 0 && (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center">
                        <p className="font-medium text-slate-900">
                            No users found
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            Try a different name,
                            username or Miyor
                            number.
                        </p>
                    </div>
                )}

            {results.length > 0 && (
                <div className="mt-4 space-y-3">
                    {results.map(
                        (user) => (
                            <UserSearchResult
                                key={user.id}
                                user={user}
                                onAdd={onAdd}
                                disabled={
                                    disabled
                                }
                            />
                        ),
                    )}
                </div>
            )}
        </section>
    );
}