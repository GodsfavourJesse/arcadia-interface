"use client";

import { useState } from "react";
import Link from "next/link";

import { apiFetch } from "@/app/services/api.service";

type CreateRoomResponse = {
    status: "ok";
    room: {
        id: string;
        roomCode: string;
        status: string;
        createdAt: string;
        invitationExpiresAt: string;
    };
    invitation: {
        url: string;
        expiresAt: string;
    };
};

export default function NewCallPage() {
    const [creating, setCreating] = useState(false);
    const [room, setRoom] =
        useState<CreateRoomResponse | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleCreateCall() {
        if (creating) return;

        setCreating(true);
        setError(null);

        try {
            const response =
                await apiFetch<CreateRoomResponse>(
                    "/rooms",
                    {
                        method: "POST",
                    },
                );

            setRoom(response);
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Unable to create call",
            );
        } finally {
            setCreating(false);
        }
    }

    async function handleCopyLink() {
        if (!room) return;

        try {
            await navigator.clipboard.writeText(
                room.invitation.url,
            );

            setCopied(true);

            window.setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch {
            setError(
                "Unable to copy the invitation link.",
            );
        }
    }

    function handleStartCall() {
        if (!room) return;

        const token =
            room.invitation.url.split("/c/")[1];

        window.location.href =
            `/dashboard/calls/${room.room.id}/lobby?invite=${encodeURIComponent(token)}`;
    }

    return (
        <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
            <div className="mb-8">
                <Link
                    href="/dashboard"
                    className="text-sm font-medium text-slate-500 transition hover:text-slate-950"
                >
                    ← Back to dashboard
                </Link>

                <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
                    Create a call
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                    Create a private Miyor call and share the
                    invitation link with your guest.
                </p>
            </div>

            {!room ? (
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white">
                        +
                    </div>

                    <h2 className="mt-5 text-xl font-semibold text-slate-950">
                        Ready to create your call?
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        Miyor will generate a secure invitation
                        link that you can send to your guest.
                    </p>

                    {error && (
                        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleCreateCall}
                        disabled={creating}
                        className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {creating
                            ? "Creating call..."
                            : "Create Call"}
                    </button>
                </section>
            ) : (
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                        ✓
                    </div>

                    <p className="mt-6 text-sm font-medium text-emerald-600">
                        Call ready
                    </p>

                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                        Your Miyor call is ready.
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        Copy the invitation link and send it to
                        the person you want to call.
                    </p>

                    <div className="mt-7 rounded-2xl bg-slate-50 p-4">
                        <p className="break-all text-sm font-medium text-slate-900">
                            {room.invitation.url}
                        </p>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                        >
                            {copied
                                ? "Copied!"
                                : "Copy invitation link"}
                        </button>

                        <button
                            type="button"
                            onClick={handleStartCall}
                            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Start Call
                        </button>
                    </div>

                    <p className="mt-5 text-xs leading-5 text-slate-400">
                        This invitation expires on{" "}
                        {new Date(
                            room.invitation.expiresAt,
                        ).toLocaleString()}
                        .
                    </p>
                </section>
            )}
        </main>
    );
}