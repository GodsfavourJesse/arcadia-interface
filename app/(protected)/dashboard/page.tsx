"use client";

import { useEffect, useState } from "react";

import { AccountStatusCard } from "@/app/components/dashboard/account-status-card";
import { EmptyCalls } from "@/app/components/dashboard/empty-calls";
import { StatCard } from "@/app/components/dashboard/stat-card";
import { WelcomeCard } from "@/app/components/dashboard/welcome-card";
import { WelcomeModal } from "@/app/components/dashboard/welcome-modal";

export default function DashboardPage() {
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(
            window.location.search,
        );

        const shouldShowWelcome =
            params.get("welcome") === "1";

        if (!shouldShowWelcome) {
            return;
        }

        // Open the modal.
        setShowWelcome(true);

        // Remove ?welcome=1 from the address bar without
        // causing another page navigation.
        const cleanUrl =
            window.location.pathname +
            window.location.hash;

        window.history.replaceState(
            {},
            document.title,
            cleanUrl,
        );
    }, []);

    function handleCloseWelcome() {
        setShowWelcome(false);
    }

    return (
        <>
            <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
                <WelcomeCard />

                <section className="mt-8 grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Total calls"
                        value="0"
                        description="Calls you've hosted"
                    />

                    <StatCard
                        label="Upcoming"
                        value="0"
                        description="Scheduled calls"
                    />

                    <AccountStatusCard />
                </section>

                <section className="mt-10">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                                Recent calls
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Your latest conversations will
                                appear here.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="hidden text-sm font-medium text-slate-500 transition hover:text-slate-950 sm:block"
                        >
                            View all
                        </button>
                    </div>

                    <EmptyCalls />
                </section>
            </main>

            <WelcomeModal
                open={showWelcome}
                onClose={handleCloseWelcome}
            />
        </>
    );
}