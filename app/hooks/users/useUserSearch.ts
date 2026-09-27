"use client";

import {
    useEffect,
    useState,
} from "react";

import {
    searchUsers,
} from "@/app/services/users.service";

import type {
    DiscoverableUser,
} from "@/app/types/users/users.types";
import { ApiRequestError } from "@/app/lib/client";

const SEARCH_DEBOUNCE_MS = 350;

export function useUserSearch() {
    const [query, setQuery] =
        useState("");

    const [results, setResults] =
        useState<DiscoverableUser[]>(
            [],
        );

    const [isSearching, setIsSearching] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {
        const normalizedQuery =
            query.trim();

        if (!normalizedQuery) {
            setResults([]);
            setError(null);
            setIsSearching(false);
            return;
        }

        if (normalizedQuery.length < 1) {
            return;
        }

        let cancelled = false;

        const timeout =
            window.setTimeout(
                async () => {
                    setIsSearching(true);
                    setError(null);

                    try {
                        const response =
                            await searchUsers(
                                normalizedQuery,
                            );

                        if (cancelled) {
                            return;
                        }

                        setResults(
                            response.results,
                        );
                    } catch (error) {
                        if (cancelled) {
                            return;
                        }

                        if (
                            error instanceof
                            ApiRequestError
                        ) {
                            setError(
                                error.message,
                            );
                        } else {
                            setError(
                                "Unable to search for users.",
                            );
                        }

                        setResults([]);
                    } finally {
                        if (!cancelled) {
                            setIsSearching(
                                false,
                            );
                        }
                    }
                },
                SEARCH_DEBOUNCE_MS,
            );

        return () => {
            cancelled = true;
            window.clearTimeout(
                timeout,
            );
        };
    }, [query]);

    return {
        query,
        setQuery,
        results,
        isSearching,
        error,
        clearSearch() {
            setQuery("");
            setResults([]);
            setError(null);
        },
    };
}