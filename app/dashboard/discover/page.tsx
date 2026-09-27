"use client";

import Link from "next/link";
import {
    useState,
    type ReactNode,
} from "react";

import {
    UserSearch,
} from "@/app/components/users/user-search";

import {
    ContactList,
} from "@/app/components/contacts/contact-list";

import {
    useContacts,
} from "@/app/hooks/contacts/useContacts";

type ActiveTab =
    | "all"
    | "pending"
    | "contacts"
    | "blocked";

export default function DiscoverPage() {
    const {
        contacts,
        pendingContacts,
        acceptedContacts,
        blockedContacts,
        isLoading,
        isMutating,
        error,
        sendRequest,
        changeStatus,
        remove,
    } = useContacts();

    const [
        activeTab,
        setActiveTab,
    ] = useState<ActiveTab>("all");

    const visibleContacts =
        activeTab === "pending"
            ? pendingContacts
            : activeTab === "contacts"
              ? acceptedContacts
              : activeTab === "blocked"
                ? blockedContacts
                : contacts;

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
                {/* Header */}
                <header className="mb-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-slate-950"
                    >
                        <svg
                            className="mr-2 h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                        >
                            <path
                                d="M19 12H5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="m12 19-7-7 7-7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>

                        Dashboard
                    </Link>

                    <div className="mt-5">
                        <p className="text-sm font-medium text-slate-500">
                            Miyor
                        </p>

                        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                            Discover people
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Find people on Miyor by
                            their name, username, or
                            Miyor number and connect
                            with them.
                        </p>
                    </div>
                </header>

                {/* Search */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <div className="mb-5">
                        <h2 className="text-lg font-semibold text-slate-950">
                            Find someone
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Search Miyor users to send
                            a contact request.
                        </p>
                    </div>

                    <UserSearch
                        onAdd={sendRequest}
                        disabled={isMutating}
                    />
                </section>

                {/* Contacts */}
                <section className="mt-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-950">
                                Your connections
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Manage your Miyor
                                contact requests and
                                connections.
                            </p>
                        </div>

                        {/* Tabs */}
                        <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                            <TabButton
                                active={
                                    activeTab ===
                                    "all"
                                }
                                onClick={() =>
                                    setActiveTab(
                                        "all",
                                    )
                                }
                            >
                                All
                                <TabCount
                                    value={
                                        contacts.length
                                    }
                                />
                            </TabButton>

                            <TabButton
                                active={
                                    activeTab ===
                                    "pending"
                                }
                                onClick={() =>
                                    setActiveTab(
                                        "pending",
                                    )
                                }
                            >
                                Pending
                                <TabCount
                                    value={
                                        pendingContacts.length
                                    }
                                />
                            </TabButton>

                            <TabButton
                                active={
                                    activeTab ===
                                    "contacts"
                                }
                                onClick={() =>
                                    setActiveTab(
                                        "contacts",
                                    )
                                }
                            >
                                Contacts
                                <TabCount
                                    value={
                                        acceptedContacts.length
                                    }
                                />
                            </TabButton>

                            <TabButton
                                active={
                                    activeTab ===
                                    "blocked"
                                }
                                onClick={() =>
                                    setActiveTab(
                                        "blocked",
                                    )
                                }
                            >
                                Blocked
                                <TabCount
                                    value={
                                        blockedContacts.length
                                    }
                                />
                            </TabButton>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div
                            className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    {/* Loading */}
                    {isLoading ? (
                        <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
                            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

                            <p className="mt-3 text-sm text-slate-500">
                                Loading your
                                connections...
                            </p>
                        </div>
                    ) : (
                        <div className="mt-5">
                            <ContactList
                                contacts={
                                    visibleContacts
                                }
                                onAccept={(
                                    contactId,
                                ) =>
                                    changeStatus(
                                        contactId,
                                        "accepted",
                                    )
                                }
                                onDecline={(
                                    contactId,
                                ) =>
                                    changeStatus(
                                        contactId,
                                        "declined",
                                    )
                                }
                                onBlock={(
                                    contactId,
                                ) =>
                                    changeStatus(
                                        contactId,
                                        "blocked",
                                    )
                                }
                                onRemove={
                                    remove
                                }
                                disabled={
                                    isMutating
                                }
                            />
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                active
                    ? "whitespace-nowrap rounded-xl bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white"
                    : "whitespace-nowrap rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            }
        >
            {children}
        </button>
    );
}

function TabCount({
    value,
}: {
    value: number;
}) {
    return (
        <span
            className={
                value > 0
                    ? "ml-1.5 rounded-full bg-white/15 px-1.5 py-0.5 text-xs"
                    : "ml-1.5 text-xs opacity-60"
            }
        >
            {value}
        </span>
    );
}